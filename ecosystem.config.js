module.exports = {
  apps: [{
    name: 'weekly-planner',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      GEMINI_API_KEY: "AIzaSyDtq4eHm2Y_i8CDtCYfHMK5AtGe5cB6YO0"
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
}; 