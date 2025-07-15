# Suggested Shell Commands for Weekly Planner

## Development Commands

### Basic Project Setup
```bash
# Install dependencies
npm install

# Generate PWA icons
node generate-icons.js

# Start development server
npm start
```

### Environment Setup
```bash
# Set Gemini API key (required for AI features)
export GEMINI_API_KEY="your-google-gemini-api-key"

# Set session secret (optional, has default)
export SESSION_SECRET="your-session-secret"

# Set custom port (optional, defaults to 2324)
export PORT=2324
```

### Production Deployment
```bash
# Start with PM2
pm2 start ecosystem.config.js

# Restart application
pm2 restart weekly-planner

# Stop application
pm2 stop weekly-planner

# View logs
pm2 logs weekly-planner

# Monitor process
pm2 monit

# Save PM2 config for auto-restart
pm2 save
pm2 startup
```

### Database Management
```bash
# View SQLite database (requires sqlite3 CLI)
sqlite3 tasks.db ".schema"
sqlite3 tasks.db "SELECT * FROM tasks LIMIT 10;"
sqlite3 sessions.db ".tables"
```

### System Utilities (Linux)
```bash
# File operations
ls -la                    # List files with details
find . -name "*.js"       # Find JavaScript files
grep -r "pattern" .       # Search for pattern in files
cat filename.txt          # Display file content
head -n 20 filename.txt   # Show first 20 lines
tail -f filename.txt      # Follow file changes

# Process management
ps aux | grep node        # Find Node.js processes
kill -9 <pid>            # Kill process by PID
netstat -tulpn | grep 2324  # Check port usage

# Git operations
git status               # Check repository status
git add .                # Stage all changes
git commit -m "message"  # Commit changes
git push origin main     # Push to remote
git pull origin main     # Pull latest changes
```

### Nginx Configuration
```bash
# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Icon Generation
```bash
# Generate all PWA icons (72px to 512px)
node generate-icons.js

# Check generated icons
ls -la icons/
```

## Testing & Debugging

### Application Testing
```bash
# Test API endpoints
curl http://localhost:2324/api/me
curl -X POST http://localhost:2324/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password123"}'

# Check PWA manifest
curl http://localhost:2324/manifest.json
```

### Service Worker Testing
```bash
# Test service worker in browser DevTools
# 1. Open DevTools (F12)
# 2. Go to Application tab
# 3. Check Service Workers section
# 4. Inspect Cache Storage
```

### System Monitoring
```bash
# Check system resources
top                      # Monitor CPU/memory usage
df -h                    # Check disk space
free -h                  # Check memory usage
netstat -tuln            # Check listening ports
```

## Note on Commands
- All commands assume Linux environment (Ubuntu/Debian)
- PM2 commands require PM2 to be installed globally: `npm install -g pm2`
- Database commands require SQLite3 CLI: `sudo apt install sqlite3`
- Nginx commands require Nginx to be installed: `sudo apt install nginx`