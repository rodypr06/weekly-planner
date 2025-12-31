// File: middleware/database-adapter.js
// Database abstraction layer to support both SQLite and Supabase

const logger = require('../utils/logger');

/**
 * Database adapter factory
 * @param {string} type - 'sqlite' or 'supabase'
 * @param {Object} config - Database configuration
 * @returns {Object} Database adapter instance
 */
function createDatabaseAdapter(type, config) {
    switch (type.toLowerCase()) {
        case 'sqlite':
            return new SQLiteAdapter(config);
        case 'supabase':
            return new SupabaseAdapter(config);
        default:
            throw new Error(`Unsupported database type: ${type}`);
    }
}

/**
 * SQLite Database Adapter
 */
class SQLiteAdapter {
    constructor(config) {
        const Database = require('better-sqlite3');
        this.db = new Database(config.dbPath || 'tasks.db');
        this.type = 'sqlite';
        this.initializeTables();
    }

    initializeTables() {
        // Create users table if it doesn't exist
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create tasks table if it doesn't exist (now with user_id)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                text TEXT NOT NULL,
                emoji TEXT NOT NULL,
                time TEXT,
                priority TEXT NOT NULL,
                tags TEXT,
                completed INTEGER DEFAULT 0,
                archived INTEGER DEFAULT 0,
                position INTEGER,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Add user_id column if it doesn't exist
        try {
            this.db.exec(`ALTER TABLE tasks ADD COLUMN user_id INTEGER DEFAULT 1`);
        } catch (error) {
            // Column already exists, ignore
        }

        // Add archived column if it doesn't exist
        try {
            this.db.exec(`ALTER TABLE tasks ADD COLUMN archived INTEGER DEFAULT 0`);
        } catch (error) {
            // Column already exists, ignore
        }

        // Add position column if it doesn't exist
        try {
            this.db.exec(`ALTER TABLE tasks ADD COLUMN position INTEGER`);
        } catch (error) {
            // Column already exists, ignore
        }
    }

    // Task operations
    async getTasks(userId, date, includeArchived = false) {
        try {
            let query = `
                SELECT * FROM tasks 
                WHERE user_id = ? AND date = ?
            `;
            const params = [userId, date];

            if (!includeArchived) {
                query += ` AND archived = 0`;
            }

            query += ` ORDER BY position ASC, time ASC`;

            const stmt = this.db.prepare(query);
            const tasks = stmt.all(params);

            return {
                data: tasks.map(task => ({
                    ...task,
                    tags: task.tags ? task.tags.split(',') : [],
                    completed: Boolean(task.completed),
                    archived: Boolean(task.archived)
                })),
                error: null
            };
        } catch (error) {
            logger.error('SQLite getTasks error:', error);
            return { data: null, error };
        }
    }

    async createTask(userId, taskData) {
        try {
            const {
                date, text, emoji, time, priority, tags, completed, archived, position
            } = taskData;

            // Calculate position if not provided
            let taskPosition = position;
            if (taskPosition === undefined) {
                const stmt = this.db.prepare(`
                    SELECT position FROM tasks 
                    WHERE user_id = ? AND date = ? AND archived = 0 
                    ORDER BY position DESC LIMIT 1
                `);
                const lastTask = stmt.get(userId, date);
                taskPosition = lastTask && lastTask.position !== null ? lastTask.position + 1 : 0;
            }

            const insertStmt = this.db.prepare(`
                INSERT INTO tasks (user_id, date, text, emoji, time, priority, tags, completed, archived, position)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = insertStmt.run(
                userId, date, text, emoji, time || null, priority,
                Array.isArray(tags) ? tags.join(',') : '',
                completed || false, archived || false, taskPosition
            );

            return {
                data: { id: result.lastInsertRowid, ...taskData },
                error: null
            };
        } catch (error) {
            logger.error('SQLite createTask error:', error);
            return { data: null, error };
        }
    }

    async updateTask(userId, taskId, updateData) {
        try {
            const { text, time, priority, tags, completed, position } = updateData;

            const updates = [];
            const params = [];

            if (text !== undefined) {
                updates.push('text = ?');
                params.push(text);
            }
            if (time !== undefined) {
                updates.push('time = ?');
                params.push(time || null);
            }
            if (priority !== undefined) {
                updates.push('priority = ?');
                params.push(priority);
            }
            if (tags !== undefined) {
                updates.push('tags = ?');
                params.push(Array.isArray(tags) ? tags.join(',') : '');
            }
            if (completed !== undefined) {
                updates.push('completed = ?');
                params.push(completed || false);
            }
            if (position !== undefined) {
                updates.push('position = ?');
                params.push(position);
            }

            if (updates.length === 0) {
                return { data: { affectedRows: 0 }, error: null };
            }

            params.push(taskId, userId);

            const stmt = this.db.prepare(`
                UPDATE tasks SET ${updates.join(', ')} 
                WHERE id = ? AND user_id = ?
            `);

            const result = stmt.run(params);

            return {
                data: { affectedRows: result.changes },
                error: null
            };
        } catch (error) {
            logger.error('SQLite updateTask error:', error);
            return { data: null, error };
        }
    }

    async deleteTask(userId, taskId) {
        try {
            const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?');
            const result = stmt.run(taskId, userId);

            return {
                data: { affectedRows: result.changes },
                error: null
            };
        } catch (error) {
            logger.error('SQLite deleteTask error:', error);
            return { data: null, error };
        }
    }

    async clearAllTasks(userId) {
        try {
            const stmt = this.db.prepare('DELETE FROM tasks WHERE user_id = ?');
            const result = stmt.run(userId);

            return {
                data: { affectedRows: result.changes },
                error: null
            };
        } catch (error) {
            logger.error('SQLite clearAllTasks error:', error);
            return { data: null, error };
        }
    }

    async archiveTasks(userId, date) {
        try {
            const stmt = this.db.prepare(`
                UPDATE tasks SET archived = 1 
                WHERE user_id = ? AND date = ? AND completed = 1
            `);
            const result = stmt.run(userId, date);

            return {
                data: { affectedRows: result.changes },
                error: null
            };
        } catch (error) {
            logger.error('SQLite archiveTasks error:', error);
            return { data: null, error };
        }
    }

    async unarchiveTasks(userId, taskIds) {
        try {
            if (!Array.isArray(taskIds) || taskIds.length === 0) {
                return { data: { affectedRows: 0 }, error: null };
            }

            const placeholders = taskIds.map(() => '?').join(',');
            const stmt = this.db.prepare(`
                UPDATE tasks SET archived = 0 
                WHERE id IN (${placeholders}) AND user_id = ?
            `);
            const result = stmt.run(...taskIds, userId);

            return {
                data: { affectedRows: result.changes },
                error: null
            };
        } catch (error) {
            logger.error('SQLite unarchiveTasks error:', error);
            return { data: null, error };
        }
    }

    async reorderTasks(userId, taskOrders) {
        try {
            const updateStmt = this.db.prepare(`
                UPDATE tasks SET position = ? 
                WHERE id = ? AND user_id = ?
            `);

            const transaction = this.db.transaction((orders) => {
                for (const { id, position } of orders) {
                    updateStmt.run(position, id, userId);
                }
            });

            transaction(taskOrders);

            return {
                data: { updatedCount: taskOrders.length },
                error: null
            };
        } catch (error) {
            logger.error('SQLite reorderTasks error:', error);
            return { data: null, error };
        }
    }

    // Database utility methods
    close() {
        if (this.db) {
            this.db.close();
        }
    }

    // User operations (for SQLite authentication)
    async createUser(name, email, passwordHash) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO users (name, email, password_hash)
                VALUES (?, ?, ?)
            `);
            const result = stmt.run(name, email, passwordHash);

            return {
                data: { id: result.lastInsertRowid, name, email },
                error: null
            };
        } catch (error) {
            logger.error('SQLite createUser error:', error);
            return { data: null, error };
        }
    }

    async getUserByEmail(email) {
        try {
            const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
            const user = stmt.get(email);

            return {
                data: user,
                error: null
            };
        } catch (error) {
            logger.error('SQLite getUserByEmail error:', error);
            return { data: null, error };
        }
    }

    async getUserById(id) {
        try {
            const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
            const user = stmt.get(id);

            return {
                data: user,
                error: null
            };
        } catch (error) {
            logger.error('SQLite getUserById error:', error);
            return { data: null, error };
        }
    }
}

/**
 * Supabase Database Adapter
 */
class SupabaseAdapter {
    constructor(config) {
        const { createClient } = require('@supabase/supabase-js');
        this.supabase = createClient(config.url, config.serviceKey);
        this.type = 'supabase';
    }

    // Task operations
    async getTasks(userId, date, includeArchived = false) {
        try {
            let query = this.supabase
                .from('tasks')
                .select('*')
                .eq('user_id', userId)
                .eq('date', date);

            if (!includeArchived) {
                query = query.eq('archived', false);
            }

            // Order by position first, then by time for backward compatibility
            try {
                query = query.order('position', { ascending: true, nullsLast: true })
                             .order('time', { ascending: true, nullsLast: true });
            } catch (error) {
                logger.log('Position column may not exist, falling back to time ordering');
                query = query.order('time', { ascending: true, nullsLast: true });
            }

            const { data: tasks, error } = await query;

            if (error) {
                return { data: null, error };
            }

            return {
                data: tasks.map(task => ({
                    ...task,
                    tags: task.tags ? task.tags.split(',') : [],
                    completed: Boolean(task.completed),
                    archived: Boolean(task.archived)
                })),
                error: null
            };
        } catch (error) {
            logger.error('Supabase getTasks error:', error);
            return { data: null, error };
        }
    }

    async createTask(userId, taskData) {
        try {
            const {
                date, text, emoji, time, priority, tags, completed, archived, position
            } = taskData;

            const insertData = {
                user_id: userId,
                date,
                text,
                emoji,
                time: time || null,
                priority,
                tags: Array.isArray(tags) ? tags.join(',') : '',
                completed: completed || false,
                archived: archived || false
            };

            // Try to add position if the column exists
            try {
                let taskPosition = position;
                if (taskPosition === undefined) {
                    const { data: existingTasks } = await this.supabase
                        .from('tasks')
                        .select('position')
                        .eq('user_id', userId)
                        .eq('date', date)
                        .eq('archived', false)
                        .order('position', { ascending: false })
                        .limit(1);

                    taskPosition = existingTasks && existingTasks.length > 0 ? existingTasks[0].position + 1 : 0;
                }
                insertData.position = taskPosition;
            } catch (error) {
                // Position column might not exist, continue without it
                logger.log('Could not set position, column may not exist:', error.message);
            }

            const { data, error } = await this.supabase
                .from('tasks')
                .insert([insertData])
                .select()
                .single();

            if (error) {
                return { data: null, error };
            }

            return { data: { id: data.id, ...data }, error: null };
        } catch (error) {
            logger.error('Supabase createTask error:', error);
            return { data: null, error };
        }
    }

    async updateTask(userId, taskId, updateData) {
        try {
            const { text, time, priority, tags, completed, position } = updateData;

            const updateObj = {
                text,
                time: time || null,
                priority,
                tags: Array.isArray(tags) ? tags.join(',') : '',
                completed: completed || false
            };

            // Only include position in update if it's provided
            if (position !== undefined) {
                updateObj.position = position;
            }

            const { data, error } = await this.supabase
                .from('tasks')
                .update(updateObj)
                .eq('id', taskId)
                .eq('user_id', userId)
                .select();

            if (error) {
                return { data: null, error };
            }

            return {
                data: { affectedRows: data.length },
                error: null
            };
        } catch (error) {
            logger.error('Supabase updateTask error:', error);
            return { data: null, error };
        }
    }

    async deleteTask(userId, taskId) {
        try {
            const { data, error } = await this.supabase
                .from('tasks')
                .delete()
                .eq('id', taskId)
                .eq('user_id', userId)
                .select();

            if (error) {
                return { data: null, error };
            }

            return {
                data: { affectedRows: data.length },
                error: null
            };
        } catch (error) {
            logger.error('Supabase deleteTask error:', error);
            return { data: null, error };
        }
    }

    async clearAllTasks(userId) {
        try {
            const { data, error } = await this.supabase
                .from('tasks')
                .delete()
                .eq('user_id', userId);

            if (error) {
                return { data: null, error };
            }

            return {
                data: { affectedRows: 1 }, // Supabase doesn't return affected count
                error: null
            };
        } catch (error) {
            logger.error('Supabase clearAllTasks error:', error);
            return { data: null, error };
        }
    }

    async archiveTasks(userId, date) {
        try {
            const { data, error } = await this.supabase
                .from('tasks')
                .update({ archived: true })
                .eq('user_id', userId)
                .eq('date', date)
                .eq('completed', true)
                .select();

            if (error) {
                return { data: null, error };
            }

            return {
                data: { affectedRows: data.length },
                error: null
            };
        } catch (error) {
            logger.error('Supabase archiveTasks error:', error);
            return { data: null, error };
        }
    }

    async unarchiveTasks(userId, taskIds) {
        try {
            if (!Array.isArray(taskIds) || taskIds.length === 0) {
                return { data: { affectedRows: 0 }, error: null };
            }

            const { data, error } = await this.supabase
                .from('tasks')
                .update({ archived: false })
                .in('id', taskIds)
                .eq('user_id', userId)
                .select();

            if (error) {
                return { data: null, error };
            }

            return {
                data: { affectedRows: data.length },
                error: null
            };
        } catch (error) {
            logger.error('Supabase unarchiveTasks error:', error);
            return { data: null, error };
        }
    }

    async reorderTasks(userId, taskOrders) {
        try {
            if (!Array.isArray(taskOrders) || taskOrders.length === 0) {
                return { data: { updatedCount: 0 }, error: null };
            }

            // First, test if the position column exists
            const testResult = await this.supabase
                .from('tasks')
                .update({ position: 0 })
                .eq('id', -999) // Non-existent ID to test column existence
                .eq('user_id', userId);

            if (testResult.error && testResult.error.message.includes('column "position" does not exist')) {
                return {
                    data: null,
                    error: {
                        message: 'Task reordering feature requires a database update. The "position" column needs to be added to the tasks table.',
                        needsMigration: true
                    }
                };
            }

            // Update each task's position
            const updatePromises = taskOrders.map(({ id, position }) => {
                return this.supabase
                    .from('tasks')
                    .update({ position })
                    .eq('id', id)
                    .eq('user_id', userId);
            });

            const results = await Promise.all(updatePromises);

            // Check for any errors
            const hasErrors = results.some(result => result.error);
            if (hasErrors) {
                const errors = results.filter(r => r.error).map(r => r.error);
                
                const columnError = errors.find(e => e.message && e.message.includes('column "position" does not exist'));
                if (columnError) {
                    return {
                        data: null,
                        error: {
                            message: 'Task reordering feature requires a database update. The "position" column needs to be added to the tasks table.',
                            needsMigration: true
                        }
                    };
                }

                return { data: null, error: errors[0] };
            }

            return {
                data: { updatedCount: taskOrders.length },
                error: null
            };
        } catch (error) {
            logger.error('Supabase reorderTasks error:', error);
            return { data: null, error };
        }
    }

    // User operations (handled by Supabase Auth)
    async getUser(token) {
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser(token);
            return { data: user, error };
        } catch (error) {
            logger.error('Supabase getUser error:', error);
            return { data: null, error };
        }
    }
}

module.exports = {
    createDatabaseAdapter,
    SQLiteAdapter,
    SupabaseAdapter
};