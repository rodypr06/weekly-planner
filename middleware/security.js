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
            .matches(/^[a-zA-Z0-9\s\-_.,!?():'"@#$%&+=\u00C0-\u017F\u0100-\u017F\u1E00-\u1EFF\u2000-\u206F\u2070-\u209F\u20A0-\u20CF\u2100-\u214F\u2150-\u218F]*$/)
            .withMessage('Task text contains invalid characters'),
            
        body('emoji')
            .optional()
            .isLength({ max: 10 })
            .withMessage('Emoji must be 10 characters or less')
            .matches(/^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}]|[\u{2194}-\u{2199}]|[\u{21A9}-\u{21AA}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23EC}]|[\u{23F0}]|[\u{23F3}]|[\u{25FD}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2705}]|[\u{270A}-\u{270B}]|[\u{2728}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2795}-\u{2797}]|[\u{27B0}]|[\u{27BF}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F171}]|[\u{1F17E}-\u{1F17F}]|[\u{1F18E}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|[\u{1F201}-\u{1F202}]|[\u{1F21A}]|[\u{1F22F}]|[\u{1F232}-\u{1F23A}]|[\u{1F250}-\u{1F251}]|[\u{1F300}-\u{1F320}]|[\u{1F32D}-\u{1F335}]|[\u{1F337}-\u{1F37C}]|[\u{1F37E}-\u{1F393}]|[\u{1F3A0}-\u{1F3CA}]|[\u{1F3CF}-\u{1F3D3}]|[\u{1F3E0}-\u{1F3F0}]|[\u{1F3F4}]|[\u{1F3F8}-\u{1F43E}]|[\u{1F440}]|[\u{1F442}-\u{1F4FC}]|[\u{1F4FF}-\u{1F53D}]|[\u{1F54B}-\u{1F54E}]|[\u{1F550}-\u{1F567}]|[\u{1F57A}]|[\u{1F595}-\u{1F596}]|[\u{1F5A4}]|[\u{1F5FB}-\u{1F64F}]|[\u{1F680}-\u{1F6C5}]|[\u{1F6CC}]|[\u{1F6D0}-\u{1F6D2}]|[\u{1F6EB}-\u{1F6EC}]|[\u{1F6F4}-\u{1F6F6}]|[\u{1F910}-\u{1F918}]|[\u{1F919}-\u{1F91E}]|[\u{1F920}-\u{1F927}]|[\u{1F930}]|[\u{1F933}-\u{1F93A}]|[\u{1F93C}-\u{1F93E}]|[\u{1F940}-\u{1F945}]|[\u{1F947}-\u{1F94B}]|[\u{1F950}-\u{1F95E}]|[\u{1F95F}-\u{1F96B}]|[\u{1F980}-\u{1F997}]|[\u{1F9C0}]|[\u{1F9D0}-\u{1F9E6}]|[\u{200D}]|[\u{20E3}]|[\u{FE0F}]*$/u)
            .withMessage('Invalid emoji format'),
            
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
            .matches(/^[a-zA-Z0-9\s\-_.,!?():'"@#$%&+=\u00C0-\u017F\u0100-\u017F\u1E00-\u1EFF\u2000-\u206F\u2070-\u209F\u20A0-\u20CF\u2100-\u214F\u2150-\u218F]*$/)
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