// File: middleware/auth-adapter.js
// Authentication abstraction layer to support both SQLite sessions and Supabase JWT

const logger = require('../utils/logger');

/**
 * Authentication adapter factory
 * @param {string} type - 'session' or 'jwt'
 * @param {Object} config - Authentication configuration
 * @returns {Object} Authentication adapter instance
 */
function createAuthAdapter(type, config) {
    switch (type.toLowerCase()) {
        case 'session':
            return new SessionAuthAdapter(config);
        case 'jwt':
            return new JWTAuthAdapter(config);
        default:
            throw new Error(`Unsupported authentication type: ${type}`);
    }
}

/**
 * Session-based Authentication Adapter (for SQLite)
 */
class SessionAuthAdapter {
    constructor(config) {
        this.type = 'session';
        this.config = config;
        this.dbAdapter = config.dbAdapter;
    }

    /**
     * Setup session middleware
     * @param {Object} app - Express app instance
     */
    setupMiddleware(app) {
        const session = require('express-session');
        const Database = require('better-sqlite3');
        const SqliteStore = require('better-sqlite3-session-store')(session);

        // Create sessions database
        const sessionsDb = new Database(this.config.sessionsDbPath || 'sessions.db');

        // Session configuration with persistent storage
        app.use(session({
            store: new SqliteStore({
                client: sessionsDb,
                expired: {
                    clear: true,
                    intervalMs: 900000 // Clear expired sessions every 15 minutes
                }
            }),
            secret: this.config.secret || 'weekly-planner-secret-key-change-in-production',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: false, // Set to true in production with HTTPS
                httpOnly: true,
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            }
        }));
    }

    /**
     * Authentication middleware
     */
    requireAuth() {
        return (req, res, next) => {
            if (req.session && req.session.userId) {
                req.user = { id: req.session.userId };
                next();
            } else {
                res.status(401).json({ error: 'Authentication required' });
            }
        };
    }

    /**
     * Register a new user
     */
    async register(username, password) {
        try {
            const bcrypt = require('bcryptjs');
            
            // Check if user already exists
            const existingUser = await this.dbAdapter.getUserByUsername(username);
            if (existingUser.data) {
                return { data: null, error: { message: 'Username already exists' } };
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);
            
            // Create user
            const result = await this.dbAdapter.createUser(username, passwordHash);
            
            if (result.error) {
                return { data: null, error: result.error };
            }

            return {
                data: {
                    id: result.data.id,
                    username: result.data.username
                },
                error: null
            };
        } catch (error) {
            logger.error('Session register error:', error);
            return { data: null, error };
        }
    }

    /**
     * Login user
     */
    async login(req, username, password) {
        try {
            const bcrypt = require('bcryptjs');
            
            // Get user from database
            const userResult = await this.dbAdapter.getUserByUsername(username);
            
            if (userResult.error || !userResult.data) {
                return { data: null, error: { message: 'Invalid username or password' } };
            }

            const user = userResult.data;

            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!isValidPassword) {
                return { data: null, error: { message: 'Invalid username or password' } };
            }

            // Set session
            req.session.userId = user.id;

            return {
                data: {
                    id: user.id,
                    username: user.username
                },
                error: null
            };
        } catch (error) {
            logger.error('Session login error:', error);
            return { data: null, error };
        }
    }

    /**
     * Logout user
     */
    async logout(req) {
        try {
            if (req.session) {
                req.session.destroy((err) => {
                    if (err) {
                        logger.error('Session destroy error:', err);
                    }
                });
            }
            return { data: { success: true }, error: null };
        } catch (error) {
            logger.error('Session logout error:', error);
            return { data: null, error };
        }
    }

    /**
     * Get current user info
     */
    async getCurrentUser(req) {
        if (req.user) {
            return {
                data: {
                    authenticated: true,
                    user: {
                        id: req.user.id,
                        username: req.user.username || `user_${req.user.id}`
                    }
                },
                error: null
            };
        }
        return { data: null, error: { message: 'Not authenticated' } };
    }
}

/**
 * JWT-based Authentication Adapter (for Supabase)
 */
class JWTAuthAdapter {
    constructor(config) {
        this.type = 'jwt';
        this.config = config;
        this.supabase = config.supabase;
    }

    /**
     * Setup authentication middleware (no session middleware needed for JWT)
     */
    setupMiddleware(app) {
        // JWT doesn't need session middleware
        // Authentication is handled per-request via Bearer tokens
    }

    /**
     * Authentication middleware
     */
    requireAuth() {
        return async (req, res, next) => {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            
            const token = authHeader.substring(7);
            
            try {
                const { data: { user }, error } = await this.supabase.auth.getUser(token);
                
                if (error || !user) {
                    return res.status(401).json({ error: 'Invalid token' });
                }
                
                req.user = user;
                next();
            } catch (error) {
                logger.error('JWT auth error details:', {
                    message: error.message,
                    stack: error.stack,
                    authHeader: req.headers.authorization ? 'Present' : 'Missing',
                    userAgent: req.headers['user-agent']
                });
                res.status(401).json({ error: 'Authentication failed' });
            }
        };
    }

    /**
     * Register is handled by Supabase client-side
     */
    async register(username, password) {
        return {
            data: null,
            error: { message: 'Registration is handled client-side with Supabase' }
        };
    }

    /**
     * Login is handled by Supabase client-side
     */
    async login(req, username, password) {
        return {
            data: null,
            error: { message: 'Login is handled client-side with Supabase' }
        };
    }

    /**
     * Logout is handled by Supabase client-side
     */
    async logout(req) {
        return {
            data: { success: true },
            error: null
        };
    }

    /**
     * Get current user info
     */
    async getCurrentUser(req) {
        if (req.user) {
            return {
                data: {
                    authenticated: true,
                    user: {
                        id: req.user.id,
                        email: req.user.email,
                        username: req.user.user_metadata?.username || req.user.email
                    }
                },
                error: null
            };
        }
        return { data: null, error: { message: 'Not authenticated' } };
    }

    /**
     * Get Supabase configuration for client-side
     */
    getClientConfig() {
        return {
            supabaseUrl: this.config.supabaseUrl,
            supabaseAnonKey: this.config.supabaseAnonKey
        };
    }
}

module.exports = {
    createAuthAdapter,
    SessionAuthAdapter,
    JWTAuthAdapter
};