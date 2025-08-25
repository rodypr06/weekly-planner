module.exports = {
  apps: [{
    name: 'weekly-planner',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 2324,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
}; 