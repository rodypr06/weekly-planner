/**
 * Global error handling and recovery utilities
 * Provides centralized error management with user-friendly feedback
 */
(function() {
    'use strict';
    
    class ErrorHandler {
        constructor() {
            // Error history for debugging
            this.errorHistory = [];
            this.maxErrorHistory = 50;
            
            // Error recovery strategies
            this.recoveryStrategies = new Map();
            
            // User notification settings
            this.notificationSettings = {
                showUserErrors: true,
                autoHideDelay: 5000,
                maxConcurrentNotifications: 3
            };
            
            // Initialize error handling
            this.initialize();
        }
        
        /**
         * Initialize global error handlers
         */
        initialize() {
            // Global error handler
            window.addEventListener('error', (event) => {
                this.handleError({
                    message: event.message,
                    source: event.filename,
                    line: event.lineno,
                    column: event.colno,
                    error: event.error,
                    type: 'uncaught'
                });
                
                // Prevent default error handling in production
                if (window.logger && window.logger.isProduction()) {
                    event.preventDefault();
                }
            });
            
            // Unhandled promise rejection handler
            window.addEventListener('unhandledrejection', (event) => {
                this.handleError({
                    message: `Unhandled Promise Rejection: ${event.reason}`,
                    error: event.reason,
                    type: 'unhandledRejection',
                    promise: event.promise
                });
                
                // Prevent default handling in production
                if (window.logger && window.logger.isProduction()) {
                    event.preventDefault();
                }
            });
            
            // Network error detection
            this.setupNetworkErrorDetection();
            
            // Setup default recovery strategies
            this.setupDefaultRecoveryStrategies();
        }
        
        /**
         * Setup network error detection
         */
        setupNetworkErrorDetection() {
            // Monitor fetch requests
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                try {
                    const response = await originalFetch(...args);
                    
                    if (!response.ok && response.status >= 500) {
                        this.handleError({
                            message: `Server error: ${response.status} ${response.statusText}`,
                            type: 'network',
                            status: response.status,
                            url: args[0]
                        });
                    }
                    
                    return response;
                } catch (error) {
                    this.handleError({
                        message: `Network request failed: ${error.message}`,
                        type: 'network',
                        error: error,
                        url: args[0]
                    });
                    throw error;
                }
            };
            
            // Monitor online/offline status
            window.addEventListener('online', () => {
                this.notifyUser('Connection restored', 'success');
            });
            
            window.addEventListener('offline', () => {
                this.notifyUser('Connection lost. Some features may be unavailable.', 'warning');
            });
        }
        
        /**
         * Setup default recovery strategies
         */
        setupDefaultRecoveryStrategies() {
            // Network error recovery
            this.recoveryStrategies.set('network', {
                maxRetries: 3,
                retryDelay: 1000,
                async recover(error, retry = 0) {
                    if (retry >= this.maxRetries) {
                        return { success: false, message: 'Maximum retries exceeded' };
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retry + 1)));
                    
                    // Check if online
                    if (!navigator.onLine) {
                        return { success: false, message: 'No internet connection' };
                    }
                    
                    return { success: true, retry: true };
                }
            });
            
            // Authentication error recovery
            this.recoveryStrategies.set('auth', {
                async recover(error) {
                    // Try to refresh session
                    if (window.supabaseAuth && window.supabaseAuth.refreshSession) {
                        try {
                            await window.supabaseAuth.refreshSession();
                            return { success: true, message: 'Session refreshed' };
                        } catch (e) {
                            return { 
                                success: false, 
                                message: 'Please log in again',
                                action: () => window.location.href = '/login'
                            };
                        }
                    }
                    return { success: false };
                }
            });
            
            // Storage quota error recovery
            this.recoveryStrategies.set('storage', {
                async recover(error) {
                    try {
                        // Clear old cache
                        if ('caches' in window) {
                            const cacheNames = await caches.keys();
                            await Promise.all(
                                cacheNames.map(name => caches.delete(name))
                            );
                        }
                        
                        // Clear old localStorage data
                        const keysToRemove = [];
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key && key.startsWith('temp_') || key.startsWith('cache_')) {
                                keysToRemove.push(key);
                            }
                        }
                        keysToRemove.forEach(key => localStorage.removeItem(key));
                        
                        return { success: true, message: 'Storage cleared' };
                    } catch (e) {
                        return { success: false, message: 'Failed to clear storage' };
                    }
                }
            });
        }
        
        /**
         * Handle error with logging and recovery
         * @param {object} errorInfo - Error information
         */
        async handleError(errorInfo) {
            // Add to history
            this.addToHistory(errorInfo);
            
            // Log error
            this.logError(errorInfo);
            
            // Classify error
            const errorType = this.classifyError(errorInfo);
            
            // Attempt recovery
            if (this.recoveryStrategies.has(errorType)) {
                const strategy = this.recoveryStrategies.get(errorType);
                const result = await strategy.recover(errorInfo);
                
                if (result.success) {
                    if (result.retry) {
                        // Retry the operation
                        return;
                    }
                    if (result.message) {
                        this.notifyUser(result.message, 'success');
                    }
                } else {
                    if (result.action) {
                        // Execute recovery action
                        result.action();
                    } else if (result.message) {
                        this.notifyUser(result.message, 'error');
                    }
                }
            } else {
                // No recovery strategy, notify user
                this.notifyUserError(errorInfo);
            }
        }
        
        /**
         * Classify error type
         * @param {object} errorInfo - Error information
         * @returns {string} - Error type
         */
        classifyError(errorInfo) {
            if (errorInfo.type === 'network') {
                return 'network';
            }
            
            const message = errorInfo.message || '';
            
            if (message.includes('auth') || message.includes('unauthorized') || message.includes('401')) {
                return 'auth';
            }
            
            if (message.includes('QuotaExceededError') || message.includes('storage')) {
                return 'storage';
            }
            
            if (message.includes('TypeError') || message.includes('undefined')) {
                return 'type';
            }
            
            if (message.includes('ReferenceError')) {
                return 'reference';
            }
            
            return 'general';
        }
        
        /**
         * Add error to history
         * @param {object} errorInfo - Error information
         */
        addToHistory(errorInfo) {
            this.errorHistory.push({
                ...errorInfo,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            });
            
            // Maintain history size
            if (this.errorHistory.length > this.maxErrorHistory) {
                this.errorHistory.shift();
            }
        }
        
        /**
         * Log error using logger
         * @param {object} errorInfo - Error information
         */
        logError(errorInfo) {
            if (window.logger) {
                window.logger.error('Error caught:', errorInfo);
            } else {
                console.error('Error caught:', errorInfo);
            }
        }
        
        /**
         * Notify user about error
         * @param {object} errorInfo - Error information
         */
        notifyUserError(errorInfo) {
            if (!this.notificationSettings.showUserErrors) {
                return;
            }
            
            const userMessage = this.getUserFriendlyMessage(errorInfo);
            this.notifyUser(userMessage, 'error');
        }
        
        /**
         * Get user-friendly error message
         * @param {object} errorInfo - Error information
         * @returns {string} - User-friendly message
         */
        getUserFriendlyMessage(errorInfo) {
            const type = this.classifyError(errorInfo);
            
            const messages = {
                network: 'Network error. Please check your connection.',
                auth: 'Authentication error. Please log in again.',
                storage: 'Storage limit reached. Clearing cache...',
                type: 'Something went wrong. Please refresh the page.',
                reference: 'Application error. Please refresh the page.',
                general: 'An unexpected error occurred.'
            };
            
            return messages[type] || messages.general;
        }
        
        /**
         * Show notification to user
         * @param {string} message - Message to show
         * @param {string} type - Notification type (error, warning, success, info)
         */
        notifyUser(message, type = 'info') {
            // Check if notification manager exists
            if (window.notificationManager) {
                window.notificationManager.show(message, type);
                return;
            }
            
            // Fallback to simple notification
            this.showSimpleNotification(message, type);
        }
        
        /**
         * Show simple notification fallback
         * @param {string} message - Message to show
         * @param {string} type - Notification type
         */
        showSimpleNotification(message, type) {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = `error-notification error-notification--${type}`;
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                background: ${this.getNotificationColor(type)};
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 10000;
                animation: slideIn 0.3s ease;
                max-width: 300px;
            `;
            
            // Add to page
            document.body.appendChild(notification);
            
            // Auto-hide
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, this.notificationSettings.autoHideDelay);
        }
        
        /**
         * Get notification background color
         * @param {string} type - Notification type
         * @returns {string} - Background color
         */
        getNotificationColor(type) {
            const colors = {
                error: '#ef4444',
                warning: '#f59e0b',
                success: '#10b981',
                info: '#3b82f6'
            };
            return colors[type] || colors.info;
        }
        
        /**
         * Get error history
         * @returns {Array} - Error history
         */
        getErrorHistory() {
            return [...this.errorHistory];
        }
        
        /**
         * Clear error history
         */
        clearErrorHistory() {
            this.errorHistory = [];
        }
        
        /**
         * Export error history as JSON
         * @returns {string} - JSON string
         */
        exportErrorHistory() {
            return JSON.stringify(this.errorHistory, null, 2);
        }
        
        /**
         * Register custom recovery strategy
         * @param {string} errorType - Error type
         * @param {object} strategy - Recovery strategy
         */
        registerRecoveryStrategy(errorType, strategy) {
            this.recoveryStrategies.set(errorType, strategy);
        }
        
        /**
         * Test error handling
         */
        test() {
            // Trigger test error
            this.handleError({
                message: 'This is a test error',
                type: 'test',
                error: new Error('Test error')
            });
        }
    }
    
    // Add CSS for notifications
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Create global instance
    window.errorHandler = new ErrorHandler();
    
    // Export for modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ErrorHandler;
    }
})();