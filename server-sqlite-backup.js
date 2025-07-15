// File: server.js

const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);

const app = express();
const PORT = 2324;

// Initialize SQLite database
const db = new Database('tasks.db');

// Create users table if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Create tasks table if it doesn't exist (now with user_id)
db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        text TEXT NOT NULL,
        emoji TEXT NOT NULL,
        time TEXT,
        priority TEXT NOT NULL,
        tags TEXT,
        completed INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
`);

// Add user_id column to existing tasks table if it doesn't exist
try {
    db.exec(`ALTER TABLE tasks ADD COLUMN user_id INTEGER DEFAULT 1`);
} catch (error) {
    // Column already exists, ignore error
    console.log('user_id column already exists or other database issue');
}

// Add archived column to existing tasks table if it doesn't exist
try {
    db.exec(`ALTER TABLE tasks ADD COLUMN archived INTEGER DEFAULT 0`);
} catch (error) {
    // Column already exists, ignore error
    console.log('archived column already exists or other database issue');
}

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Create sessions database
const sessionsDb = new Database('sessions.db');

// Session configuration with persistent storage
app.use(session({
    store: new SqliteStore({
        client: sessionsDb,
        expired: {
            clear: true,
            intervalMs: 900000 // Clear expired sessions every 15 minutes
        }
    }),
    secret: process.env.SESSION_SECRET || 'weekly-planner-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
};

// Serve index.html for all routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Authentication endpoints
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    try {
        // Check if user already exists
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // Create user
        const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
        const result = stmt.run(username, passwordHash);
        
        // Set session
        req.session.userId = result.lastInsertRowid;
        req.session.username = username;
        
        res.json({ 
            success: true, 
            user: { 
                id: result.lastInsertRowid, 
                username 
            } 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    try {
        // Find user
        const user = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.json({ 
            success: true, 
            user: { 
                id: user.id, 
                username: user.username 
            } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ success: true });
    });
});

app.get('/api/me', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            authenticated: true,
            user: {
                id: req.session.userId,
                username: req.session.username
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// API Endpoints for Tasks (all require authentication)
app.get('/api/tasks', requireAuth, (req, res) => {
    const { date, includeArchived } = req.query;
    const archivedFilter = includeArchived === 'true' ? '' : 'AND archived = 0';
    const stmt = db.prepare(`SELECT * FROM tasks WHERE date = ? AND user_id = ? ${archivedFilter}`);
    const tasks = stmt.all(date, req.session.userId);
    res.json(tasks.map(task => ({
        ...task,
        tags: task.tags ? task.tags.split(',') : [],
        completed: Boolean(task.completed),
        archived: Boolean(task.archived)
    })));
});

app.post('/api/tasks', requireAuth, (req, res) => {
    const { date, text, emoji, time, priority, tags, completed } = req.body;
    const stmt = db.prepare(`
        INSERT INTO tasks (id, user_id, date, text, emoji, time, priority, tags, completed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
        Date.now(),
        req.session.userId,
        date,
        text,
        emoji,
        time || null,
        priority,
        tags.join(','),
        completed ? 1 : 0
    );
    res.json({ id: result.lastInsertRowid });
});

app.put('/api/tasks/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { text, time, priority, tags, completed } = req.body;
    const stmt = db.prepare(`
        UPDATE tasks
        SET text = ?, time = ?, priority = ?, tags = ?, completed = ?
        WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(
        text,
        time || null,
        priority,
        tags.join(','),
        completed ? 1 : 0,
        id,
        req.session.userId
    );
    
    if (result.changes === 0) {
        return res.status(404).json({ error: 'Task not found or not authorized' });
    }
    
    res.json({ success: true });
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?');
    const result = stmt.run(id, req.session.userId);
    
    if (result.changes === 0) {
        return res.status(404).json({ error: 'Task not found or not authorized' });
    }
    
    res.json({ success: true });
});

app.delete('/api/tasks', requireAuth, (req, res) => {
    db.prepare('DELETE FROM tasks WHERE user_id = ?').run(req.session.userId);
    res.json({ success: true });
});

// Archive tasks for a specific date
app.post('/api/tasks/archive', requireAuth, (req, res) => {
    const { date } = req.body;
    if (!date) {
        return res.status(400).json({ error: 'Date is required' });
    }
    
    const stmt = db.prepare('UPDATE tasks SET archived = 1 WHERE date = ? AND user_id = ? AND completed = 1');
    const result = stmt.run(date, req.session.userId);
    
    res.json({ 
        success: true, 
        archivedCount: result.changes,
        message: `${result.changes} completed tasks archived for ${date}`
    });
});

// Unarchive tasks (restore from archive)
app.post('/api/tasks/unarchive', requireAuth, (req, res) => {
    const { taskIds } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ error: 'Task IDs array is required' });
    }
    
    const placeholders = taskIds.map(() => '?').join(',');
    const stmt = db.prepare(`UPDATE tasks SET archived = 0 WHERE id IN (${placeholders}) AND user_id = ?`);
    const result = stmt.run(...taskIds, req.session.userId);
    
    res.json({ 
        success: true, 
        unarchivedCount: result.changes,
        message: `${result.changes} tasks restored from archive`
    });
});

// The secure endpoint your frontend will call
app.post('/api/gemini', requireAuth, async (req, res) => {
    // Get the prompt from the client's request
    const { prompt } = req.body;
    
    // IMPORTANT: Your secret API key is stored securely here
    // It is read from an environment variable and is NEVER sent to the browser
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

    try {
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
        // Send the AI's response back to your frontend
        res.json(data);

    } catch (error) {
        console.error('Server-side error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        // Close database connections
        db.close();
        sessionsDb.close();
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        // Close database connections
        db.close();
        sessionsDb.close();
    });
});

/*
--- package.json ---
Create a file named package.json and paste the following content into it.
This file manages your server's dependencies.

{
  "name": "planner-backend",
  "version": "1.0.0",
  "description": "Secure proxy for Gemini API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "node-fetch": "^2.6.7"
  }
}

--- How to Run This Server on Your Linux VM ---
1. Install Node.js if you haven't already.
2. Place `server.js` and `package.json` in a new directory (e.g., `/home/user/planner-backend`).
3. Open a terminal in that directory.
4. Run `npm install` to install the required packages (Express and Node-Fetch).
5. Set the environment variable with your NEW secret API key:
   `export GEMINI_API_KEY="YOUR_NEW_API_KEY_HERE"`
6. Run the server: `node server.js`
7. For production, it's recommended to use a process manager like `pm2` to keep the server running (`pm2 start server.js`).

--- Cloudflare Configuration ---
You will need to adjust your Cloudflare setup to route requests for `/api/` to this new server process (e.g., to `http://localhost:3000`). Your main domain `tasks.rodytech.net` will still point to your `index.html` file.
*/
