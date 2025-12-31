// File: routes/auth.js
// Common authentication route handlers

const express = require('express');
const logger = require('../utils/logger');

/**
 * Create authentication routes
 * @param {Object} authAdapter - Authentication adapter instance
 * @param {Object} rateLimiters - Rate limiting middlewares
 * @returns {Object} Express router
 */
function createAuthRoutes(authAdapter, rateLimiters) {
    const router = express.Router();
    const requireAuth = authAdapter.requireAuth();

    // Get current user info
    router.get('/me', rateLimiters.authLimiter, requireAuth, async (req, res) => {
        try {
            const result = await authAdapter.getCurrentUser(req);
            
            if (result.error) {
                return res.status(401).json({ error: result.error.message });
            }
            
            res.json(result.data);
        } catch (error) {
            logger.error('Error getting current user:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Configuration endpoint (for Supabase client config)
    if (authAdapter.type === 'jwt' && authAdapter.getClientConfig) {
        router.get('/config', rateLimiters.generalLimiter, (req, res) => {
            try {
                const config = authAdapter.getClientConfig();
                
                if (!config.supabaseUrl || !config.supabaseAnonKey) {
                    return res.status(500).json({ 
                        error: 'Server configuration error: Missing required environment variables' 
                    });
                }
                
                res.json(config);
            } catch (error) {
                logger.error('Error getting auth config:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }

    // Session-based authentication endpoints
    if (authAdapter.type === 'session') {
        // Registration endpoint
        router.post('/register', rateLimiters.authLimiter, async (req, res) => {
            try {
                const { name, email, password } = req.body;

                if (!name || !email || !password) {
                    return res.status(400).json({ error: 'Name, email, and password are required' });
                }

                // Basic email validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return res.status(400).json({ error: 'Invalid email format' });
                }

                // Password strength validation
                if (password.length < 6) {
                    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
                }

                const result = await authAdapter.register(name, email, password);

                if (result.error) {
                    return res.status(400).json({ error: result.error.message });
                }

                // Auto-login after registration
                const loginResult = await authAdapter.login(req, email, password);

                res.json({
                    success: true,
                    message: 'Account created successfully',
                    user: loginResult.data
                });
            } catch (error) {
                logger.error('Registration error:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Login endpoint
        router.post('/login', rateLimiters.authLimiter, async (req, res) => {
            try {
                const { email, password } = req.body;

                if (!email || !password) {
                    return res.status(400).json({ error: 'Email and password are required' });
                }

                const result = await authAdapter.login(req, email, password);

                if (result.error) {
                    return res.status(401).json({ error: result.error.message });
                }

                res.json({
                    success: true,
                    message: 'Login successful',
                    user: result.data
                });
            } catch (error) {
                logger.error('Login error:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Logout endpoint
        router.post('/logout', requireAuth, async (req, res) => {
            try {
                const result = await authAdapter.logout(req);
                
                if (result.error) {
                    return res.status(500).json({ error: result.error.message });
                }
                
                res.json({
                    success: true,
                    message: 'Logout successful'
                });
            } catch (error) {
                logger.error('Logout error:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }

    return router;
}

module.exports = { createAuthRoutes };