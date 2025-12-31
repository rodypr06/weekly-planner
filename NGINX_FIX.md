# Nginx Configuration Fix - API Routing

## Date
December 31, 2025

## Critical Issue: API Routes Returning 404

### Error Symptoms
```
POST https://task.rodytech.ai/api/login 404 (Not Found)
Login error: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
/api/me:1 Failed to load resource: the server responded with a status of 401 ()
```

### Root Cause
The nginx configuration file had a **conflicting location block**:

```nginx
# This was BREAKING the application
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;
    add_header Cache-Control "public, no-transform";
}
```

**Why this broke everything:**

1. **API Routes Failed**: 
   - Request: `POST /api/login`
   - Nginx saw `.../login` and didn't match the regex
   - But internal nginx routing tried to find `/api/login.js`
   - No `proxy_pass` in that block → nginx looked on local filesystem
   - File not found → returned nginx's default 404 HTML page
   - Browser tried to parse HTML as JSON → "Unexpected token '<'"

2. **Static Files Failed**:
   - Request: `GET /public/auth.js`
   - Matched the `~* \.js$` regex
   - No `proxy_pass` → nginx looked in its default web root
   - File not found → returned 404 HTML page
   - Browser tried to execute HTML as JavaScript → "Unexpected token '<'"

### The Fix

**Removed the conflicting location block** and let ALL requests proxy to Node.js:

```nginx
server {
    listen 8080;
    server_name _;

    # Proxy ALL requests to Node.js
    # Let Express handle static files AND API routes
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

        # Security headers (with 'always' flag)
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Content-Security-Policy "default-src 'self' https: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data:; font-src 'self' https: data:;" always;
    }

    # Gzip compression (added application/json)
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
    gzip_disable "MSIE [1-6]\.";
}
```

### Why This Works

1. **Single Location Block**: All requests go through `location /`
2. **Proxy Everything**: Node.js/Express handles routing decisions
3. **Express Static Middleware**: Already configured to serve static files with proper caching
4. **Express API Routes**: Handle authentication and data operations
5. **Simpler Configuration**: Nginx is just a reverse proxy, not a file server

### Changes Made

1. **Updated** `/etc/nginx/sites-available/weekly-planner.conf`
2. **Tested** configuration: `sudo nginx -t`
3. **Reloaded** nginx: `sudo systemctl reload nginx`
4. **Verified** API works: `curl http://localhost:8080/api/me`
5. **Updated** repo file `weekly-planner.conf` for documentation

### Verification

#### Before Fix
```bash
curl http://localhost:8080/api/me
# Returns: HTML 404 page (<!DOCTYPE html>...)
```

#### After Fix
```bash
curl http://localhost:8080/api/me
# Returns: {"error":"Authentication required"}  ✅ JSON response!
```

### Deployment Steps Taken

```bash
# 1. Update nginx config
sudo nano /etc/nginx/sites-available/weekly-planner.conf

# 2. Test configuration
sudo nginx -t

# 3. Reload nginx (no downtime)
sudo systemctl reload nginx

# 4. Verify
curl http://localhost:8080/api/me
curl http://localhost:8080/public/auth.js
```

### Expected Results

After clearing browser cache:

1. ✅ **API Endpoints Work**
   - `/api/login` returns JSON responses
   - `/api/me` returns authentication status
   - `/api/tasks` returns task data

2. ✅ **Static Files Load**
   - `/public/auth.js` loads as JavaScript
   - `/public/manifest.json` loads as JSON
   - No more "Unexpected token '<'" errors

3. ✅ **Authentication Works**
   - Login form submits via JavaScript (no URL params)
   - Session cookies persist
   - No redirect loops

### Common Nginx Anti-Patterns to Avoid

❌ **Don't** create separate location blocks for file extensions when using a Node.js proxy:
```nginx
# BAD - Conflicts with proxy
location ~* \.(js|css)$ {
    expires 30d;
}
```

✅ **Do** let the application server handle routing:
```nginx
# GOOD - Simple proxy
location / {
    proxy_pass http://localhost:3000;
}
```

❌ **Don't** try to serve static files directly from nginx when your app already handles them:
```nginx
# BAD - App serves these files
location /static/ {
    root /var/www/;
}
```

✅ **Do** let your Node.js Express static middleware handle caching:
```javascript
// GOOD - Express handles caching
app.use(express.static(__dirname, {
    maxAge: '7d',
    etag: true
}));
```

### Related Issues Fixed

This nginx fix also resolves:
- Icon loading failures (`/icons/icon-144x144.png`)
- Manifest loading failures (`/manifest.json`)
- Any other static asset 404 errors

### Monitoring

Check nginx logs if issues persist:
```bash
# Access log
sudo tail -f /var/log/nginx/access.log

# Error log  
sudo tail -f /var/log/nginx/error.log

# Check nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t
```

### Files Changed

- `/etc/nginx/sites-available/weekly-planner.conf` (production)
- `weekly-planner.conf` (repository documentation)

### Git Commit

```bash
commit c383d28
Fix nginx configuration for API routing

The previous nginx config had a conflicting location block that tried
to serve .js files directly instead of proxying to Node.js.
```

### Architecture Summary

```
Browser → HTTPS (SSL) → Reverse Proxy (e.g. Cloudflare/Load Balancer)
                              ↓
                         Nginx :8080 (This machine)
                              ↓
                    Node.js/Express :2324
                              ↓
                    SQLite (tasks.db, sessions.db)
```

**Nginx's Role**: Simple reverse proxy that forwards ALL requests to Node.js
**Express's Role**: Handle routing, static files, API endpoints, authentication

### Next Steps

Users should:
1. **Hard refresh browser** (Ctrl+Shift+R)
2. **Clear site data** in DevTools
3. **Try logging in** - should work now!

### Troubleshooting

If API still returns 404:
1. Check nginx is running: `sudo systemctl status nginx`
2. Check nginx config is correct: `cat /etc/nginx/sites-available/weekly-planner.conf`
3. Check Node.js is running: `pm2 list`
4. Check logs: `pm2 logs weekly-planner`
5. Test locally: `curl http://localhost:2324/api/me`
6. Test through nginx: `curl http://localhost:8080/api/me`

### Documentation

- Complete fix timeline: `PRODUCTION_FIX.md`
- Service worker issues: `AUTHENTICATION_FIX.md`
- Project documentation: `WARP.md`
