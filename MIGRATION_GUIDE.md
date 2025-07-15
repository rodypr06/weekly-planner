# Supabase Migration Guide for Weekly Planner

## Overview
This guide explains how to migrate the Weekly Planner application from local SQLite storage to Supabase (PostgreSQL) with cloud authentication and deployment to Vercel.

## Migration Steps

### 1. Setup Supabase Database

1. **Run the SQL setup in Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the content from `supabase-setup.sql`
   - Execute the SQL to create tables and policies

2. **Verify database setup:**
   - Check that the `tasks` table is created
   - Verify Row Level Security (RLS) is enabled
   - Confirm the policy "Users can manage their own tasks" is active

### 2. Update Environment Variables

1. **Create `.env` file from example:**
   ```bash
   cp .env.example .env
   ```

2. **Update your `.env` file with actual values:**
   - Set your actual `GEMINI_API_KEY`
   - Verify Supabase credentials are correct
   - Set `NODE_ENV=production` for production deployment

### 3. Update Frontend Authentication

**Option A: Update existing HTML file**
1. Add Supabase CDN script to your `index.html`:
   ```html
   <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
   <script src="supabase-auth.js"></script>
   ```

2. Replace authentication logic with Supabase calls:
   - Replace `checkAuth()` function with `SupabaseAuth.checkAuth()`
   - Update login form handler to use `SupabaseAuth.login()`
   - Update register form handler to use `SupabaseAuth.register()`
   - Update logout handler to use `SupabaseAuth.logout()`
   - Replace all API calls with `ApiClient` methods

**Option B: Use provided authentication module**
- Include `supabase-auth.js` in your HTML
- Initialize Supabase on page load
- Update event handlers to use the new authentication methods

### 4. Switch to New Server

1. **Backup current server:**
   ```bash
   cp server.js server-sqlite-backup.js
   ```

2. **Replace server with Supabase version:**
   ```bash
   cp server-supabase.js server.js
   ```

3. **Test locally:**
   ```bash
   npm start
   ```

### 5. Deploy to Vercel

1. **Prepare for Vercel deployment:**
   ```bash
   # Create public directory for static files
   mkdir public
   cp index.html public/
   cp manifest.json public/
   cp sw.js public/
   cp supabase-auth.js public/
   cp -r icons public/
   ```

2. **Update package.json for Vercel:**
   ```bash
   cp package-vercel.json package.json
   ```

3. **Deploy to Vercel:**
   ```bash
   # Install Vercel CLI if not already installed
   npm i -g vercel
   
   # Deploy
   vercel
   ```

4. **Set environment variables in Vercel:**
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `GEMINI_API_KEY`: Your Google Gemini API key

## Key Changes Made

### Database Schema Changes
- **Users table**: Now handled by Supabase Auth (no manual user table)
- **Tasks table**: Updated with UUID foreign key to auth.users
- **Sessions**: No longer needed (handled by Supabase Auth)

### Authentication Changes
- **From**: Express sessions with bcrypt
- **To**: Supabase Auth with JWT tokens
- **Benefits**: Built-in email verification, password reset, social auth support

### API Changes
- **Authentication**: JWT tokens in Authorization header instead of session cookies
- **User management**: Supabase handles user creation, verification, password resets
- **Database operations**: Supabase client instead of better-sqlite3

### Frontend Changes
- **Authentication state**: Managed by Supabase Auth
- **API calls**: Include JWT tokens in headers
- **User flow**: Email-based registration with optional confirmation

## Testing Checklist

- [ ] Database tables created successfully in Supabase
- [ ] User registration works with email/password
- [ ] User login works and maintains session
- [ ] User logout clears session properly
- [ ] Tasks CRUD operations work for authenticated users
- [ ] AI features work with new authentication
- [ ] Archive/unarchive functionality works
- [ ] Application deploys successfully to Vercel
- [ ] All environment variables are properly set
- [ ] PWA installation still works

## Rollback Plan

If issues arise, you can rollback by:

1. **Restore original server:**
   ```bash
   cp server-sqlite-backup.js server.js
   ```

2. **Restore original package.json:**
   ```bash
   git checkout package.json
   ```

3. **Remove Supabase dependencies:**
   ```bash
   npm uninstall @supabase/supabase-js
   ```

## Security Considerations

- **API Keys**: Never expose service role keys in frontend code
- **Row Level Security**: Ensures users can only access their own data
- **JWT Tokens**: Automatically expire and can be refreshed
- **Environment Variables**: Properly secured in Vercel deployment

## Performance Benefits

- **Cloud Database**: Better performance and scalability than local SQLite
- **CDN Deployment**: Faster global access via Vercel's edge network
- **Automatic Backups**: Supabase handles database backups automatically
- **Connection Pooling**: Built-in PostgreSQL connection pooling

## Support

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Review Vercel function logs
3. Verify environment variables are set correctly
4. Ensure RLS policies are properly configured
5. Check that the JWT token is being passed correctly in API calls