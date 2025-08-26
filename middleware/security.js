// File: middleware/security.js
// Security middleware for input validation and XSS protection

const { body, validationResult, query, param } = require('express-validator');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const logger = require('../utils/logger');

// Initialize DOMPurify with jsdom for server-side use
const window = new JSDOM('').window;
const purify = DOMPurify(window);

/**
 * Sanitizes text content to prevent XSS attacks
 * @param {string} content - The content to sanitize
 * @returns {string} - Sanitized content
 */
const sanitizeContent = (content) => {
    if (typeof content !== 'string') {
        return content;
    }
    
    // Configure DOMPurify to be very strict - only allow plain text
    return purify.sanitize(content, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
    });
};

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Validation errors:', {
            errors: errors.array(),
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        return res.status(400).json({
            error: 'Invalid input data',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: typeof err.value === 'string' && err.value.length > 50 
                    ? err.value.substring(0, 50) + '...' 
                    : err.value
            }))
        });
    }
    next();
};

/**
 * Middleware to sanitize request body data
 */
const sanitizeRequestData = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        const sanitizeObject = (obj) => {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (typeof obj[key] === 'string') {
                        // Sanitize string values
                        obj[key] = sanitizeContent(obj[key]);
                    } else if (Array.isArray(obj[key])) {
                        // Sanitize array elements
                        obj[key] = obj[key].map(item => 
                            typeof item === 'string' ? sanitizeContent(item) : item
                        );
                    } else if (obj[key] && typeof obj[key] === 'object') {
                        // Recursively sanitize nested objects
                        sanitizeObject(obj[key]);
                    }
                }
            }
        };
        
        sanitizeObject(req.body);
    }
    next();
};

// Validation rules for task data
const taskValidationRules = () => {
    return [
        body('date')
            .isISO8601({ strict: true })
            .withMessage('Date must be in YYYY-MM-DD format')
            .custom((value) => {
                const date = new Date(value);
                const now = new Date();
                const oneYearFromNow = new Date();
                oneYearFromNow.setFullYear(now.getFullYear() + 1);
                
                if (date < new Date(now.getFullYear() - 1, 0, 1) || date > oneYearFromNow) {
                    throw new Error('Date must be within a reasonable range');
                }
                return true;
            }),
            
        body('text')
            .trim()
            .isLength({ min: 1, max: 500 })
            .withMessage('Task text must be between 1 and 500 characters')
            .matches(/^[a-zA-Z0-9\s\-_.,!?():'"@#$%&+={}[\]\\/`~*^|<>\u00C0-\u017F\u0100-\u017F\u1E00-\u1EFF\u2000-\u206F\u2070-\u209F\u20A0-\u20CF\u2100-\u214F\u2150-\u218F\u1F600-\u1F64F\u1F300-\u1F5FF\u1F680-\u1F6FF\u1F700-\u1F77F\u1F780-\u1F7FF\u1F800-\u1F8FF\u2600-\u26FF\u2700-\u27BF]*$/)
            .withMessage('Task text contains invalid characters'),
            
        body('emoji')
            .optional()
            .isLength({ max: 10 })
            .withMessage('Emoji must be 10 characters or less'),
            
        body('time')
            .optional()
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .withMessage('Time must be in HH:MM format (24-hour)'),
            
        body('priority')
            .isIn(['low', 'medium', 'high'])
            .withMessage('Priority must be low, medium, or high'),
            
        body('tags')
            .optional()
            .custom((value) => {
                if (Array.isArray(value)) {
                    if (value.length > 10) {
                        throw new Error('Maximum 10 tags allowed');
                    }
                    for (const tag of value) {
                        if (typeof tag !== 'string' || tag.length > 20) {
                            throw new Error('Each tag must be a string with maximum 20 characters');
                        }
                        if (!/^[a-zA-Z0-9\-_\u00C0-\u017F]*$/.test(tag)) {
                            throw new Error('Tags can only contain letters, numbers, hyphens, and underscores');
                        }
                    }
                }
                return true;
            }),
            
        body('completed')
            .optional()
            .isBoolean()
            .withMessage('Completed must be a boolean value'),
            
        body('position')
            .optional()
            .isInt({ min: 0, max: 10000 })
            .withMessage('Position must be a positive integer less than 10000')
    ];
};

// Validation rules for task updates
const taskUpdateValidationRules = () => {
    return [
        param('id')
            .isInt({ min: 1 })
            .withMessage('Task ID must be a positive integer'),
            
        body('text')
            .optional()
            .trim()
            .isLength({ min: 1, max: 500 })
            .withMessage('Task text must be between 1 and 500 characters')
            .matches(/^[a-zA-Z0-9\s\-_.,!?():'"@#$%&+={}[\]\\/`~*^|<>\u00C0-\u017F\u0100-\u017F\u1E00-\u1EFF\u2000-\u206F\u2070-\u209F\u20A0-\u20CF\u2100-\u214F\u2150-\u218F\u1F600-\u1F64F\u1F300-\u1F5FF\u1F680-\u1F6FF\u1F700-\u1F77F\u1F780-\u1F7FF\u1F800-\u1F8FF\u2600-\u26FF\u2700-\u27BF]*$/)
            .withMessage('Task text contains invalid characters'),
            
        body('time')
            .optional()
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .withMessage('Time must be in HH:MM format (24-hour)'),
            
        body('priority')
            .optional()
            .isIn(['low', 'medium', 'high'])
            .withMessage('Priority must be low, medium, or high'),
            
        body('tags')
            .optional()
            .custom((value) => {
                if (Array.isArray(value)) {
                    if (value.length > 10) {
                        throw new Error('Maximum 10 tags allowed');
                    }
                    for (const tag of value) {
                        if (typeof tag !== 'string' || tag.length > 20) {
                            throw new Error('Each tag must be a string with maximum 20 characters');
                        }
                        if (!/^[a-zA-Z0-9\-_\u00C0-\u017F]*$/.test(tag)) {
                            throw new Error('Tags can only contain letters, numbers, hyphens, and underscores');
                        }
                    }
                }
                return true;
            }),
            
        body('completed')
            .optional()
            .isBoolean()
            .withMessage('Completed must be a boolean value'),
            
        body('position')
            .optional()
            .isInt({ min: 0, max: 10000 })
            .withMessage('Position must be a positive integer less than 10000')
    ];
};

// Validation rules for date queries
const dateQueryValidationRules = () => {
    return [
        query('date')
            .isISO8601({ strict: true })
            .withMessage('Date must be in YYYY-MM-DD format')
            .custom((value) => {
                const date = new Date(value);
                const now = new Date();
                const oneYearFromNow = new Date();
                oneYearFromNow.setFullYear(now.getFullYear() + 1);
                
                if (date < new Date(now.getFullYear() - 1, 0, 1) || date > oneYearFromNow) {
                    throw new Error('Date must be within a reasonable range');
                }
                return true;
            }),
            
        query('includeArchived')
            .optional()
            .isIn(['true', 'false'])
            .withMessage('includeArchived must be true or false')
    ];
};

// Validation rules for reorder requests
const reorderValidationRules = () => {
    return [
        body('taskOrders')
            .isArray({ min: 1, max: 100 })
            .withMessage('taskOrders must be an array with 1-100 items')
            .custom((value) => {
                for (const item of value) {
                    if (!item.hasOwnProperty('id') || !item.hasOwnProperty('position')) {
                        throw new Error('Each task order must have id and position properties');
                    }
                    if (!Number.isInteger(item.id) || item.id <= 0) {
                        throw new Error('Task ID must be a positive integer');
                    }
                    if (!Number.isInteger(item.position) || item.position < 0 || item.position > 10000) {
                        throw new Error('Position must be an integer between 0 and 10000');
                    }
                }
                return true;
            })
    ];
};

// Validation rules for AI prompts
const aiPromptValidationRules = () => {
    return [
        body('prompt')
            .trim()
            .isLength({ min: 1, max: 2000 })
            .withMessage('Prompt must be between 1 and 2000 characters')
            .matches(/^[a-zA-Z0-9\s\-_.,!?():'"@#$%&+={}[\]\\/`~*^|<>\u00C0-\u017F\u0100-\u017F\u1E00-\u1EFF\u2000-\u206F\u2070-\u209F\u20A0-\u20CF\u2100-\u214F\u2150-\u218F\u1F600-\u1F64F\u1F300-\u1F5FF\u1F680-\u1F6FF\u1F700-\u1F77F\u1F780-\u1F7FF\u1F800-\u1F8FF\u2600-\u26FF\u2700-\u27BF\n\r]*$/)
            .withMessage('Prompt contains invalid characters')
    ];
};

// Validation rules for archive requests
const archiveValidationRules = () => {
    return [
        body('date')
            .isISO8601({ strict: true })
            .withMessage('Date must be in YYYY-MM-DD format')
    ];
};

// Validation rules for unarchive requests
const unarchiveValidationRules = () => {
    return [
        body('taskIds')
            .isArray({ min: 1, max: 100 })
            .withMessage('taskIds must be an array with 1-100 items')
            .custom((value) => {
                for (const id of value) {
                    if (!Number.isInteger(id) || id <= 0) {
                        throw new Error('All task IDs must be positive integers');
                    }
                }
                return true;
            })
    ];
};

module.exports = {
    sanitizeContent,
    sanitizeRequestData,
    handleValidationErrors,
    taskValidationRules,
    taskUpdateValidationRules,
    dateQueryValidationRules,
    reorderValidationRules,
    aiPromptValidationRules,
    archiveValidationRules,
    unarchiveValidationRules
};