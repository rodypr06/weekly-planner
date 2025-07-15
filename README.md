# 🗓️ Smart Planner

> **AI-Powered Smart Planner**

A modern, production-ready Progressive Web App (PWA) that combines elegant design with AI-powered task management. Built with vanilla JavaScript and featuring a stunning glassmorphism interface with smooth animations and advanced task management capabilities.

![Smart Planner](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-22+-green)
![PWA](https://img.shields.io/badge/PWA-Ready-blue)
![AI](https://img.shields.io/badge/AI-Gemini%202.0-purple)

## ✨ Features

### 🎨 **Modern Design**
- **Glassmorphism UI** with modern glass effects and backdrop blur
- **Responsive Design** optimized for mobile, tablet, and desktop
- **Dark Theme** with indigo/purple gradient accents
- **Smooth Animations** with 300ms transitions and micro-interactions
- **Animated Background** with floating gradient orbs

### 🤖 **AI-Powered Intelligence**
- **Smart Task Suggestions** powered by Google Gemini 2.0 Flash
- **Automatic Emoji Generation** for visual task categorization
- **Intelligent Task Planning** with context-aware recommendations
- **Secure API Proxy** to protect API keys

### 📱 **Progressive Web App**
- **PWA Support** for mobile installation
- **Offline Functionality** with service worker caching
- **Native App Experience** with splash screen and app icons
- **Push Notification Ready** infrastructure

### 🔐 **Multi-User Authentication**
- **Secure User Registration** with bcryptjs password hashing
- **Session-Based Authentication** with HTTP-only cookies
- **User Data Isolation** with secure database relationships
- **Password Validation** and security best practices

### 📋 **Advanced Task Management**
- **Weekly Calendar View** with date navigation
- **Task Priorities** (Low, Medium, High) with visual indicators
- **Time Scheduling** with optional time slots
- **Tag System** for task categorization
- **Task Archiving** to reduce clutter while preserving history
- **Bulk Operations** for efficient task management
- **Task Statistics** and progress tracking

### 💾 **Robust Data Management**
- **SQLite Database** with better-sqlite3 for optimal performance
- **Automatic Migrations** for seamless updates
- **Data Persistence** with foreign key constraints
- **Archive System** for completed tasks

### 🎉 **User Experience**
- **Celebration Animations** with confetti effects
- **Sound Effects** using Tone.js for audio feedback
- **Loading States** with elegant spinners
- **Error Handling** with user-friendly messages
- **Keyboard Navigation** and accessibility support

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/rodypr06/weekly-planner.git
cd weekly-planner
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Create .env file or set environment variable
export GEMINI_API_KEY="your-google-gemini-api-key"
```

4. **Generate PWA icons**
```bash
node generate-icons.js
```

5. **Start the application**
```bash
npm start
```

The application will be available at `http://localhost:2324`

## 🔑 Getting a Free Google Gemini API Key

The Smart Planner uses Google's Gemini AI for intelligent task suggestions and emoji generation. Follow these steps to get your free API key:

### Step-by-Step Instructions

1. **Visit Google AI Studio**
   - Go to [aistudio.google.com](https://aistudio.google.com)
   - Sign in with your Google account

2. **Create an API Key**
   - Click on "Get API key" in the left sidebar
   - Click "Create API key in new project" (or select an existing project)
   - Your API key will be generated automatically

3. **Copy Your API Key**
   - Copy the generated API key (it starts with `AIza...`)
   - Keep this key secure and never share it publicly

4. **Set Up the API Key**

   **Option A: Environment Variable (Recommended)**
   ```bash
   # Linux/macOS
   export GEMINI_API_KEY="your-api-key-here"
   
   # Windows Command Prompt
   set GEMINI_API_KEY=your-api-key-here
   
   # Windows PowerShell
   $env:GEMINI_API_KEY="your-api-key-here"
   ```

   **Option B: .env File**
   ```bash
   # Create a .env file in the project root
   echo "GEMINI_API_KEY=your-api-key-here" > .env
   ```

   **Option C: Vercel Deployment**
   - Add the environment variable in your Vercel project settings
   - Go to Project Settings → Environment Variables
   - Add: `GEMINI_API_KEY` with your API key value

### API Key Features & Limits

- ✅ **Free Tier**: 15 requests per minute, 1500 requests per day
- ✅ **No Credit Card Required**: Completely free to get started
- ✅ **Production Ready**: Suitable for personal and small team use
- ✅ **Rate Limiting**: Built-in request throttling in Smart Planner

### Troubleshooting

**API Key Not Working?**
- Ensure there are no extra spaces when copying the key
- Verify the key starts with `AIza`
- Check that you've restarted the server after setting the environment variable

**Need More Requests?**
- The free tier provides generous limits for most users
- For higher usage, Google offers pay-as-you-go pricing
- Monitor your usage in the Google AI Studio dashboard

**Alternative Setup:**
If you prefer not to use AI features, you can run Smart Planner without the API key - the app will work normally but won't provide AI-generated task suggestions or emoji assignments.

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js framework
- **SQLite** database with better-sqlite3
- **bcryptjs** for secure password hashing
- **express-session** for session management
- **Google Gemini AI API** integration

### Frontend
- **Vanilla JavaScript** (ES6+) with modern APIs
- **Tailwind CSS** for responsive styling
- **Inter Font** for typography
- **Font Awesome** for icons
- **Canvas Confetti** for celebrations
- **Tone.js** for audio effects

### DevOps & Deployment
- **Vercel** serverless deployment platform
- **Automatic CI/CD** from GitHub
- **Edge Network** global distribution
- **SSL/HTTPS** automatic provisioning

## 📊 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User authentication
- `POST /api/logout` - Session termination
- `GET /api/me` - Current user info

### Task Management
- `GET /api/tasks?date=YYYY-MM-DD` - Fetch tasks for date
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `DELETE /api/tasks` - Clear all tasks

### Archive System
- `POST /api/tasks/archive` - Archive completed tasks
- `POST /api/tasks/unarchive` - Restore archived tasks

### AI Integration
- `POST /api/gemini` - Secure AI proxy endpoint

## 🗄️ Database Schema

```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,           -- YYYY-MM-DD format
    text TEXT NOT NULL,           -- Task description
    emoji TEXT NOT NULL,          -- AI-generated emoji
    time TEXT,                    -- Optional HH:MM format
    priority TEXT NOT NULL,       -- 'low', 'medium', 'high'
    tags TEXT,                    -- Comma-separated tags
    completed INTEGER DEFAULT 0,  -- Boolean (0/1)
    archived INTEGER DEFAULT 0,   -- Boolean (0/1)
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## 🚢 Production Deployment

### Vercel Deployment (Recommended)

The application is optimized for deployment on Vercel with automatic CI/CD from GitHub.

#### Quick Vercel Setup
1. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "New Project" and import your GitHub repository
   - Vercel will automatically detect the configuration

2. **Set Environment Variables**
   Add these in your Vercel project settings:
   ```bash
   SUPABASE_URL=your-supabase-project-url
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   GEMINI_API_KEY=your-google-gemini-api-key
   ```

3. **Deploy**
   - Push to your main branch
   - Vercel automatically builds and deploys
   - The build process uses `package-vercel.json` for serverless compatibility

#### Deployment Features
- **Automatic Deployments** - Every push to main branch
- **Preview Deployments** - For pull requests
- **Edge Network** - Global CDN distribution
- **Serverless Functions** - Auto-scaling backend

#### Troubleshooting Vercel Deployments

**Build Failures:**
- Check that environment variables are set in Vercel dashboard
- Ensure `package-vercel.json` exists (serverless-optimized dependencies)
- Verify Node.js version compatibility (18+)

**Static File Issues:**
- Icons and static assets are served from the root directory
- The build process automatically handles file routing
- Check browser developer tools for 404 errors

**API Endpoint Problems:**
- Verify Supabase credentials are correctly set
- Check function timeout limits (default: 30 seconds)
- Monitor Vercel function logs for server errors

### Manual Deployment

#### Server Setup

1. **Install Node.js and PM2**
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2
```

2. **Install and Configure Nginx**
```bash
sudo apt install nginx
sudo cp weekly-planner.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/weekly-planner.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

3. **Deploy Application**
```bash
# Clone repository
git clone https://github.com/rodypr06/weekly-planner.git
cd weekly-planner

# Install dependencies and generate icons
npm install
node generate-icons.js

# Set environment variables
echo "GEMINI_API_KEY=your-api-key" >> .env

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Manual Updates
```bash
cd /home/macboypr/weekly-planner
git pull origin main
npm install
pm2 restart weekly-planner
```

## 🎯 PWA Installation

### Mobile Installation (iOS/Android)
1. Open the application in your mobile browser
2. Tap the "Add to Home Screen" option
3. Follow the installation prompts
4. Launch from your home screen like a native app

### Desktop Installation (Chrome/Edge)
1. Click the install icon in the address bar
2. Follow the installation dialog
3. Access from your desktop/applications menu

## 🔧 Configuration

### Environment Variables
```bash
# Required
GEMINI_API_KEY=your-google-gemini-api-key

# Optional
NODE_ENV=production
SESSION_SECRET=your-session-secret
PORT=2324
```

### PM2 Configuration (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'weekly-planner',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:2324;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🧪 Development

### Development Server
```bash
npm start
# Application available at http://localhost:2324
```

### File Structure
```
weekly-planner/
├── server.js              # Express server and API endpoints
├── index.html             # Main application interface
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker
├── ecosystem.config.js    # PM2 configuration
├── generate-icons.js      # PWA icon generator
├── weekly-planner.conf    # Nginx configuration
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions workflow
└── icons/                 # Generated PWA icons
```

## 🔒 Security Features

- **Password Hashing** with bcryptjs (12 salt rounds)
- **Session Security** with HTTP-only cookies
- **SQL Injection Prevention** with prepared statements
- **API Key Protection** with server-side proxy
- **User Data Isolation** with foreign key constraints
- **HTTPS Ready** with secure headers support

## 🎨 Design System

### Color Palette
- **Primary**: #4f46e5 (Indigo-500)
- **Secondary**: #a855f7 (Purple-500)
- **Background**: #111827 (Gray-900)
- **Glassmorphism Elements**: rgba(255, 255, 255, 0.05) with backdrop-blur(20px)
- **Text Primary**: #f9fafb (Gray-50)
- **Text Secondary**: #9ca3af (Gray-400)

### Typography
- **Font Family**: Inter (Google Fonts)
- **Weights**: 400, 500, 600, 700

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for intelligent task suggestions
- **Tailwind CSS** for rapid UI development
- **Font Awesome** for beautiful icons
- **Canvas Confetti** for celebration effects
- **Tone.js** for audio feedback

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/rodypr06/weekly-planner/issues)
- **Discussions**: [GitHub Discussions](https://github.com/rodypr06/weekly-planner/discussions)

---

**Built with ❤️ by [RodyTech LLC](https://github.com/rodypr06)**

*Transform your productivity with AI-powered planning and beautiful design.*