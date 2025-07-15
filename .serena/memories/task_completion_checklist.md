# Task Completion Checklist - Weekly Planner

## When a Coding Task is Completed

### 1. Code Quality Verification
Since this project has no automated testing or linting tools, manual verification is required:

**Frontend Code Check:**
- [ ] Verify glassmorphism UI effects are preserved
- [ ] Check responsive design on mobile, tablet, desktop
- [ ] Test all animations and transitions (300ms standard)
- [ ] Ensure accessibility (keyboard navigation, ARIA labels)
- [ ] Verify PWA functionality (manifest, service worker)

**Backend Code Check:**
- [ ] Verify API endpoints return proper JSON responses
- [ ] Check database operations use prepared statements
- [ ] Ensure proper error handling with try-catch blocks
- [ ] Verify authentication middleware is applied where needed
- [ ] Check session management and security

### 2. Manual Testing Requirements

**Browser Testing:**
```bash
# Test in browser DevTools
# 1. Open http://localhost:2324
# 2. Test user registration/login
# 3. Test task CRUD operations
# 4. Test AI suggestions (requires GEMINI_API_KEY)
# 5. Test PWA installation
# 6. Test offline functionality
# 7. Test responsive design (mobile/tablet/desktop)
```

**API Testing:**
```bash
# Test authentication endpoints
curl -X POST http://localhost:2324/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

curl -X POST http://localhost:2324/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Test task endpoints (requires authentication)
curl http://localhost:2324/api/tasks?date=2024-01-01

# Test AI proxy endpoint
curl -X POST http://localhost:2324/api/gemini \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Generate a task suggestion"}'
```

### 3. Database Integrity Check
```bash
# Verify database schema
sqlite3 tasks.db ".schema"

# Check data integrity
sqlite3 tasks.db "SELECT COUNT(*) FROM tasks;"
sqlite3 tasks.db "SELECT COUNT(*) FROM users;"

# Verify foreign key constraints
sqlite3 tasks.db "PRAGMA foreign_key_check;"
```

### 4. Production Readiness

**Environment Configuration:**
- [ ] GEMINI_API_KEY is set (required for AI features)
- [ ] SESSION_SECRET is configured for production
- [ ] NODE_ENV=production for production deployment
- [ ] Database files have proper permissions

**PM2 Configuration:**
```bash
# Verify PM2 setup
pm2 show weekly-planner
pm2 logs weekly-planner --lines 50

# Check process stability
pm2 restart weekly-planner
# Wait 30 seconds and verify it's still running
pm2 list
```

### 5. PWA Functionality Verification

**Icon Generation:**
```bash
# Ensure icons are generated
node generate-icons.js
ls -la icons/
# Should contain icons from 72x72 to 512x512
```

**Service Worker Check:**
- [ ] Service worker registers successfully
- [ ] Cache storage is populated
- [ ] Offline functionality works
- [ ] App can be installed as PWA

### 6. Performance Verification

**Load Time Check:**
- [ ] Initial page load < 3 seconds
- [ ] Task operations respond quickly
- [ ] AI suggestions load within reasonable time
- [ ] Animations are smooth (60fps)

**Memory Usage:**
```bash
# Check PM2 memory usage
pm2 monit
# Verify application stays under 1GB limit
```

### 7. Security Verification

**Authentication Security:**
- [ ] Passwords are properly hashed (bcryptjs)
- [ ] Sessions use HTTP-only cookies
- [ ] API endpoints require authentication where appropriate
- [ ] SQL injection protection via prepared statements

**API Key Security:**
- [ ] GEMINI_API_KEY is not exposed in frontend code
- [ ] AI requests go through server-side proxy
- [ ] Environment variables are properly configured

### 8. Documentation Updates

**If New Features Added:**
- [ ] Update README.md with new feature description
- [ ] Update API documentation if endpoints changed
- [ ] Update CLAUDE.md if development guidelines changed
- [ ] Update database schema documentation if schema changed

### 9. Deployment Verification

**GitHub Actions Check:**
```bash
# Verify GitHub Actions workflow
# Check .github/workflows/deploy.yml
# Ensure required secrets are set:
# - SERVER_HOST
# - SERVER_USER
# - SSH_PRIVATE_KEY
# - GEMINI_API_KEY
```

**Production Deployment:**
```bash
# Manual deployment steps
cd /home/macboypr/weekly-planner
git pull origin main
npm install
node generate-icons.js  # If icons changed
pm2 restart weekly-planner
```

### 10. Final Verification Checklist

**Before Marking Task Complete:**
- [ ] All manual tests pass
- [ ] Database operations work correctly
- [ ] Authentication system functional
- [ ] PWA features work (offline, installation)
- [ ] Responsive design verified on all devices
- [ ] AI integration working (if API key configured)
- [ ] No console errors in browser DevTools
- [ ] PM2 process runs stable
- [ ] Performance is acceptable
- [ ] Security best practices maintained

**Note:** Since this project has no automated testing, linting, or formatting tools, all verification must be done manually. The focus is on thorough manual testing and verification of the application's functionality across all features and devices.