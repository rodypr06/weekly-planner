# Weekly Planner

An AI-powered weekly task planner with a beautiful liquid glass UI and PWA support.

## Features

- Modern, responsive UI with liquid glass effect
- PWA support for mobile installation
- Offline functionality
- Task management with AI suggestions
- Weekly view with progress tracking
- Automated deployment with GitHub Actions

## Development

1. Clone the repository:
```bash
git clone https://github.com/rodypr06/weekly-planner.git
cd weekly-planner
```

2. Install dependencies:
```bash
npm install
```

3. Generate icons:
```bash
npm install canvas
node generate-icons.js
```

4. Start the development server:
```bash
npm start
```

## Production Deployment

The application is automatically deployed using GitHub Actions when changes are pushed to the main branch.

### Manual Deployment

1. SSH into your server
2. Navigate to the project directory:
```bash
cd /home/macboypr/weekly-planner
```

3. Pull the latest changes:
```bash
git pull origin main
```

4. Install dependencies:
```bash
npm install
```

5. Restart the application:
```bash
pm2 restart weekly-planner
```

### Setting up GitHub Actions

1. Add the following secrets to your GitHub repository:
   - `SERVER_HOST`: Your server's IP address
   - `SERVER_USER`: SSH username
   - `SSH_PRIVATE_KEY`: Your SSH private key

2. The workflow will automatically:
   - Install dependencies
   - Generate icons
   - Deploy to your server
   - Restart the application

## Server Setup

1. Install Node.js and npm
2. Install PM2:
```bash
npm install -g pm2
```

3. Install Nginx:
```bash
sudo apt install nginx
```

4. Configure Nginx (see weekly-planner.conf)

5. Start the application:
```bash
pm2 start ecosystem.config.js
```

## License

MIT
