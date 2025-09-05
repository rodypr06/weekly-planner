/**
 * Production-safe logging utility for browser environment
 * Provides structured logging with environment awareness
 */
(function() {
    'use strict';
    
    const isProduction = window.location.hostname !== 'localhost' && 
                         window.location.hostname !== '127.0.0.1' &&
                         !window.location.hostname.includes('.local');
    
    // Log levels for filtering
    const LogLevel = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        NONE: 4
    };
    
    // Current log level based on environment
    const currentLogLevel = isProduction ? LogLevel.ERROR : LogLevel.DEBUG;
    
    // Store logs in memory for debugging (limited size)
    const logBuffer = [];
    const MAX_LOG_BUFFER = 100;
    
    /**
     * Add log entry to buffer
     */
    function addToBuffer(level, args) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message: args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ')
        };
        
        logBuffer.push(entry);
        
        // Maintain buffer size
        if (logBuffer.length > MAX_LOG_BUFFER) {
            logBuffer.shift();
        }
    }
    
    /**
     * Format log message with timestamp and level
     */
    function formatMessage(level, args) {
        const timestamp = new Date().toISOString();
        return [`[${timestamp}] [${level}]`, ...args];
    }
    
    const logger = {
        /**
         * Debug level logging - only in development
         */
        debug: function(...args) {
            addToBuffer('DEBUG', args);
            if (currentLogLevel <= LogLevel.DEBUG) {
                console.debug(...formatMessage('DEBUG', args));
            }
        },
        
        /**
         * Info level logging - only in development
         */
        info: function(...args) {
            addToBuffer('INFO', args);
            if (currentLogLevel <= LogLevel.INFO) {
                console.info(...formatMessage('INFO', args));
            }
        },
        
        /**
         * Standard logging - only in development
         */
        log: function(...args) {
            addToBuffer('LOG', args);
            if (currentLogLevel <= LogLevel.INFO) {
                console.log(...formatMessage('LOG', args));
            }
        },
        
        /**
         * Warning level logging - only in development
         */
        warn: function(...args) {
            addToBuffer('WARN', args);
            if (currentLogLevel <= LogLevel.WARN) {
                console.warn(...formatMessage('WARN', args));
            }
        },
        
        /**
         * Error level logging - always logged
         * In production, can be sent to error tracking service
         */
        error: function(...args) {
            addToBuffer('ERROR', args);
            if (currentLogLevel <= LogLevel.ERROR) {
                console.error(...formatMessage('ERROR', args));
                
                // In production, could send to error tracking service
                if (isProduction && window.trackError) {
                    try {
                        window.trackError(args);
                    } catch (e) {
                        // Fail silently
                    }
                }
            }
        },
        
        /**
         * Group logging operations
         */
        group: function(label) {
            if (currentLogLevel <= LogLevel.INFO) {
                console.group(label);
            }
        },
        
        /**
         * End group
         */
        groupEnd: function() {
            if (currentLogLevel <= LogLevel.INFO) {
                console.groupEnd();
            }
        },
        
        /**
         * Time operations
         */
        time: function(label) {
            if (currentLogLevel <= LogLevel.DEBUG) {
                console.time(label);
            }
        },
        
        /**
         * End timing
         */
        timeEnd: function(label) {
            if (currentLogLevel <= LogLevel.DEBUG) {
                console.timeEnd(label);
            }
        },
        
        /**
         * Table display for debugging
         */
        table: function(data) {
            if (currentLogLevel <= LogLevel.DEBUG) {
                console.table(data);
            }
        },
        
        /**
         * Get current environment
         */
        getEnvironment: function() {
            return isProduction ? 'production' : 'development';
        },
        
        /**
         * Get log buffer for debugging
         */
        getLogBuffer: function() {
            return [...logBuffer];
        },
        
        /**
         * Clear log buffer
         */
        clearLogBuffer: function() {
            logBuffer.length = 0;
        },
        
        /**
         * Export logs as JSON
         */
        exportLogs: function() {
            return JSON.stringify(logBuffer, null, 2);
        },
        
        /**
         * Check if production mode
         */
        isProduction: function() {
            return isProduction;
        }
    };
    
    // Replace console methods with logger in production
    if (isProduction) {
        // Store original console methods
        const originalConsole = {
            log: console.log,
            debug: console.debug,
            info: console.info,
            warn: console.warn,
            error: console.error
        };
        
        // Override console methods
        console.log = function() {};
        console.debug = function() {};
        console.info = function() {};
        console.warn = function() {};
        // Keep console.error for critical errors
        
        // Provide way to restore console in emergency
        window.restoreConsole = function() {
            Object.assign(console, originalConsole);
            return 'Console restored';
        };
    }
    
    // Expose logger globally
    window.logger = logger;
    
    // Also expose as CommonJS/AMD if needed
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = logger;
    }
    if (typeof define === 'function' && define.amd) {
        define([], function() { return logger; });
    }
})();