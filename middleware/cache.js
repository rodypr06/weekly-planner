// File: middleware/cache.js
// Simple in-memory cache for task data

const logger = require('../utils/logger');

class TaskCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.maxSize = options.maxSize || 1000; // Maximum number of entries
        this.defaultTTL = options.defaultTTL || 300000; // 5 minutes in milliseconds
        this.enabled = options.enabled !== false;
        
        if (this.enabled) {
            logger.info('TaskCache initialized', { maxSize: this.maxSize, defaultTTL: this.defaultTTL });
        }
    }

    /**
     * Generate cache key for user tasks by date
     */
    _generateKey(userId, date, includeArchived = false) {
        return `tasks:${userId}:${date}:${includeArchived}`;
    }

    /**
     * Get cached tasks
     */
    get(userId, date, includeArchived = false) {
        if (!this.enabled) return null;

        const key = this._generateKey(userId, date, includeArchived);
        const cached = this.cache.get(key);

        if (!cached) return null;

        // Check if expired
        if (Date.now() > cached.expiry) {
            this.cache.delete(key);
            return null;
        }

        logger.debug('Cache hit', { key, tasksCount: cached.data.length });
        return cached.data;
    }

    /**
     * Set cached tasks
     */
    set(userId, date, tasks, includeArchived = false, ttl = this.defaultTTL) {
        if (!this.enabled) return;

        const key = this._generateKey(userId, date, includeArchived);
        
        // Implement simple LRU by removing oldest entry if at max size
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            data: tasks,
            expiry: Date.now() + ttl,
            created: Date.now()
        });

        logger.debug('Cache set', { key, tasksCount: tasks.length, ttl });
    }

    /**
     * Invalidate cache entries for a user
     */
    invalidateUser(userId, specificDate = null) {
        if (!this.enabled) return;

        let deletedCount = 0;
        for (const key of this.cache.keys()) {
            if (key.startsWith(`tasks:${userId}:`)) {
                if (!specificDate || key.includes(`:${specificDate}:`)) {
                    this.cache.delete(key);
                    deletedCount++;
                }
            }
        }

        logger.debug('Cache invalidated', { userId, specificDate, deletedCount });
    }

    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
        logger.info('Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const now = Date.now();
        let expiredCount = 0;
        let activeCount = 0;

        for (const cached of this.cache.values()) {
            if (now > cached.expiry) {
                expiredCount++;
            } else {
                activeCount++;
            }
        }

        return {
            total: this.cache.size,
            active: activeCount,
            expired: expiredCount,
            maxSize: this.maxSize,
            enabled: this.enabled
        };
    }

    /**
     * Clean up expired entries
     */
    cleanup() {
        if (!this.enabled) return;

        const now = Date.now();
        let deletedCount = 0;

        for (const [key, cached] of this.cache.entries()) {
            if (now > cached.expiry) {
                this.cache.delete(key);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            logger.debug('Cache cleanup', { deletedCount });
        }
    }
}

// Export singleton instance
const taskCache = new TaskCache({
    maxSize: process.env.CACHE_MAX_SIZE || 1000,
    defaultTTL: process.env.CACHE_TTL || 300000, // 5 minutes
    enabled: process.env.CACHE_ENABLED !== 'false'
});

// Schedule periodic cleanup
if (taskCache.enabled) {
    setInterval(() => {
        taskCache.cleanup();
    }, 60000); // Clean up every minute
}

module.exports = taskCache;