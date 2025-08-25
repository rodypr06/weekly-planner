// File: server.js
// Main server entry point - uses Supabase implementation

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

// Setup Express app with advanced security
const app = setupExpressApp({
    enableAdvancedSecurity: true,
    enableCompression: true,
    generalLimiter,
    staticDir: __dirname
});

// Setup authentication middleware
authAdapter.setupMiddleware(app);

// Setup home route with CSP nonce injection
setupHomeRoute(app, {
    enableAdvancedSecurity: true,
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

// Database migration endpoint to add position column if needed
app.post('/api/migrate/add-position', authLimiter, authAdapter.requireAuth(), async (req, res) => {
    try {
        // Only allow this for authenticated users (simple protection)
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Try to add the position column - in PostgreSQL/Supabase this is done via SQL
        // We'll use a raw SQL query to add the column if it doesn't exist
        const { data, error } = await supabase.rpc('add_position_column_if_not_exists');
        
        if (error) {
            // If the RPC doesn't exist, let's try a direct approach
            logger.log('RPC not found, trying direct SQL approach');
            
            // Try to add column using a simple update that will fail if column doesn't exist
            const testResult = await supabase
                .from('tasks')
                .update({ position: 0 })
                .eq('id', -999); // Non-existent ID, just to test if column exists
                
            if (testResult.error && testResult.error.message.includes('column "position" does not exist')) {
                return res.status(500).json({ 
                    error: 'Position column needs to be added to the database. Please contact the administrator.',
                    needsMigration: true 
                });
            }
        }
        
        res.json({ success: true, message: 'Migration completed or not needed' });
    } catch (error) {
        logger.error('Migration error:', error);
        res.status(500).json({ error: 'Migration failed', details: error.message });
    }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    logger.log(`Server is running on port ${PORT}`);
    logger.log('Using Supabase for database and authentication');
});

// Setup graceful shutdown
setupGracefulShutdown(server);