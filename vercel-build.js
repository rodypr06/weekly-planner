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