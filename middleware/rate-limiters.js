// File: middleware/rate-limiters.js
// Centralized rate limiting configurations

const rateLimit = require('express-rate-limit');

/**
 * General rate limiter for all requests
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Authentication rate limiter (stricter)
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: 'Too many authentication attempts, please try again after 15 minutes',
    skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * AI/Gemini API rate limiter
 */
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each IP to 50 AI requests per hour
    message: 'Too many AI requests, please try again after an hour',
});

/**
 * Task operations rate limiter
 */
const taskLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 task operations per minute
    message: 'Too many task operations, please slow down',
});

/**
 * Feedback submission rate limiter
 */
const feedbackLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 feedback submissions per hour
    message: 'Too many feedback submissions, please try again after an hour',
});

/**
 * Bulk operations rate limiter
 */
const bulkOperationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Limit each IP to 10 bulk operations per 5 minutes
    message: 'Too many bulk operations, please try again after 5 minutes',
});

/**
 * Create custom rate limiter with specified options
 * @param {Object} options - Rate limiting options
 * @returns {Function} Rate limiter middleware
 */
const createCustomLimiter = (options) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000,
        max: options.max || 100,
        message: options.message || 'Too many requests',
        standardHeaders: options.standardHeaders !== false,
        legacyHeaders: options.legacyHeaders === true,
        skipSuccessfulRequests: options.skipSuccessfulRequests === true,
        ...options
    });
};

module.exports = {
    generalLimiter,
    authLimiter,
    aiLimiter,
    taskLimiter,
    feedbackLimiter,
    bulkOperationLimiter,
    createCustomLimiter
};