// File: server-supabase.js
// New server implementation with Supabase integration

const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 2324;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware
app.use(express.json());
// Serve static assets only from the public directory
app.use(express.static(path.join(__dirname, 'public')));

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
        const { date, text, emoji, time, priority, tags, completed } = req.body;
        
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

app.put('/api/tasks/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { text, time, priority, tags, completed } = req.body;
        
        const updateData = {
            text,
            time: time || null,
            priority,
            tags: Array.isArray(tags) ? tags.join(',') : '',
            completed: completed || false
        };
        
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