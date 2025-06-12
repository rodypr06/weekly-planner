// File: server.js

const express = require('express');
const path = require('path');
const fetch = require('node-fetch'); // Make sure to install this: npm install node-fetch@2

const app = express();
const PORT = 2324;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Serve index.html for all routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// The secure endpoint your frontend will call
app.post('/api/gemini', async (req, res) => {
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
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
