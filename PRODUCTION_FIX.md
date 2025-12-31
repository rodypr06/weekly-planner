# Production Authentication Fix - task.rodytech.ai

## Date
December 31, 2025

## Issues Found

### 1. Static File Path Errors
**Console Errors:**
```
auth.js:1 Uncaught SyntaxError: Unexpected token '<'
auth-ui.js:1 Uncaught SyntaxError: Unexpected token '<'
manifest.json:1 GET https://task.rodytech.ai/manifest.json 404 (Not Found)
```

**Root Cause:**
- HTML files referenced `auth.js` and `auth-ui.js` without the `/public/` prefix
- Files were located in `public/` directory but HTML was looking at root
- Express static middleware was serving from `__dirname` (project root)
- Requests to `/auth.js` returned 404 HTML error pages instead of JavaScript

### 2. Service Worker Cache Failures
**Console Error:**
```
sw.js:1 Uncaught (in promise) TypeError: Failed to execute 'addAll' on 'Cache': Request failed
```

**Root Cause:**
- Service worker trying to cache `/manifest.json` and other files at wrong paths
- `cache.addAll()` fails completely if any single file fails to load
- No error handling for individual file cache failures

### 3. Form Submission in URL
The URL showed credentials: `?email=rrabelo1%40proton.me&password=Rodmac11%21`
- This indicates the login form was submitting as GET instead of being handled by JavaScript
- `auth-ui.js` wasn't loading, so form submission wasn't being intercepted

## Solution Implemented

### 1. Fixed Static File Paths
**Files Modified:**
- `index.html` and `public/index.html`

**Changes:**
```html
<!-- Before -->
<script src="auth.js"></script>
<script src="auth-ui.js" defer></script>
<link rel="manifest" href="/manifest.json">

<!-- After -->
<script src="/public/auth.js"></script>
<script src="/public/auth-ui.js" defer></script>
<link rel="manifest" href="/public/manifest.json">
```

### 2. Improved Service Worker Error Handling
**File:** `public/sw.js` and `sw.js`

**Changes:**
- Updated all cached file paths to include `/public/` prefix
- Changed from `cache.addAll()` to `Promise.allSettled()` with individual `cache.add()` calls
- Now logs failed cache attempts instead of breaking installation
- Added network-first strategy for API requests (don't cache API responses)
- Better error handling for network failures

**Key Improvements:**
```javascript
// Before: Fails completely if one file fails
cache.addAll(urlsToCache)

// After: Logs errors but continues with other files
Promise.allSettled(
  urlsToCache.map(url => cache.add(url).catch(err => {
    console.log('Failed to cache:', url, err);
  }))
)
```

### 3. Server Restart
- Restarted PM2 process: `pm2 restart weekly-planner`
- Server now serving updated HTML and service worker
- Static files now accessible at correct paths

## Verification

### Local Testing
```bash
# Test auth.js accessibility
curl -I http://localhost:2324/public/auth.js
# ✅ HTTP/1.1 200 OK

# Test manifest.json accessibility  
curl -I http://localhost:2324/public/manifest.json
# ✅ HTTP/1.1 200 OK
```

### Production Testing
After the fix, users should:
1. **Hard refresh the browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear site data** in DevTools (Application → Storage → Clear site data)
3. **Verify in Console** - No more "Unexpected token '<'" errors
4. **Test login** - Should work without URL query parameters

## Files Changed

```
index.html                  (updated auth.js paths)
public/index.html          (updated auth.js paths)
public/sw.js               (fixed paths + better error handling)
sw.js                      (copy of updated service worker)
```

## Git Commit
```bash
commit 6edc61c
Fix production static file paths

- Update HTML to use /public/ prefix for auth.js, auth-ui.js, and manifest.json
- Update service worker with correct paths and better error handling
- Use Promise.allSettled to prevent cache failures from breaking SW installation
- Add network-first strategy for API requests
```

## System Configuration

### Server
- **Process**: PM2 running `server-sqlite.js`
- **Port**: 2324 (internal)
- **Database**: SQLite (tasks.db, sessions.db)
- **Auth**: Session-based with bcrypt

### Nginx
- **Config**: `/etc/nginx/sites-available/weekly-planner.conf`
- **Port**: 8080 (proxies to localhost:2324)
- **Domain**: task.rodytech.ai
- **SSL**: Managed by reverse proxy (assumed)

### Static Files
- **Strategy**: Express static middleware serves from `__dirname` (project root)
- **Structure**: 
  - `index.html` at root
  - `public/` directory contains auth.js, manifest.json, icons, etc.
  - All public files accessible via `/public/*` path

## Expected Results

### After Browser Refresh
1. ✅ No "Unexpected token '<'" errors in console
2. ✅ auth.js and auth-ui.js load successfully
3. ✅ manifest.json loads (no 404)
4. ✅ Service worker installs without cache errors
5. ✅ Login form handled by JavaScript (no URL parameters)
6. ✅ Authentication works correctly

### User Experience
- Login redirects properly
- Session persists across page reloads
- No continuous redirect loops
- Tasks load after authentication

## Troubleshooting

If issues persist after fix:

### 1. Check Browser Cache
```
DevTools → Application → Storage → Clear site data
```

### 2. Verify Service Worker
```
DevTools → Application → Service Workers
Should show: weekly-planner-v3-sqlite (activated)
```

### 3. Check Network Requests
```
DevTools → Network → Filter: JS
Verify /public/auth.js returns 200 OK
Verify Content-Type: application/javascript
```

### 4. Check Server Logs
```bash
pm2 logs weekly-planner --lines 50
```

### 5. Restart Server if Needed
```bash
pm2 restart weekly-planner
pm2 logs weekly-planner
```

## Related Documentation
- `AUTHENTICATION_FIX.md` - Service worker cache issue (local development)
- `MIGRATION_SQLITE.md` - Database migration details
- `WARP.md` - Complete project documentation

## Notes
- The CDN Tailwind warning in console is a separate issue (not affecting functionality)
- AudioContext warnings are expected (Tone.js audio initialization)
- Consider building Tailwind CSS for production to remove CDN warning
