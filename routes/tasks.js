// File: routes/tasks.js
// Common task route handlers

const express = require('express');
const { param } = require('express-validator');
const logger = require('../utils/logger');
const taskCache = require('../middleware/cache');
const {
    handleValidationErrors,
    taskValidationRules,
    taskUpdateValidationRules,
    dateQueryValidationRules,
    reorderValidationRules,
    archiveValidationRules,
    unarchiveValidationRules
} = require('../middleware/security');

/**
 * Create task routes
 * @param {Object} dbAdapter - Database adapter instance
 * @param {Object} authAdapter - Authentication adapter instance
 * @param {Object} rateLimiters - Rate limiting middlewares
 * @returns {Object} Express router
 */
function createTaskRoutes(dbAdapter, authAdapter, rateLimiters) {
    const router = express.Router();
    const requireAuth = authAdapter.requireAuth();

    // Get tasks for a specific date
    router.get('/', dateQueryValidationRules(), handleValidationErrors, requireAuth, async (req, res) => {
        try {
            const { date, includeArchived } = req.query;
            const userId = req.user.id;
            const includeArchivedBool = includeArchived === 'true';
            
            // Try cache first
            const cachedTasks = taskCache.get(userId, date, includeArchivedBool);
            if (cachedTasks) {
                logger.debug('Serving tasks from cache', { userId, date, count: cachedTasks.length });
                return res.json(cachedTasks);
            }
            
            // Fetch from database
            const result = await dbAdapter.getTasks(userId, date, includeArchivedBool);
            
            if (result.error) {
                logger.error('Database error:', result.error);
                return res.status(500).json({ error: 'Failed to fetch tasks' });
            }
            
            // Cache the results
            taskCache.set(userId, date, result.data, includeArchivedBool);
            logger.debug('Tasks fetched and cached', { userId, date, count: result.data.length });
            
            res.json(result.data);
        } catch (error) {
            logger.error('Error fetching tasks:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Create a new task
    router.post('/', taskValidationRules(), handleValidationErrors, requireAuth, async (req, res) => {
        try {
            const { date, text, emoji, time, priority, tags, completed, position } = req.body;
            
            const taskData = {
                date, text, emoji, time, priority, tags, completed, position
            };
            
            const result = await dbAdapter.createTask(req.user.id, taskData);
            
            if (result.error) {
                logger.error('Database error:', result.error);
                return res.status(500).json({ error: 'Failed to create task' });
            }
            
            // Invalidate cache for this user and date
            taskCache.invalidateUser(req.user.id, date);
            
            res.json(result.data);
        } catch (error) {
            logger.error('Error creating task:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Reorder tasks (must come before /:id routes)
    router.put('/reorder', reorderValidationRules(), handleValidationErrors, requireAuth, async (req, res) => {
        try {
            const { taskOrders } = req.body;
            logger.log('Reorder request received:', { taskOrders, userId: req.user.id });
            
            if (!Array.isArray(taskOrders) || taskOrders.length === 0) {
                logger.log('Invalid taskOrders:', taskOrders);
                return res.status(400).json({ error: 'Task orders array is required' });
            }
            
            const result = await dbAdapter.reorderTasks(req.user.id, taskOrders);
            
            if (result.error) {
                logger.error('Reorder errors:', result.error);
                
                if (result.error.needsMigration) {
                    return res.status(500).json({ 
                        error: result.error.message,
                        needsMigration: true 
                    });
                }
                
                return res.status(500).json({ 
                    error: 'Failed to reorder some tasks', 
                    details: result.error.message 
                });
            }
            
            res.json({ success: true, updatedCount: result.data.updatedCount });
        } catch (error) {
            logger.error('Error reordering tasks:', error);
            res.status(500).json({ error: 'Internal server error', details: error.message });
        }
    });

    // Update a task
    router.put('/:id', taskUpdateValidationRules(), handleValidationErrors, requireAuth, async (req, res) => {
        try {
            const { id } = req.params;
            const { text, time, priority, tags, completed, position } = req.body;
            
            const updateData = { text, time, priority, tags, completed, position };
            
            const result = await dbAdapter.updateTask(req.user.id, id, updateData);
            
            if (result.error) {
                logger.error('Database error:', result.error);
                return res.status(500).json({ error: 'Failed to update task' });
            }
            
            if (result.data.affectedRows === 0) {
                return res.status(404).json({ error: 'Task not found or not authorized' });
            }
            
            // Invalidate cache for this user (all dates since we don't know which date the task belongs to)
            taskCache.invalidateUser(req.user.id);
            
            res.json({ success: true });
        } catch (error) {
            logger.error('Error updating task:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Delete a task
    router.delete('/:id', [param('id').isInt({ min: 1 }).withMessage('Task ID must be a positive integer')], handleValidationErrors, requireAuth, async (req, res) => {
        try {
            const { id } = req.params;
            
            const result = await dbAdapter.deleteTask(req.user.id, id);
            
            if (result.error) {
                logger.error('Database error:', result.error);
                return res.status(500).json({ error: 'Failed to delete task' });
            }
            
            if (result.data.affectedRows === 0) {
                return res.status(404).json({ error: 'Task not found or not authorized' });
            }
            
            // Invalidate cache for this user
            taskCache.invalidateUser(req.user.id);
            
            res.json({ success: true });
        } catch (error) {
            logger.error('Error deleting task:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Clear all tasks for the user
    router.delete('/', requireAuth, async (req, res) => {
        try {
            const result = await dbAdapter.clearAllTasks(req.user.id);
            
            if (result.error) {
                logger.error('Database error:', result.error);
                return res.status(500).json({ error: 'Failed to clear tasks' });
            }
            
            // Clear all cache for this user
            taskCache.invalidateUser(req.user.id);
            
            res.json({ success: true });
        } catch (error) {
            logger.error('Error clearing tasks:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Archive tasks for a specific date
    router.post('/archive', archiveValidationRules(), handleValidationErrors, requireAuth, async (req, res) => {
        try {
            const { date } = req.body;
            
            if (!date) {
                return res.status(400).json({ error: 'Date is required' });
            }
            
            const result = await dbAdapter.archiveTasks(req.user.id, date);
            
            if (result.error) {
                logger.error('Database error:', result.error);
                return res.status(500).json({ error: 'Failed to archive tasks' });
            }
            
            res.json({ 
                success: true, 
                archivedCount: result.data.affectedRows,
                message: `${result.data.affectedRows} completed tasks archived for ${date}`
            });
        } catch (error) {
            logger.error('Error archiving tasks:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Unarchive tasks (restore from archive)
    router.post('/unarchive', unarchiveValidationRules(), handleValidationErrors, requireAuth, async (req, res) => {
        try {
            const { taskIds } = req.body;
            
            if (!Array.isArray(taskIds) || taskIds.length === 0) {
                return res.status(400).json({ error: 'Task IDs array is required' });
            }
            
            const result = await dbAdapter.unarchiveTasks(req.user.id, taskIds);
            
            if (result.error) {
                logger.error('Database error:', result.error);
                return res.status(500).json({ error: 'Failed to unarchive tasks' });
            }
            
            res.json({ 
                success: true, 
                unarchivedCount: result.data.affectedRows,
                message: `${result.data.affectedRows} tasks restored from archive`
            });
        } catch (error) {
            logger.error('Error unarchiving tasks:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
}

module.exports = { createTaskRoutes };