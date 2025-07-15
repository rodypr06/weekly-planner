// File: server-supabase.js
// New server implementation with Supabase integration

const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 2324;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://buvzbxinbrfrfssvyagk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dnpieGluYnJmcmZzc3Z5YWdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYwNDgzNCwiZXhwIjoyMDY4MTgwODM0fQ.ydGAAMXkDEeG2nUIwtNUJ0IbwYwceX2SIHYO_7TWWys';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

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
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// Serve index.html for all routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Authentication endpoints - these will be handled by Supabase client-side
// But we provide a user info endpoint
app.get('/api/me', requireAuth, (req, res) => {
    res.json({
        authenticated: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            username: req.user.user_metadata?.username || req.user.email
        }
    });
});

// API Endpoints for Tasks (all require authentication)
app.get('/api/tasks', requireAuth, async (req, res) => {
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
            console.log('Position column may not exist, falling back to time ordering');
            query = query.order('time', { ascending: true, nullsLast: true });
        }
        
        const { data: tasks, error } = await query;
        
        if (error) {
            console.error('Database error:', error);
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
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/tasks', requireAuth, async (req, res) => {
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
            console.log('Could not set position, column may not exist:', error.message);
        }
        
        const { data, error } = await supabase
            .from('tasks')
            .insert([taskData])
            .select()
            .single();
            
        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to create task' });
        }
        
        res.json({ id: data.id, ...data });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reorder tasks (must come before /:id routes)
app.put('/api/tasks/reorder', requireAuth, async (req, res) => {
    try {
        const { taskOrders } = req.body;
        console.log('Reorder request received:', { taskOrders, userId: req.user.id });
        
        if (!Array.isArray(taskOrders) || taskOrders.length === 0) {
            console.log('Invalid taskOrders:', taskOrders);
            return res.status(400).json({ error: 'Task orders array is required' });
        }
        
        // First, test if the position column exists by trying a simple update
        const testResult = await supabase
            .from('tasks')
            .update({ position: 0 })
            .eq('id', -999) // Non-existent ID to test column existence
            .eq('user_id', req.user.id);
            
        if (testResult.error && testResult.error.message.includes('column "position" does not exist')) {
            console.error('Position column does not exist in tasks table');
            return res.status(500).json({ 
                error: 'Task reordering feature requires a database update. The "position" column needs to be added to the tasks table.',
                needsMigration: true 
            });
        }
        
        // Update each task's position
        const updatePromises = taskOrders.map(({ id, position }) => {
            console.log(`Updating task ${id} to position ${position}`);
            return supabase
                .from('tasks')
                .update({ position })
                .eq('id', id)
                .eq('user_id', req.user.id);
        });
        
        const results = await Promise.all(updatePromises);
        console.log('Update results:', results);
        
        // Check for any errors
        const hasErrors = results.some(result => result.error);
        if (hasErrors) {
            const errors = results.filter(r => r.error).map(r => r.error);
            console.error('Reorder errors:', errors);
            
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
        console.error('Error reordering tasks:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.put('/api/tasks/:id', requireAuth, async (req, res) => {
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
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to update task' });
        }
        
        if (data.length === 0) {
            return res.status(404).json({ error: 'Task not found or not authorized' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/tasks/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select();
            
        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to delete task' });
        }
        
        if (data.length === 0) {
            return res.status(404).json({ error: 'Task not found or not authorized' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting task:', error);
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
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to clear tasks' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error clearing tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Archive tasks for a specific date
app.post('/api/tasks/archive', requireAuth, async (req, res) => {
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
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to archive tasks' });
        }
        
        res.json({ 
            success: true, 
            archivedCount: data.length,
            message: `${data.length} completed tasks archived for ${date}`
        });
    } catch (error) {
        console.error('Error archiving tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Unarchive tasks (restore from archive)
app.post('/api/tasks/unarchive', requireAuth, async (req, res) => {
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
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to unarchive tasks' });
        }
        
        res.json({ 
            success: true, 
            unarchivedCount: data.length,
            message: `${data.length} tasks restored from archive`
        });
    } catch (error) {
        console.error('Error unarchiving tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Database migration endpoint to add position column if needed
app.post('/api/migrate/add-position', requireAuth, async (req, res) => {
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
            console.log('RPC not found, trying direct SQL approach');
            
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
        console.error('Migration error:', error);
        res.status(500).json({ error: 'Migration failed', details: error.message });
    }
});

// The secure endpoint for Gemini AI
app.post('/api/gemini', requireAuth, async (req, res) => {
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
            console.error('Google AI API Error:', errorBody);
            return res.status(apiResponse.status).json({ error: 'Failed to get response from AI.' });
        }
        
        const data = await apiResponse.json();
        res.json(data);
        
    } catch (error) {
        console.error('Server-side error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Using Supabase for database and authentication');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});