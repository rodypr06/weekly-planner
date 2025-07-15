# Weekly Planner - Project Overview

## Project Purpose
**Weekly Planner** is an AI-powered task management Progressive Web App (PWA) with a liquid glass UI design. It combines modern web technologies with AI integration (Google Gemini API) to create an elegant task planning experience with multi-user authentication and advanced task management capabilities.

## Key Features
- **Liquid Glass UI** with glassmorphism effects and backdrop blur
- **AI-Powered Task Suggestions** using Google Gemini 2.0 Flash API
- **Multi-User Authentication** with bcryptjs password hashing
- **Progressive Web App** with offline functionality and service worker
- **SQLite Database** with better-sqlite3 for data persistence
- **Responsive Design** optimized for mobile, tablet, and desktop
- **Task Management** with priorities, tags, time scheduling, and archiving
- **Celebration Animations** with confetti effects and sound feedback

## Technology Stack
### Backend
- **Node.js** with Express.js framework (v5.1.0)
- **SQLite** database with better-sqlite3 (v11.10.0) 
- **bcryptjs** (v3.0.2) for secure password hashing
- **express-session** (v1.18.1) for session management
- **Google Gemini AI API** integration via node-fetch

### Frontend
- **Vanilla JavaScript** (ES6+) with modern APIs
- **Tailwind CSS** via CDN for responsive styling
- **Inter Font** from Google Fonts for typography
- **Font Awesome** v6.4.0 for icons
- **Canvas Confetti** v1.9.2 for celebration effects
- **Tone.js** v14.7.77 for audio effects

### Deployment & Infrastructure
- **PM2** process manager for production
- **GitHub Actions** for CI/CD automation
- **Nginx** reverse proxy configuration
- **SSL/HTTPS** ready setup

## File Structure Overview
```
weekly-planner/
├── server.js              # Express server with API endpoints
├── index.html             # Main application UI (SPA)
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker for offline functionality
├── ecosystem.config.js    # PM2 configuration
├── generate-icons.js      # PWA icon generator using Canvas API
├── weekly-planner.conf    # Nginx configuration
├── tasks.db              # SQLite database file
├── sessions.db           # Session storage database
├── .github/workflows/deploy.yml  # CI/CD pipeline
└── icons/                # Generated PWA icons (72px to 512px)
```

## Database Schema
```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,           -- YYYY-MM-DD format
    text TEXT NOT NULL,           -- Task description
    emoji TEXT NOT NULL,          -- AI-generated emoji
    time TEXT,                    -- Optional HH:MM format
    priority TEXT NOT NULL,       -- 'low', 'medium', 'high'
    tags TEXT,                    -- Comma-separated tags
    completed INTEGER DEFAULT 0,  -- Boolean (0/1)
    archived INTEGER DEFAULT 0,   -- Boolean (0/1)
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## Production Deployment
- **Port**: 2324 (default, configurable via PORT env var)
- **Environment Variables**: GEMINI_API_KEY, SESSION_SECRET, NODE_ENV
- **PM2 Process Management**: Single instance with 1GB memory limit
- **GitHub Actions**: Automated deployment on main branch push
- **Server Requirements**: Node.js 18+, PM2, Nginx for reverse proxy