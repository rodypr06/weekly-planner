// File: server-sqlite.js
// SQLite implementation using consolidated shared modules

const logger = require('./utils/logger');
const { createDatabaseAdapter } = require('./middleware/database-adapter');
const { createAuthAdapter } = require('./middleware/auth-adapter');
const { generalLimiter, authLimiter, aiLimiter } = require('./middleware/rate-limiters');
const { setupExpressApp, setupHomeRoute, setupGracefulShutdown } = require('./middleware/server-setup');
const { createTaskRoutes } = require('./routes/tasks');
const { createAIRoutes } = require('./routes/ai');
const { createAuthRoutes } = require('./routes/auth');

const PORT = 2324;

// Create adapters
const dbAdapter = createDatabaseAdapter('sqlite', {
    dbPath: 'tasks.db'
});

const authAdapter = createAuthAdapter('session', {
    secret: process.env.SESSION_SECRET || 'weekly-planner-secret-key-change-in-production',
    sessionsDbPath: 'sessions.db',
    dbAdapter // Pass database adapter for user operations
});

// Setup Express app with basic security
const app = setupExpressApp({
    enableAdvancedSecurity: false,
    enableCompression: true,
    generalLimiter,
    staticDir: __dirname
});

// Setup authentication middleware (session-based)
authAdapter.setupMiddleware(app);

// Setup home route
setupHomeRoute(app, {
    enableAdvancedSecurity: false,
    staticDir: __dirname
});

// Rate limiters object for routes
const rateLimiters = {
    generalLimiter,
    authLimiter,
    aiLimiter
};

// Setup routes
app.use('/api', createAuthRoutes(authAdapter, rateLimiters));
app.use('/api/tasks', createTaskRoutes(dbAdapter, authAdapter, rateLimiters));
app.use('/api', createAIRoutes(authAdapter, rateLimiters));

// Start server
const server = app.listen(PORT, () => {
    logger.log(`Server is running on port ${PORT}`);
    logger.log('Using SQLite for database and session-based authentication');
});

// Setup graceful shutdown
setupGracefulShutdown(server);