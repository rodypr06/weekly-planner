// File: server-supabase.js
// New server implementation with Supabase integration

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const logger = require('./utils/logger');
const { generateCSPNonce, validateAgainstXSS, validateAgainstSQLi } = require('./utils/crypto-utils');
const {
    sanitizeRequestData,
    handleValidationErrors,
    taskValidationRules,
    taskUpdateValidationRules,
    dateQueryValidationRules,
    reorderValidationRules,
    aiPromptValidationRules,
    archiveValidationRules,
    unarchiveValidationRules
} = require('./middleware/security');
const { param } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 2324;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limiting configurations
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: 'Too many authentication attempts, please try again after 15 minutes',
    skipSuccessfulRequests: true, // Don't count successful requests
});

const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each IP to 50 AI requests per hour
    message: 'Too many AI requests, please try again after an hour',
});

// Apply general rate limiting to all requests
app.use(generalLimiter);

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

// Compression middleware - compress all responses
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

// Middleware
app.use(express.json({ limit: '10mb' }));

// Static file serving with optimized caching headers
app.use(express.static(__dirname, {
    maxAge: '7d', // Cache static assets for 7 days
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
}));

// Authentication middleware - extract user from Supabase JWT
const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.substring(7);
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        logger.error('Auth error details:', {
            message: error.message,
            stack: error.stack,
            authHeader: req.headers.authorization ? 'Present' : 'Missing',
            userAgent: req.headers['user-agent']
        });
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// Serve index.html for all routes with CSP nonce injection
app.get('/', (req, res) => {
    const fs = require('fs');
    const filePath = path.join(__dirname, 'index.html');
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            logger.error('Error reading index.html:', err);
            return res.status(500).send('Internal Server Error');
        }
        
        // Inject nonce into script tags (for future CSP enforcement)
        // For now, we'll just add it as a data attribute for potential use
        const nonce = req.cspNonce;
        const modifiedHtml = data.replace(
            /<script(?![^>]*nonce)/g, 
            `<script nonce="${nonce}"`
        );
        
        res.setHeader('Content-Type', 'text/html');
        res.send(modifiedHtml);
    });
});

// Authentication endpoints - these will be handled by Supabase client-side
// But we provide a user info endpoint
app.get('/api/me', authLimiter, requireAuth, (req, res) => {
    res.json({
        authenticated: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            username: req.user.user_metadata?.username || req.user.email
        }
    });
});

// Configuration endpoint - serves public Supabase config
app.get('/api/config', generalLimiter, (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ 
            error: 'Server configuration error: Missing required environment variables' 
        });
    }
    
    res.json({
        supabaseUrl,
        supabaseAnonKey
    });
});

// API Endpoints for Tasks (all require authentication)
app.get('/api/tasks', dateQueryValidationRules(), handleValidationErrors, requireAuth, async (req, res) => {
    try {
        const { date, includeArchived } = req.query;
        
        let query = supabase
            .from('tasks')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('date', date);
            
        if (includeArchived !== 'true') {
            query = query.eq('archived', false);
        }
        
        // Order by position first (if available), then by time for backward compatibility
        // Note: If position column doesn't exist, this will fall back to time ordering
        try {
            query = query.order('position', { ascending: true, nullsLast: true })
                         .order('time', { ascending: true, nullsLast: true });
        } catch (error) {
            logger.log('Position column may not exist, falling back to time ordering');
            query = query.order('time', { ascending: true, nullsLast: true });
        }
        
        const { data: tasks, error } = await query;
        
        if (error) {
            logger.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to fetch tasks' });
        }
        
        // Transform data to match frontend expectations
        const transformedTasks = tasks.map(task => ({
            ...task,
            tags: task.tags ? task.tags.split(',') : [],
            completed: Boolean(task.completed),
            archived: Boolean(task.archived)
        }));
        
        res.json(transformedTasks);
    } catch (error) {
        logger.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/tasks', taskValidationRules(), handleValidationErrors, requireAuth, async (req, res) => {
    try {
        const { date, text, emoji, time, priority, tags, completed, position } = req.body;
        
        const taskData = {
            user_id: req.user.id,
            date,
            text,
            emoji,
            time: time || null,
            priority,
            tags: Array.isArray(tags) ? tags.join(',') : '',
            completed: completed || false,
            archived: false
        };
        
        // Try to add position if the column exists
        try {
            let taskPosition = position;
            if (taskPosition === undefined) {
                const { data: existingTasks } = await supabase
                    .from('tasks')
                    .select('position')
                    .eq('user_id', req.user.id)
                    .eq('date', date)
                    .eq('archived', false)
                    .order('position', { ascending: false })
                    .limit(1);
                
                taskPosition = existingTasks && existingTasks.length > 0 ? existingTasks[0].position + 1 : 0;
            }
            taskData.position = taskPosition;
        } catch (error) {
            // Position column might not exist, continue without it
            logger.log('Could not set position, column may not exist:', error.message);
        }
        
        const { data, error } = await supabase
            .from('tasks')
            .insert([taskData])
            .select()
            .single();
            
        if (error) {
            logger.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to create task' });
        }
        
        res.json({ id: data.id, ...data });
    } catch (error) {
        logger.error('Error creating task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reorder tasks (must come before /:id routes)
app.put('/api/tasks/reorder', reorderValidationRules(), handleValidationErrors, requireAuth, async (req, res) => {
    try {
        const { taskOrders } = req.body;
        logger.log('Reorder request received:', { taskOrders, userId: req.user.id });
        
        if (!Array.isArray(taskOrders) || taskOrders.length === 0) {
            logger.log('Invalid taskOrders:', taskOrders);
            return res.status(400).json({ error: 'Task orders array is required' });
        }
        
        // First, test if the position column exists by trying a simple update
        const testResult = await supabase
            .from('tasks')
            .update({ position: 0 })
            .eq('id', -999) // Non-existent ID to test column existence
            .eq('user_id', req.user.id);
            
        if (testResult.error && testResult.error.message.includes('column "position" does not exist')) {
            logger.error('Position column does not exist in tasks table');
            return res.status(500).json({ 
                error: 'Task reordering feature requires a database update. The "position" column needs to be added to the tasks table.',
                needsMigration: true 
            });
        }
        
        // Update each task's position
        const updatePromises = taskOrders.map(({ id, position }) => {
            logger.log(`Updating task ${id} to position ${position}`);
            return supabase
                .from('tasks')
                .update({ position })
                .eq('id', id)
                .eq('user_id', req.user.id);
        });
        
        const results = await Promise.all(updatePromises);
        logger.log('Update results:', results);
        
        // Check for any errors
        const hasErrors = results.some(result => result.error);
        if (hasErrors) {
            const errors = results.filter(r => r.error).map(r => r.error);
            logger.error('Reorder errors:', errors);
            
            // Check if it's a column not found error
            const columnError = errors.find(e => e.message && e.message.includes('column "position" does not exist'));
            if (columnError) {
                return res.status(500).json({ 
                    error: 'Task reordering feature requires a database update. The "position" column needs to be added to the tasks table.',
                    needsMigration: true 
                });
            }
            
            return res.status(500).json({ error: 'Failed to reorder some tasks', details: errors[0].message });
        }
        
        res.json({ success: true, updatedCount: taskOrders.length });
    } catch (error) {
        logger.error('Error reordering tasks:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.put('/api/tasks/:id', taskUpdateValidationRules(), handleValidationErrors, requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { text, time, priority, tags, completed, position } = req.body;
        
        const updateData = {
            text,
            time: time || null,
            priority,
            tags: Array.isArray(tags) ? tags.join(',') : '',
            completed: completed || false
        };
        
        // Only include position in update if it's provided
        if (position !== undefined) {
            updateData.position = position;
        }
        
        const { data, error } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select();
            
        if (error) {
            logger.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to update task' });
        }
        
        if (data.length === 0) {
            return res.status(404).json({ error: 'Task not found or not authorized' });
        }
        
        res.json({ success: true });
    } catch (error) {
        logger.error('Error updating task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/tasks/:id', [param('id').isInt({ min: 1 }).withMessage('Task ID must be a positive integer')], handleValidationErrors, requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select();
            
        if (error) {
            logger.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to delete task' });
        }
        
        if (data.length === 0) {
            return res.status(404).json({ error: 'Task not found or not authorized' });
        }
        
        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/tasks', requireAuth, async (req, res) => {
    try {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('user_id', req.user.id);
            
        if (error) {
            logger.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to clear tasks' });
        }
        
        res.json({ success: true });
    } catch (error) {
        logger.error('Error clearing tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Archive tasks for a specific date
app.post('/api/tasks/archive', archiveValidationRules(), handleValidationErrors, requireAuth, async (req, res) => {
    try {
        const { date } = req.body;
        
        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }
        
        const { data, error } = await supabase
            .from('tasks')
            .update({ archived: true })
            .eq('user_id', req.user.id)
            .eq('date', date)
            .eq('completed', true)
            .select();
            
        if (error) {
            logger.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to archive tasks' });
        }
        
        res.json({ 
            success: true, 
            archivedCount: data.length,
            message: `${data.length} completed tasks archived for ${date}`
        });
    } catch (error) {
        logger.error('Error archiving tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Unarchive tasks (restore from archive)
app.post('/api/tasks/unarchive', unarchiveValidationRules(), handleValidationErrors, requireAuth, async (req, res) => {
    try {
        const { taskIds } = req.body;
        
        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({ error: 'Task IDs array is required' });
        }
        
        const { data, error } = await supabase
            .from('tasks')
            .update({ archived: false })
            .in('id', taskIds)
            .eq('user_id', req.user.id)
            .select();
            
        if (error) {
            logger.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to unarchive tasks' });
        }
        
        res.json({ 
            success: true, 
            unarchivedCount: data.length,
            message: `${data.length} tasks restored from archive`
        });
    } catch (error) {
        logger.error('Error unarchiving tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Database migration endpoint to add position column if needed
app.post('/api/migrate/add-position', authLimiter, requireAuth, async (req, res) => {
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

// The secure endpoint for Gemini AI
app.post('/api/gemini', aiPromptValidationRules(), handleValidationErrors, aiLimiter, requireAuth, async (req, res) => {
    try {
        const { prompt } = req.body;
        
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'API key is not configured on the server.' });
        }
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required.' });
        }
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        };
        
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            logger.error('Google AI API Error:', errorBody);
            return res.status(apiResponse.status).json({ error: 'Failed to get response from AI.' });
        }
        
        const data = await apiResponse.json();
        res.json(data);
        
    } catch (error) {
        logger.error('Server-side error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

const server = app.listen(PORT, '0.0.0.0', () => {
    logger.log(`Server is running on port ${PORT}`);
    logger.log('Using Supabase for database and authentication');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.log('HTTP server closed');
    });
});

process.on('SIGINT', () => {
    logger.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        logger.log('HTTP server closed');
    });
});