# Weekly Planner - Warp AI Agent Context

## Project Overview
**Smart Planner** is a production-ready Progressive Web App (PWA) for AI-powered task management built with vanilla JavaScript. Recently migrated from Supabase/PostgreSQL to SQLite with local session-based authentication for simplified deployment.

- **Repository**: https://github.com/rodypr06/weekly-planner
- **Version**: 1.0.0
- **Author**: RodyTech LLC
- **Server Port**: 2324 (default)
- **License**: ISC

## Current Architecture

### Backend Stack
- **Runtime**: Node.js with Express 5.1.0
- **Database**: SQLite (better-sqlite3) with session store
- **Authentication**: Local session-based auth with bcrypt password hashing
- **Security**: Helmet, rate limiting, CSRF protection, input validation
- **Process Manager**: PM2 (ecosystem.config.js)

### Frontend Stack
- **Framework**: Vanilla JavaScript (no framework dependencies)
- **Styling**: Tailwind CSS, custom glassmorphism effects
- **UI Libraries**: Font Awesome, canvas-confetti, Tone.js
- **PWA**: Service Worker, manifest.json, offline support
- **Mobile**: Fully responsive with touch optimization

### AI Integration
- **Provider**: Google Gemini 2.0 Flash Exp
- **Features**: Task suggestions, emoji generation
- **API Key**: Required via GEMINI_API_KEY environment variable

## Project Structure

```
weekly-planner/
├── server-sqlite.js              # Main SQLite server entry point
├── server.js                     # Legacy/Supabase server (deprecated)
├── server-dev.js                 # Development server
├── index.html                    # Root HTML (may redirect to public/)
├── package.json                  # Dependencies and scripts
├── ecosystem.config.js           # PM2 configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── vercel.json                   # Vercel deployment config (limited for SQLite)
│
├── database/
│   ├── setup/
│   │   ├── sqlite-setup.sql     # SQLite schema initialization
│   │   └── supabase-*.sql       # Legacy Supabase schemas
│   ├── migrations/              # Database migration scripts
│   └── tests/                   # SQL test scripts
│
├── middleware/
│   ├── auth-adapter.js          # Authentication abstraction layer
│   ├── database-adapter.js      # Database abstraction layer
│   ├── rate-limiters.js         # Rate limiting configuration
│   ├── security.js              # Security middleware
│   ├── cache.js                 # Caching middleware
│   └── server-setup.js          # Express app setup
│
├── routes/
│   ├── auth.js                  # Authentication endpoints
│   ├── tasks.js                 # Task CRUD endpoints
│   ├── ai.js                    # AI/Gemini proxy endpoints
│   └── reminders.js             # Reminder management endpoints
│
├── utils/
│   ├── logger.js                # Logging utility
│   └── crypto-utils.js          # Cryptography utilities
│
├── scripts/
│   └── init-sqlite-db.js        # SQLite database initialization
│
├── public/
│   ├── index.html               # Main application HTML
│   ├── auth.js                  # Frontend authentication module
│   ├── auth-ui.js               # Authentication UI components
│   ├── dom-utils.js             # DOM manipulation utilities
│   ├── error-handler.js         # Frontend error handling
│   ├── logger.js                # Frontend logging
│   ├── notification-manager.js  # Notification system
│   ├── reminder-ui.js           # Reminder UI components
│   ├── mobile-navigation.js     # Mobile navigation handler
│   ├── mobile-responsive.css    # Mobile-specific styles
│   ├── magicui-effects.js       # UI animation effects
│   ├── magicui-styles.css       # Custom UI styles
│   ├── theme-switcher.css       # Dark/light theme styles
│   ├── touch-optimization.js    # Touch gesture optimization
│   ├── viewport-fix.js          # Viewport handling fixes
│   ├── security-utils.js        # Frontend security utilities
│   ├── sw.js                    # Service Worker
│   ├── manifest.json            # PWA manifest
│   ├── vendor/                  # Vendored dependencies
│   ├── icons/                   # PWA icons
│   └── webfonts/                # Font Awesome fonts
│
├── docs/
│   ├── operations/              # Production readiness, performance
│   ├── guides/                  # Migration, security, mobile guides
│   ├── analysis/                # Code analysis reports
│   ├── archives/                # Archived documentation
│   └── fixes/                   # Bug fix documentation
│
├── .serena/
│   └── memories/                # AI assistant session memories
│
├── tests/                       # Test files
├── src/
│   └── input.css                # Tailwind input CSS
│
├── tasks.db                     # SQLite tasks database
├── sessions.db                  # SQLite sessions database
├── tasks.db.backup.*            # Database backups
│
├── MIGRATION_SQLITE.md          # SQLite migration documentation
├── CLEANUP_SUMMARY.md           # Cleanup documentation
├── CLEANUP_RECOMMENDATIONS.md   # Cleanup recommendations
├── README.md                    # Project README
└── CLAUDE.md                    # Claude AI context file
```

## Database Schema (SQLite)

### users
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `name` TEXT NOT NULL
- `email` TEXT UNIQUE NOT NULL
- `password_hash` TEXT NOT NULL
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### tasks
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `user_id` INTEGER NOT NULL (FK → users.id)
- `date` DATE NOT NULL
- `text` TEXT NOT NULL
- `emoji` TEXT
- `time` TEXT
- `priority` TEXT DEFAULT 'medium' (low/medium/high)
- `tags` TEXT (JSON array)
- `completed` INTEGER DEFAULT 0 (boolean)
- `archived` INTEGER DEFAULT 0 (boolean)
- `position` INTEGER DEFAULT 0 (for drag-and-drop ordering)
- `reminder_minutes` INTEGER DEFAULT 0
- `reminder_enabled` INTEGER DEFAULT 0
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### reminders
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `task_id` INTEGER NOT NULL (FK → tasks.id)
- `user_id` INTEGER NOT NULL (FK → users.id)
- `reminder_time` DATETIME NOT NULL
- `notification_sent` INTEGER DEFAULT 0
- `enabled` INTEGER DEFAULT 1
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### feedback
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `user_id` INTEGER (FK → users.id, nullable for anonymous)
- `name` TEXT NOT NULL
- `email` TEXT NOT NULL
- `feedback_type` TEXT NOT NULL (bug/feature/general/other)
- `subject` TEXT NOT NULL
- `message` TEXT NOT NULL
- `status` TEXT DEFAULT 'new' (new/in_progress/resolved/closed)
- `priority` TEXT DEFAULT 'medium' (low/medium/high/critical)
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### notification_preferences
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `user_id` INTEGER UNIQUE NOT NULL (FK → users.id)
- `notifications_enabled` INTEGER DEFAULT 1
- `default_reminder_minutes` INTEGER DEFAULT 30
- `sound_enabled` INTEGER DEFAULT 1
- `browser_notifications` INTEGER DEFAULT 1
- `email_notifications` INTEGER DEFAULT 0
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP

## API Endpoints

### Authentication
- `POST /api/register` - User registration (name, email, password)
- `POST /api/login` - User login (email, password)
- `POST /api/logout` - User logout (destroys session)
- `GET /api/me` - Get current authenticated user

### Tasks
- `GET /api/tasks?date=YYYY-MM-DD` - Get tasks for specific date
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete single task
- `DELETE /api/tasks` - Bulk delete tasks (body: { ids: [...] })
- `POST /api/tasks/archive` - Archive tasks (body: { ids: [...] })
- `POST /api/tasks/unarchive` - Unarchive tasks (body: { ids: [...] })

### AI
- `POST /api/gemini` - Proxy to Google Gemini API for task suggestions

### Reminders
- `GET /api/reminders` - Get all reminders for authenticated user
- `POST /api/reminders` - Create reminder
- `PUT /api/reminders/:id` - Update reminder
- `DELETE /api/reminders/:id` - Delete reminder

## Environment Variables

### Required
- `GEMINI_API_KEY` - Google Gemini API key for AI features

### Optional
- `SESSION_SECRET` - Session signing secret (default: 'weekly-planner-secret-key-change-in-production')
- `PORT` - Server port (default: 2324)
- `NODE_ENV` - Environment mode (development/production)

### Legacy (Supabase - No Longer Used)
- `SUPABASE_URL` - Deprecated
- `SUPABASE_ANON_KEY` - Deprecated
- `SUPABASE_SERVICE_ROLE_KEY` - Deprecated

## NPM Scripts

```bash
npm start              # Start production server (server.js)
npm run dev            # Start development server (server-dev.js)
npm run build          # Build CSS and assets
npm run build:css      # Build Tailwind CSS
npm test               # Run tests (not implemented)
```

## Development Workflow

### Setup
```bash
# Clone repository
git clone https://github.com/rodypr06/weekly-planner.git
cd weekly-planner

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and add GEMINI_API_KEY

# Initialize SQLite database
node scripts/init-sqlite-db.js

# Generate PWA icons
node generate-icons.js

# Start development server
npm run dev
```

### Starting the Server
```bash
# Development (with auto-reload)
npm run dev

# Production (direct)
npm start

# Production (with PM2)
pm2 start ecosystem.config.js
pm2 logs weekly-planner
pm2 restart weekly-planner
pm2 stop weekly-planner
```

### Database Management
```bash
# Initialize/reset database
node scripts/init-sqlite-db.js

# Access SQLite database
sqlite3 tasks.db
sqlite3 sessions.db

# Common SQLite commands
.tables                    # List tables
.schema users              # Show table schema
SELECT * FROM users;       # Query data
.quit                      # Exit
```

## Key Features

### Task Management
- Weekly calendar view with drag-and-drop reordering
- Priority levels (low, medium, high)
- Task tagging system
- Task archiving and bulk operations
- Emoji icons for tasks
- Time-based task scheduling
- Task completion tracking

### AI Features
- AI-powered task suggestions (Google Gemini 2.0)
- Automatic emoji generation for tasks
- Natural language task parsing

### Authentication & Security
- Session-based authentication with bcrypt
- Rate limiting (general, auth, AI endpoints)
- Helmet security headers
- CSRF protection
- Input validation (express-validator)
- XSS protection (DOMPurify)

### UI/UX
- Glassmorphism design with smooth animations
- Dark/light theme toggle
- Fully responsive mobile design
- Touch gesture optimization
- Confetti celebrations on task completion
- Sound effects (Tone.js)
- Offline support via Service Worker

### Notifications & Reminders
- Browser push notifications
- Task reminders with configurable timing
- Notification preferences per user
- Sound notifications

## Deployment

### SQLite Local/VM Deployment (Recommended)
```bash
# Setup with PM2 and Nginx
pm2 start server-sqlite.js --name weekly-planner
pm2 startup
pm2 save

# Nginx reverse proxy configuration example
# Proxy to http://localhost:2324
```

### Vercel Deployment (Limited)
⚠️ **SQLite is not suitable for Vercel** due to:
- Serverless stateless nature (no persistent filesystem)
- Read-only filesystem in Lambda functions
- Database file cannot persist between invocations

For Vercel deployment, consider migrating back to Supabase or another cloud database.

## Recent Changes (SQLite Migration)

### Completed
✅ Migrated from Supabase/PostgreSQL to SQLite
✅ Implemented local session-based authentication
✅ Created database adapters for abstraction
✅ Added bcrypt password hashing
✅ Preserved all table structures and features
✅ Updated frontend authentication (auth.js, auth-ui.js)
✅ Created initialization scripts
✅ Tested authentication and CRUD operations

### Removed
❌ Supabase SDK and dependencies
❌ Supabase authentication
❌ PostgreSQL connection logic

### Files to Note
- `server-sqlite.js` - Current active server
- `server.js` - Legacy Supabase server (may be removed)
- `public/supabase-auth.js` - Legacy auth (kept for reference)
- `.env.example` - Still contains Supabase vars (should be updated)

## Testing

### Manual Testing
```bash
# Test authentication
curl -X POST http://localhost:2324/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

curl -X POST http://localhost:2324/api/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123"}'

curl -X GET http://localhost:2324/api/me \
  -b cookies.txt

# Test tasks
curl -X GET "http://localhost:2324/api/tasks?date=2025-12-31" \
  -b cookies.txt
```

### Automated Testing
Currently no automated test suite implemented. Tests are located in:
- `test-security.js` - Security testing utilities
- `database/tests/` - SQL test scripts

## Troubleshooting

### Common Issues
1. **Database locked**: Close other SQLite connections
2. **Session not persisting**: Check SESSION_SECRET and session store
3. **AI features not working**: Verify GEMINI_API_KEY is set
4. **Port 2324 in use**: Change PORT environment variable or kill process
5. **Permission issues**: Check file permissions on *.db files

### Debug Mode
```bash
# Enable debug logging
NODE_ENV=development npm run dev

# Check server logs
pm2 logs weekly-planner

# Check database
sqlite3 tasks.db "SELECT * FROM users;"
```

## Code Style & Conventions

### Backend
- Use `const` over `let` where possible
- Async/await for database operations
- Middleware pattern for authentication and security
- Adapter pattern for database and auth abstraction
- Comprehensive error handling with try-catch

### Frontend
- Vanilla JavaScript (ES6+)
- No framework dependencies
- Module pattern for organization
- Event delegation for dynamic content
- Mobile-first responsive design

### Database
- Snake_case for column names
- Timestamps on all tables (created_at, updated_at)
- Foreign key constraints enforced
- Indexes on frequently queried columns

## Important Notes for AI Agents

1. **Active Server**: Use `server-sqlite.js` as the main entry point
2. **Database**: SQLite databases are in the root directory (tasks.db, sessions.db)
3. **Authentication**: Session-based with bcrypt (no JWT or Supabase)
4. **Deployment**: Not suitable for Vercel with current SQLite implementation
5. **Legacy Code**: Some Supabase-related code still exists but is not active
6. **Port**: Default port 2324 (not 3000 or 8080)
7. **AI Integration**: Requires valid GEMINI_API_KEY environment variable
8. **Documentation**: Check docs/ folder for detailed guides and reports

## Related Documentation

- `MIGRATION_SQLITE.md` - Detailed migration documentation
- `CLEANUP_SUMMARY.md` - Cleanup actions performed
- `CLEANUP_RECOMMENDATIONS.md` - Further cleanup suggestions
- `README.md` - User-facing project documentation
- `CLAUDE.md` - Claude AI context file
- `docs/guides/SECURITY.md` - Security guidelines
- `docs/operations/PRODUCTION_CHECKLIST.md` - Production deployment checklist

## Future Enhancements

See `CLEANUP_RECOMMENDATIONS.md` and `.serena/memories/enhancement_recommendations.md` for detailed suggestions including:
- Automated testing suite
- Database migration system
- Email notifications
- Calendar integration
- Analytics dashboard
- Docker containerization
- CI/CD pipeline
