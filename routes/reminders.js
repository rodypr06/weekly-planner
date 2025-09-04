// Routes for reminder management
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

function createReminderRoutes(dbAdapter, authAdapter) {
    // Middleware to verify authentication
    const requireAuth = async (req, res, next) => {
        try {
            const user = await authAdapter.verifyToken(req);
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            req.user = user;
            next();
        } catch (error) {
            logger.error('Auth verification failed:', error);
            res.status(401).json({ error: 'Unauthorized' });
        }
    };

    // GET /api/reminders - Get all reminders for current user
    router.get('/', requireAuth, async (req, res) => {
        try {
            const userId = req.user.id;
            const reminders = await dbAdapter.query(
                `SELECT r.*, t.text as task_text, t.emoji as task_emoji, t.time as task_time, t.date as task_date
                 FROM reminders r
                 JOIN tasks t ON r.task_id = t.id
                 WHERE r.user_id = $1 AND r.enabled = true
                 ORDER BY r.reminder_time`,
                [userId]
            );
            
            res.json(reminders.rows || reminders);
        } catch (error) {
            logger.error('Failed to get reminders:', error);
            res.status(500).json({ error: 'Failed to retrieve reminders' });
        }
    });

    // GET /api/reminders/pending - Get pending reminders (for sync)
    router.get('/pending', requireAuth, async (req, res) => {
        try {
            const userId = req.user.id;
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            
            const reminders = await dbAdapter.query(
                `SELECT r.*, t.text as task_text, t.emoji as task_emoji, t.time as task_time
                 FROM reminders r
                 JOIN tasks t ON r.task_id = t.id
                 WHERE r.user_id = $1 
                 AND r.enabled = true 
                 AND r.notification_sent = false
                 AND r.reminder_time BETWEEN $2 AND $3
                 AND t.completed = false
                 ORDER BY r.reminder_time`,
                [userId, now.toISOString(), tomorrow.toISOString()]
            );
            
            res.json(reminders.rows || reminders);
        } catch (error) {
            logger.error('Failed to get pending reminders:', error);
            res.status(500).json({ error: 'Failed to retrieve pending reminders' });
        }
    });

    // POST /api/reminders - Create a new reminder
    router.post('/', requireAuth, async (req, res) => {
        try {
            const userId = req.user.id;
            const { taskId, reminderTime, reminderMinutes } = req.body;
            
            // Validate input
            if (!taskId || !reminderTime) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            
            // Verify task belongs to user
            const taskCheck = await dbAdapter.query(
                'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
                [taskId, userId]
            );
            
            if (!taskCheck.rows || taskCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Task not found' });
            }
            
            // Check if reminder already exists
            const existingReminder = await dbAdapter.query(
                'SELECT id FROM reminders WHERE task_id = $1 AND user_id = $2',
                [taskId, userId]
            );
            
            let reminder;
            if (existingReminder.rows && existingReminder.rows.length > 0) {
                // Update existing reminder
                reminder = await dbAdapter.query(
                    `UPDATE reminders 
                     SET reminder_time = $1, enabled = true, notification_sent = false, updated_at = NOW()
                     WHERE task_id = $2 AND user_id = $3
                     RETURNING *`,
                    [reminderTime, taskId, userId]
                );
            } else {
                // Create new reminder
                reminder = await dbAdapter.query(
                    `INSERT INTO reminders (task_id, user_id, reminder_time, enabled)
                     VALUES ($1, $2, $3, true)
                     RETURNING *`,
                    [taskId, userId, reminderTime]
                );
            }
            
            // Also update task with reminder settings
            await dbAdapter.query(
                `UPDATE tasks 
                 SET reminder_minutes = $1, reminder_enabled = true
                 WHERE id = $2 AND user_id = $3`,
                [reminderMinutes || 15, taskId, userId]
            );
            
            res.status(201).json(reminder.rows[0]);
        } catch (error) {
            logger.error('Failed to create reminder:', error);
            res.status(500).json({ error: 'Failed to create reminder' });
        }
    });

    // PUT /api/reminders/:taskId - Update a reminder
    router.put('/:taskId', requireAuth, async (req, res) => {
        try {
            const userId = req.user.id;
            const taskId = req.params.taskId;
            const { reminderTime, enabled } = req.body;
            
            const result = await dbAdapter.query(
                `UPDATE reminders 
                 SET reminder_time = COALESCE($1, reminder_time), 
                     enabled = COALESCE($2, enabled),
                     notification_sent = false,
                     updated_at = NOW()
                 WHERE task_id = $3 AND user_id = $4
                 RETURNING *`,
                [reminderTime, enabled, taskId, userId]
            );
            
            if (!result.rows || result.rows.length === 0) {
                return res.status(404).json({ error: 'Reminder not found' });
            }
            
            res.json(result.rows[0]);
        } catch (error) {
            logger.error('Failed to update reminder:', error);
            res.status(500).json({ error: 'Failed to update reminder' });
        }
    });

    // DELETE /api/reminders/:taskId - Delete/disable a reminder
    router.delete('/:taskId', requireAuth, async (req, res) => {
        try {
            const userId = req.user.id;
            const taskId = req.params.taskId;
            
            // Disable the reminder instead of deleting
            await dbAdapter.query(
                `UPDATE reminders 
                 SET enabled = false, updated_at = NOW()
                 WHERE task_id = $1 AND user_id = $2`,
                [taskId, userId]
            );
            
            // Update task to remove reminder settings
            await dbAdapter.query(
                `UPDATE tasks 
                 SET reminder_enabled = false, reminder_minutes = NULL
                 WHERE id = $1 AND user_id = $2`,
                [taskId, userId]
            );
            
            res.status(204).send();
        } catch (error) {
            logger.error('Failed to delete reminder:', error);
            res.status(500).json({ error: 'Failed to delete reminder' });
        }
    });

    // GET /api/notification-preferences - Get user notification preferences
    router.get('/preferences', requireAuth, async (req, res) => {
        try {
            const userId = req.user.id;
            
            let prefs = await dbAdapter.query(
                'SELECT * FROM notification_preferences WHERE user_id = $1',
                [userId]
            );
            
            if (!prefs.rows || prefs.rows.length === 0) {
                // Create default preferences
                prefs = await dbAdapter.query(
                    `INSERT INTO notification_preferences (user_id)
                     VALUES ($1)
                     RETURNING *`,
                    [userId]
                );
            }
            
            res.json(prefs.rows[0]);
        } catch (error) {
            logger.error('Failed to get notification preferences:', error);
            res.status(500).json({ error: 'Failed to get preferences' });
        }
    });

    // PUT /api/notification-preferences - Update user notification preferences
    router.put('/preferences', requireAuth, async (req, res) => {
        try {
            const userId = req.user.id;
            const {
                notifications_enabled,
                default_reminder_minutes,
                sound_enabled,
                browser_notifications,
                email_notifications
            } = req.body;
            
            // Check if preferences exist
            const existing = await dbAdapter.query(
                'SELECT id FROM notification_preferences WHERE user_id = $1',
                [userId]
            );
            
            let result;
            if (existing.rows && existing.rows.length > 0) {
                // Update existing
                result = await dbAdapter.query(
                    `UPDATE notification_preferences 
                     SET notifications_enabled = COALESCE($1, notifications_enabled),
                         default_reminder_minutes = COALESCE($2, default_reminder_minutes),
                         sound_enabled = COALESCE($3, sound_enabled),
                         browser_notifications = COALESCE($4, browser_notifications),
                         email_notifications = COALESCE($5, email_notifications),
                         updated_at = NOW()
                     WHERE user_id = $6
                     RETURNING *`,
                    [notifications_enabled, default_reminder_minutes, sound_enabled, 
                     browser_notifications, email_notifications, userId]
                );
            } else {
                // Create new
                result = await dbAdapter.query(
                    `INSERT INTO notification_preferences 
                     (user_id, notifications_enabled, default_reminder_minutes, 
                      sound_enabled, browser_notifications, email_notifications)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING *`,
                    [userId, notifications_enabled ?? true, default_reminder_minutes ?? 15,
                     sound_enabled ?? true, browser_notifications ?? true, email_notifications ?? false]
                );
            }
            
            res.json(result.rows[0]);
        } catch (error) {
            logger.error('Failed to update notification preferences:', error);
            res.status(500).json({ error: 'Failed to update preferences' });
        }
    });

    // POST /api/reminders/test - Send test notification
    router.post('/test', requireAuth, async (req, res) => {
        try {
            // This endpoint would trigger a test notification
            // In a real implementation, you'd use a service like Firebase Cloud Messaging
            // or Web Push API to send the notification
            
            res.json({ 
                success: true, 
                message: 'Test notification scheduled' 
            });
        } catch (error) {
            logger.error('Failed to send test notification:', error);
            res.status(500).json({ error: 'Failed to send test notification' });
        }
    });

    return router;
}

module.exports = { createReminderRoutes };