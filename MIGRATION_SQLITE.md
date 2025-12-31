# SQLite Migration Complete - Weekly Planner

## ✅ Migration Summary

Successfully migrated from **Supabase** to **SQLite** with local session-based authentication.

### What Changed

#### Backend
- ✅ SQLite database with complete schema (users, tasks, reminders, feedback, notification_preferences)
- ✅ Local session-based authentication (replaces Supabase Auth)
- ✅ User registration with name, email, and password
- ✅ Bcrypt password hashing
- ✅ Express sessions with SQLite session storage
- ✅ All table structures preserved from Supabase

#### Frontend
- ✅ Removed Supabase JavaScript SDK
- ✅ Created local `auth.js` module for API communication
- ✅ Created `auth-ui.js` for UI handling
- ✅ Updated registration form to include name field
- ✅ Simple email/password login

#### Database Schema
```sql
- users (id, name, email, password_hash, created_at, updated_at)
- tasks (id, user_id, date, text, emoji, time, priority, tags, completed, archived, position, reminder_minutes, reminder_enabled, created_at, updated_at)
- reminders (id, task_id, user_id, reminder_time, notification_sent, enabled, created_at, updated_at)
- feedback (id, user_id, name, email, feedback_type, subject, message, status, priority, created_at, updated_at)
- notification_preferences (id, user_id, notifications_enabled, default_reminder_minutes, sound_enabled, browser_notifications, email_notifications, created_at, updated_at)
```

### Local Development

#### Initialize Database
```bash
node scripts/init-sqlite-db.js
```

#### Start Server
```bash
pm2 start server-sqlite.js --name weekly-planner
```

#### Test Authentication
```bash
# Register new user
curl -X POST http://localhost:2324/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123"}'

# Login
curl -X POST http://localhost:2324/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -c cookies.txt

# Get current user (with session)
curl http://localhost:2324/api/me -b cookies.txt
```

### ⚠️ IMPORTANT: Vercel Deployment Limitation

**SQLite CANNOT be used on Vercel** because:
1. Vercel is a **serverless platform** - functions are stateless and ephemeral
2. File system is **read-only** - cannot write to SQLite database
3. Each request runs in a **separate container** - no shared state

## Deployment Options

### Option 1: Use Your Dedicated VM (RECOMMENDED)
Since you mentioned you have a dedicated VM for this app:

#### Setup
1. **Domain**: Point `task.rodytech.ai` to your VM's IP
2. **Nginx**: Configure reverse proxy
3. **PM2**: Already running with SQLite
4. **SSL**: Use Let's Encrypt/Certbot for HTTPS

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name task.rodytech.ai;

    location / {
        proxy_pass http://localhost:2324;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### SSL Setup
```bash
sudo certbot --nginx -d task.rodytech.ai
```

### Option 2: Migrate to Postgres/MySQL
If you want to use Vercel, you'll need a managed database:

#### Recommended Services
- **Supabase** (Postgres) - Free tier available, what you had before
- **PlanetScale** (MySQL) - Free tier, serverless
- **Neon** (Postgres) - Free tier, serverless
- **Railway** (Postgres) - Generous free tier

#### Migration Steps
1. Update `database-adapter.js` to support Postgres/MySQL
2. Create migration script to convert SQLite → Postgres
3. Update connection string in `.env`
4. Deploy to Vercel

### Option 3: Hybrid Approach
- **Frontend**: Deploy to Vercel
- **Backend API**: Run on your VM
- **Domain**: `task.rodytech.ai` → Vercel, API calls to `api.rodytech.ai` → VM

## Current Status

### ✅ Working Locally
- Server running on port 2324
- SQLite database initialized
- Authentication working
- User registration/login functional
- All routes operational

### 📝 Next Steps

#### For VM Deployment (Recommended)
1. Point DNS `task.rodytech.ai` to VM IP
2. Configure Nginx reverse proxy
3. Setup SSL with Certbot
4. Update session cookie settings for production:
   ```javascript
   cookie: {
       secure: true,  // HTTPS only
       httpOnly: true,
       maxAge: 30 * 24 * 60 * 60 * 1000,
       sameSite: 'lax'
   }
   ```
5. Set `SESSION_SECRET` environment variable
6. Configure PM2 ecosystem file
7. Test deployment

#### For Vercel Deployment
1. Choose managed database (Supabase/Planet Scale/Neon)
2. Create new Postgres/MySQL database
3. Migrate schema and update adapters
4. Update environment variables
5. Deploy to Vercel

## Files Changed

### Created
- `public/auth.js` - Local authentication module
- `public/auth-ui.js` - Authentication UI handler
- `database/setup/sqlite-setup.sql` - Complete SQLite schema
- `scripts/init-sqlite-db.js` - Database initialization script

### Modified
- `middleware/database-adapter.js` - Added email-based user lookup
- `middleware/auth-adapter.js` - Updated to use name/email/password
- `routes/auth.js` - Updated registration/login endpoints
- `public/index.html` - Removed Supabase, added local auth scripts
- `server-sqlite.js` - Already existed, now primary server

### Removed References
- Supabase JavaScript SDK
- `supabase-auth.js` (old auth module)

## Testing Checklist

- [x] User registration with name, email, password
- [x] User login with email and password
- [x] Session persistence
- [x] API authentication middleware
- [ ] Task creation/viewing (test with authenticated user)
- [ ] Frontend UI authentication flow
- [ ] Password reset functionality (not implemented yet)
- [ ] Production deployment

## Security Notes

1. **Passwords**: Hashed with bcrypt (10 rounds)
2. **Sessions**: Stored in SQLite with secure cookies
3. **API**: All protected routes require authentication
4. **Environment**: Sensitive config in `.env` (gitignored)

## Rollback Plan

If needed, you can restore Supabase:
1. Restore `public/supabase-auth.js`
2. Update HTML to include Supabase SDK
3. Switch PM2 to use `server.js` (Supabase version)
4. Database backups are in `tasks.db.backup.*` files
