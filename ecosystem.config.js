module.exports = {
  apps: [{
    name: 'weekly-planner',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
}; 