#!/usr/bin/env node

// Vercel-compatible install script
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up production dependencies for Vercel...');

// Use production package.json for serverless deployment
const productionPackage = path.join(__dirname, 'package.production.json');
const mainPackage = path.join(__dirname, 'package.json');

if (fs.existsSync(productionPackage)) {
    console.log('✅ Using serverless-optimized package.json');
    fs.copyFileSync(productionPackage, mainPackage);
    console.log('📦 Production dependencies configured');
} else {
    console.log('⚠️  Warning: package.production.json not found, using main package.json');
}

console.log('🎉 Vercel setup complete');