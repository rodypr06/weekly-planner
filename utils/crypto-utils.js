// File: utils/crypto-utils.js
// Cryptographic utilities for security features

const crypto = require('crypto');

/**
 * Generate a cryptographically secure random nonce for CSP
 * @returns {string} Base64 encoded nonce
 */
const generateCSPNonce = () => {
    return crypto.randomBytes(32).toString('base64');
};

/**
 * Generate a secure random token
 * @param {number} length - Length of the token in bytes (default: 32)
 * @returns {string} Hex encoded token
 */
const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a secure hash of the given data
 * @param {string} data - Data to hash
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {string} Hex encoded hash
 */
const generateHash = (data, algorithm = 'sha256') => {
    return crypto.createHash(algorithm).update(data).digest('hex');
};

/**
 * Validate input against common patterns used in XSS attacks
 * @param {string} input - Input to validate
 * @returns {object} Validation result with isValid and threat details
 */
const validateAgainstXSS = (input) => {
    if (typeof input !== 'string') {
        return { isValid: false, threat: 'non_string_input' };
    }
    
    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
        /javascript:/gi, // JavaScript protocol
        /on\w+\s*=/gi, // Event handlers (onclick, onload, etc.)
        /<iframe\b[^>]*>/gi, // iframes
        /<object\b[^>]*>/gi, // Object tags
        /<embed\b[^>]*>/gi, // Embed tags
        /<form\b[^>]*>/gi, // Form tags
        /data:(?!image\/[^;]+;base64,)[^,]*,/gi, // Non-image data URIs
        /vbscript:/gi, // VBScript protocol
        /<svg\b[^>]*onload\s*=/gi, // SVG with onload
        /expression\s*\(/gi, // CSS expression
        /url\s*\(\s*javascript:/gi, // CSS javascript URL
    ];
    
    for (let i = 0; i < xssPatterns.length; i++) {
        if (xssPatterns[i].test(input)) {
            return { 
                isValid: false, 
                threat: 'xss_pattern_detected',
                pattern: i,
                sample: input.substring(0, 50) + (input.length > 50 ? '...' : '')
            };
        }
    }
    
    return { isValid: true };
};

/**
 * Validate input for SQL injection patterns
 * @param {string} input - Input to validate
 * @returns {object} Validation result
 */
const validateAgainstSQLi = (input) => {
    if (typeof input !== 'string') {
        return { isValid: false, threat: 'non_string_input' };
    }
    
    const sqliPatterns = [
        /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
        /(\b(or|and)\b\s+\d+\s*=\s*\d+)/gi, // 1=1, 1=0 type injections
        /(';\s*(drop|delete|update|insert))/gi, // Quote escape attempts
        /(\/\*|\*\/|--|\#)/g, // SQL comment patterns
        /(\bxp_cmdshell\b|\bsp_executesql\b)/gi, // SQL Server specific
        /(\'\s+(or|and)\s+\'\w*\'\s*=\s*\'\w*\')/gi, // 'OR'a'='a type patterns
        /(\'\s+(or|and)\s+\'\w+\'\s*=\s*\'\w+)/gi, // ' OR 'a'='a patterns
        /(\d+\'\s+(or|and)\s+\'\d*\'\s*=\s*\'\d*)/gi, // 1'OR'1'='1 patterns
        /(\'\s*(or|and)\s*\d+\s*=\s*\d+)/gi, // 'OR 1=1 patterns
    ];
    
    for (let i = 0; i < sqliPatterns.length; i++) {
        if (sqliPatterns[i].test(input)) {
            return { 
                isValid: false, 
                threat: 'sqli_pattern_detected',
                pattern: i,
                sample: input.substring(0, 50) + (input.length > 50 ? '...' : '')
            };
        }
    }
    
    return { isValid: true };
};

/**
 * Rate limiting token bucket implementation
 */
class TokenBucket {
    constructor(capacity, refillRate, refillPeriod = 1000) {
        this.capacity = capacity;
        this.tokens = capacity;
        this.refillRate = refillRate;
        this.refillPeriod = refillPeriod;
        this.lastRefill = Date.now();
    }
    
    consume(tokens = 1) {
        this._refill();
        if (this.tokens >= tokens) {
            this.tokens -= tokens;
            return true;
        }
        return false;
    }
    
    _refill() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        const tokensToAdd = Math.floor(elapsed / this.refillPeriod) * this.refillRate;
        
        if (tokensToAdd > 0) {
            this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
            this.lastRefill = now;
        }
    }
}

module.exports = {
    generateCSPNonce,
    generateSecureToken,
    generateHash,
    validateAgainstXSS,
    validateAgainstSQLi,
    TokenBucket
};