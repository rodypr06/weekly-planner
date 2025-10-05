# Vercel Configuration Backup

This file contains the backup of Vercel configurations removed on 2025-08-30.

## vercel.json
```json
{
  "version": 2,
  "name": "smart-planner",
  "buildCommand": "node vercel-build.js",
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "index.html",
      "use": "@vercel/static"
    },
    {
      "src": "manifest.json",
      "use": "@vercel/static"
    },
    {
      "src": "sw.js",
      "use": "@vercel/static"
    },
    {
      "src": "public/**",
      "use": "@vercel/static"
    },
    {
      "src": "icons/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/icons/(.*)",
      "dest": "/icons/$1"
    },
    {
      "src": "/manifest.json",
      "dest": "/manifest.json"
    },
    {
      "src": "/sw.js",
      "dest": "/sw.js"
    },
    {
      "src": "/public/(.*)",
      "dest": "/public/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

## vercel-build.js
```javascript
#!/usr/bin/env node

// Vercel build script to use the correct package.json
const fs = require('fs');
const path = require('path');

console.log('Setting up Vercel build...');

// Copy the Vercel-specific package.json
const vercelPackage = path.join(__dirname, 'package-vercel.json');
const mainPackage = path.join(__dirname, 'package.json');

if (fs.existsSync(vercelPackage)) {
    console.log('Using Vercel-optimized package.json');
    fs.copyFileSync(vercelPackage, mainPackage);
} else {
    console.log('Warning: package-vercel.json not found, using main package.json');
}

console.log('Vercel build setup complete');
```

## package-vercel.json
```json
{
  "name": "smart-planner",
  "version": "2.0.0",
  "description": "AI-Powered Smart Planner with Supabase",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js",
    "build": "echo 'No build step needed for Vercel'",
    "vercel-build": "echo 'Icons already generated - skipping build step'"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/rodypr06/weekly-planner.git"
  },
  "keywords": ["task-management", "ai", "supabase", "pwa"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@supabase/supabase-js": "^2.51.0",
    "express": "^5.1.0",
    "node-fetch": "^2.7.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Instructions for Re-enabling (if needed):
1. Restore the files from this backup
2. Add them back to the repository
3. Re-commit and push to trigger Vercel configuration override

## Dashboard Settings to Check:
- Build Command: Should be auto-detected or set via dashboard
- Output Directory: Should be auto-detected or set via dashboard  
- Install Command: Should be auto-detected (`npm install`)
- Project Name: Set via dashboard project settings