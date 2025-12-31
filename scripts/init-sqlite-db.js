#!/usr/bin/env node
/**
 * SQLite Database Initialization Script
 * Initializes a fresh SQLite database with complete schema
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'tasks.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'database', 'setup', 'sqlite-setup.sql');

console.log('🗄️  Initializing SQLite database...');

// Backup existing database if it exists
if (fs.existsSync(DB_PATH)) {
    const backupPath = `${DB_PATH}.backup.${Date.now()}`;
    console.log(`📦 Backing up existing database to: ${backupPath}`);
    fs.copyFileSync(DB_PATH, backupPath);
}

// Create new database
const db = new Database(DB_PATH);

// Read and execute schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

console.log('📋 Executing schema...');

// Execute the entire schema as one transaction
try {
    db.exec(schema);
    console.log('✅ Schema executed successfully!');
} catch (error) {
    console.error(`❌ Error executing schema: ${error.message}`);
    db.close();
    process.exit(1);
}

console.log(`\n✅ Database initialized successfully!`);

// Verify tables were created
const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
`).all();

console.log('\n📊 Created tables:');
tables.forEach(table => {
    console.log(`   - ${table.name}`);
});

db.close();
console.log('\n🎉 Database initialization complete!');
