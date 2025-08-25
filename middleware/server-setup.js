// File: middleware/server-setup.js
// Common server setup and middleware configuration

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const logger = require('../utils/logger');
const { generateCSPNonce, validateAgainstXSS, validateAgainstSQLi } = require('../utils/crypto-utils');
const { sanitizeRequestData } = require('./security');

/**
 * Setup basic Express app with common middleware
 * @param {Object} options - Configuration options
 * @returns {Object} Configured Express app
 */
function setupExpressApp(options = {}) {
    const app = express();
    
    // Enable trust proxy for proper IP detection behind Nginx
    // Set to 1 to trust the first proxy (Nginx)
    app.set('trust proxy', 1);

    // Apply general rate limiting if provided
    if (options.generalLimiter) {
        app.use(options.generalLimiter);
    }

    // Apply advanced security middleware only if requested
    if (options.enableAdvancedSecurity) {
        setupAdvancedSecurity(app);
    }

    // Basic middleware
    setupBasicMiddleware(app, options);

    return app;
}

/**
 * Setup advanced security middleware (for production/Supabase version)
 */
function setupAdvancedSecurity(app) {
    // Apply Helmet security middleware with custom configuration
    app.use(helmet({
        contentSecurityPolicy: false, // We'll handle CSP manually for more control
        crossOriginEmbedderPolicy: false // Allow embedding for PWA functionality
    }));

    // Generate CSP nonce for each request
    app.use((req, res, next) => {
        req.cspNonce = generateCSPNonce();
        res.locals.cspNonce = req.cspNonce;
        next();
    });

    // Apply input sanitization middleware to all requests
    app.use(sanitizeRequestData);

    // Additional security validation middleware
    app.use((req, res, next) => {
        // Validate request data against common attack patterns
        if (req.body) {
            const validateRequestData = (obj, path = 'body') => {
                for (const key in obj) {
                    if (obj.hasOwnProperty(key) && typeof obj[key] === 'string') {
                        const xssValidation = validateAgainstXSS(obj[key]);
                        if (!xssValidation.isValid) {
                            logger.warn('XSS attempt detected:', {
                                path: `${path}.${key}`,
                                threat: xssValidation.threat,
                                sample: xssValidation.sample,
                                ip: req.ip,
                                userAgent: req.get('User-Agent')
                            });
                            return res.status(400).json({ 
                                error: 'Malicious content detected',
                                field: key
                            });
                        }
                        
                        const sqliValidation = validateAgainstSQLi(obj[key]);
                        if (!sqliValidation.isValid) {
                            logger.warn('SQL injection attempt detected:', {
                                path: `${path}.${key}`,
                                threat: sqliValidation.threat,
                                sample: sqliValidation.sample,
                                ip: req.ip,
                                userAgent: req.get('User-Agent')
                            });
                            return res.status(400).json({ 
                                error: 'Malicious content detected',
                                field: key
                            });
                        }
                    } else if (obj[key] && typeof obj[key] === 'object') {
                        const result = validateRequestData(obj[key], `${path}.${key}`);
                        if (result) return result;
                    }
                }
            };
            
            const validationResult = validateRequestData(req.body);
            if (validationResult) return validationResult;
        }
        
        next();
    });

    // Security headers middleware
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        
        // Content Security Policy with nonce support
        const cspNonce = req.cspNonce;
        const cspDirectives = [
            "default-src 'self'",
            `script-src 'self' 'nonce-${cspNonce}' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com`,
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
            "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
            "img-src 'self' data: https:",
            "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "object-src 'none'",
            "upgrade-insecure-requests"
        ];
        res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
        
        next();
    });
}

/**
 * Setup basic middleware
 */
function setupBasicMiddleware(app, options) {
    // Compression middleware - compress all responses
    if (options.enableCompression !== false) {
        app.use(compression({
            filter: (req, res) => {
                if (req.headers['x-no-compression']) {
                    return false;
                }
                return compression.filter(req, res);
            },
            level: 6, // Good balance between compression and speed
            threshold: 1024 // Only compress responses > 1KB
        }));
    }

    // JSON parsing middleware
    app.use(express.json({ 
        limit: options.jsonLimit || '10mb' 
    }));

    // Static file serving with optimized caching headers
    const staticOptions = {
        maxAge: options.staticMaxAge || '7d', // Cache static assets for 7 days
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.js')) {
                res.setHeader('Content-Type', 'application/javascript');
            }
            
            // Aggressive caching for vendor assets (they have version hashes)
            if (filePath.includes('/vendor/') || filePath.includes('/webfonts/')) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
            }
            
            // Short cache for HTML files (they might change frequently)
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
            }
            
            // Medium cache for CSS and images
            if (filePath.endsWith('.css') || filePath.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)) {
                res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
            }
        }
    };

    app.use(express.static(options.staticDir || __dirname, staticOptions));
}

/**
 * Setup home route with CSP nonce injection (for advanced security)
 */
function setupHomeRoute(app, options = {}) {
    app.get('/', (req, res) => {
        if (options.enableAdvancedSecurity && req.cspNonce) {
            // Advanced version with nonce injection
            const fs = require('fs');
            const filePath = path.join(options.staticDir || __dirname, 'index.html');
            
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    logger.error('Error reading index.html:', err);
                    return res.status(500).send('Internal Server Error');
                }
                
                // Inject nonce into script tags
                const nonce = req.cspNonce;
                const modifiedHtml = data.replace(
                    /<script(?![^>]*nonce)/g, 
                    `<script nonce="${nonce}"`
                );
                
                res.setHeader('Content-Type', 'text/html');
                res.send(modifiedHtml);
            });
        } else {
            // Simple version
            res.sendFile(path.join(options.staticDir || __dirname, 'index.html'));
        }
    });
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(server) {
    const gracefulShutdown = (signal) => {
        logger.log(`${signal} signal received: closing HTTP server`);
        server.close(() => {
            logger.log('HTTP server closed');
        });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

module.exports = {
    setupExpressApp,
    setupAdvancedSecurity,
    setupBasicMiddleware,
    setupHomeRoute,
    setupGracefulShutdown
};