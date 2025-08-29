// File: server-dev.js
// Development server entry point - simplified without strict CSP

// Load environment variables from .env file
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const logger = require('./utils/logger');
const { createDatabaseAdapter } = require('./middleware/database-adapter');
const { createAuthAdapter } = require('./middleware/auth-adapter');
const { generalLimiter, authLimiter, aiLimiter } = require('./middleware/rate-limiters');
const { setupExpressApp, setupHomeRoute, setupGracefulShutdown } = require('./middleware/server-setup');
const { createTaskRoutes } = require('./routes/tasks');
const { createAIRoutes } = require('./routes/ai');
const { createAuthRoutes } = require('./routes/auth');

const PORT = process.env.PORT || 2324;

// Validate required environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create adapters
const dbAdapter = createDatabaseAdapter('supabase', {
    url: supabaseUrl,
    serviceKey: supabaseServiceKey
});

const authAdapter = createAuthAdapter('jwt', {
    supabase,
    supabaseUrl,
    supabaseAnonKey
});

// Setup Express app WITHOUT advanced security for development
const app = setupExpressApp({
    enableAdvancedSecurity: false, // Disable CSP and security headers for dev
    enableCompression: true,
    generalLimiter,
    staticDir: __dirname
});

// Setup home route without CSP nonce injection
setupHomeRoute(app, { enableAdvancedSecurity: false });

// Rate limiters object for routes
const rateLimiters = {
    generalLimiter,
    authLimiter,
    aiLimiter
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        authentication: authAdapter.type,
        environment: 'development',
        security: 'development-mode'
    });
});

// Setup routes
app.use('/api', createAuthRoutes(authAdapter, rateLimiters));
app.use('/api/tasks', createTaskRoutes(dbAdapter, authAdapter, rateLimiters));
app.use('/api', createAIRoutes(authAdapter, rateLimiters));

// Database migration endpoint to add position column if needed
app.post('/api/migrate/add-position', authLimiter, authAdapter.requireAuth(), async (req, res) => {
    try {
        // Only allow this for authenticated users (simple protection)
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Execute migration
        const result = await dbAdapter.executeMigration(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='position') THEN
                    ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0;
                    CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(date, position);
                    UPDATE tasks SET position = id WHERE position IS NULL OR position = 0;
                END IF;
            END $$;
        `);
        
        res.json({ 
            success: true, 
            message: 'Migration completed successfully',
            result 
        });
    } catch (error) {
        logger.error('Migration error:', error);
        res.status(500).json({ error: 'Migration failed', details: error.message });
    }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    logger.log(`🚀 Development Server is running on port ${PORT}`);
    logger.log('📍 Access URLs:');
    logger.log(`   Local: http://localhost:${PORT}`);
    logger.log(`   Network: http://192.168.50.141:${PORT}`);
    logger.log('🔧 Using Supabase for database and authentication');
    logger.log('⚠️  Security: Development mode (no CSP restrictions)');
});

// Setup graceful shutdown
setupGracefulShutdown(server);

module.exports = app;