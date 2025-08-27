// File: public/security-utils.js
// Client-side security utilities for XSS protection and input validation

/**
 * Client-side security utilities
 */
class SecurityUtils {
    constructor() {
        // Initialize DOMPurify if available
        this.domPurify = window.DOMPurify || null;
        
        // Initialize security policies
        this.initSecurityPolicies();
        
        // Set up content security monitoring
        this.setupCSPViolationReporting();
    }
    
    /**
     * Initialize security policies and configurations
     */
    initSecurityPolicies() {
        // Configure DOMPurify if available
        if (this.domPurify) {
            this.domPurify.setConfig({
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span'],
                ALLOWED_ATTR: ['class'],
                KEEP_CONTENT: true,
                RETURN_DOM: false,
                RETURN_DOM_FRAGMENT: false
            });
        }
        
        // Content validation rules
        this.validationRules = {
            taskText: {
                maxLength: 500,
                dangerousChars: /<script|<iframe|javascript:|vbscript:|onload=|onerror=/i
            },
            tags: {
                maxLength: 20,
                maxCount: 10,
                allowedChars: /^[a-zA-Z0-9\-_\u00C0-\u017F]*$/
            },
            time: {
                format: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
            },
            date: {
                format: /^\d{4}-\d{2}-\d{2}$/
            }
        };
    }
    
    /**
     * Setup CSP violation reporting
     */
    setupCSPViolationReporting() {
        document.addEventListener('securitypolicyviolation', (e) => {
            console.warn('CSP Violation:', {
                violatedDirective: e.violatedDirective,
                blockedURI: e.blockedURI,
                originalPolicy: e.originalPolicy,
                effectiveDirective: e.effectiveDirective
            });
            
            // Report to server (optional)
            if (typeof logger !== 'undefined') {
                logger.warn('CSP violation detected on client');
            }
        });
    }
    
    /**
     * Sanitize text content using DOMPurify or fallback method
     * @param {string} content - Content to sanitize
     * @returns {string} - Sanitized content
     */
    sanitizeContent(content) {
        if (typeof content !== 'string') {
            return '';
        }
        
        // Use DOMPurify if available
        if (this.domPurify) {
            return this.domPurify.sanitize(content);
        }
        
        // Fallback sanitization
        return this.basicSanitize(content);
    }
    
    /**
     * Basic sanitization fallback when DOMPurify is not available
     * @param {string} content - Content to sanitize
     * @returns {string} - Sanitized content
     */
    basicSanitize(content) {
        return content
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
    
    /**
     * Validate task text
     * @param {string} text - Task text to validate
     * @returns {object} - Validation result
     */
    validateTaskText(text) {
        if (!text || typeof text !== 'string') {
            return { isValid: false, error: 'Task text is required' };
        }
        
        if (text.length > this.validationRules.taskText.maxLength) {
            return { isValid: false, error: `Task text must be ${this.validationRules.taskText.maxLength} characters or less` };
        }
        
        if (this.validationRules.taskText.dangerousChars.test(text)) {
            return { isValid: false, error: 'Task text contains potentially dangerous content' };
        }
        
        return { isValid: true };
    }
    
    /**
     * Validate tags array
     * @param {Array} tags - Tags array to validate
     * @returns {object} - Validation result
     */
    validateTags(tags) {
        if (!Array.isArray(tags)) {
            return { isValid: false, error: 'Tags must be an array' };
        }
        
        if (tags.length > this.validationRules.tags.maxCount) {
            return { isValid: false, error: `Maximum ${this.validationRules.tags.maxCount} tags allowed` };
        }
        
        for (const tag of tags) {
            if (typeof tag !== 'string') {
                return { isValid: false, error: 'All tags must be strings' };
            }
            
            if (tag.length > this.validationRules.tags.maxLength) {
                return { isValid: false, error: `Tag "${tag}" is too long (max ${this.validationRules.tags.maxLength} characters)` };
            }
            
            if (!this.validationRules.tags.allowedChars.test(tag)) {
                return { isValid: false, error: `Tag "${tag}" contains invalid characters` };
            }
        }
        
        return { isValid: true };
    }
    
    /**
     * Validate time format
     * @param {string} time - Time string to validate
     * @returns {object} - Validation result
     */
    validateTime(time) {
        if (!time) {
            return { isValid: true }; // Optional field
        }
        
        if (!this.validationRules.time.format.test(time)) {
            return { isValid: false, error: 'Time must be in HH:MM format (24-hour)' };
        }
        
        return { isValid: true };
    }
    
    /**
     * Validate date format
     * @param {string} date - Date string to validate
     * @returns {object} - Validation result
     */
    validateDate(date) {
        if (!date) {
            return { isValid: false, error: 'Date is required' };
        }
        
        if (!this.validationRules.date.format.test(date)) {
            return { isValid: false, error: 'Date must be in YYYY-MM-DD format' };
        }
        
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return { isValid: false, error: 'Invalid date' };
        }
        
        return { isValid: true };
    }
    
    /**
     * Validate priority value
     * @param {string} priority - Priority to validate
     * @returns {object} - Validation result
     */
    validatePriority(priority) {
        const validPriorities = ['low', 'medium', 'high'];
        
        if (!validPriorities.includes(priority)) {
            return { isValid: false, error: 'Priority must be low, medium, or high' };
        }
        
        return { isValid: true };
    }
    
    /**
     * Validate complete task object
     * @param {object} task - Task object to validate
     * @returns {object} - Validation result
     */
    validateTask(task) {
        const validations = [
            this.validateTaskText(task.text),
            this.validateDate(task.date),
            this.validateTime(task.time),
            this.validatePriority(task.priority),
            this.validateTags(task.tags || [])
        ];
        
        for (const validation of validations) {
            if (!validation.isValid) {
                return validation;
            }
        }
        
        return { isValid: true };
    }
    
    /**
     * Safely set innerHTML with sanitization
     * @param {HTMLElement} element - Element to update
     * @param {string} content - Content to set
     */
    safeSetInnerHTML(element, content) {
        if (!element || typeof content !== 'string') {
            return;
        }
        
        element.innerHTML = this.sanitizeContent(content);
    }
    
    /**
     * Safely set text content
     * @param {HTMLElement} element - Element to update
     * @param {string} content - Content to set
     */
    safeSetTextContent(element, content) {
        if (!element) {
            return;
        }
        
        element.textContent = content || '';
    }
    
    /**
     * Create secure event handler with validation
     * @param {Function} handler - Original event handler
     * @returns {Function} - Wrapped secure handler
     */
    secureEventHandler(handler) {
        return (event) => {
            try {
                // Basic event validation
                if (!event || typeof event !== 'object') {
                    console.warn('Invalid event object');
                    return;
                }
                
                // Call original handler
                return handler(event);
            } catch (error) {
                console.error('Error in event handler:', error);
                
                // Prevent error from bubbling up
                if (event && event.preventDefault) {
                    event.preventDefault();
                }
                if (event && event.stopPropagation) {
                    event.stopPropagation();
                }
            }
        };
    }
}

// Initialize global security utils
window.securityUtils = new SecurityUtils();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityUtils;
}