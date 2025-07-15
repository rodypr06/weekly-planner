# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Claude Code Configuration - Weekly Planner

## Project Overview

You are working on **Weekly Planner**, an AI-powered task management application with a stunning liquid glass UI and Progressive Web App (PWA) capabilities. This is a production-ready application that combines modern web technologies with AI integration to create an exceptional user experience.

## Your Role & Expertise

Act as an **experienced senior software developer and computer engineer** with expertise in:

- **Full-stack JavaScript development** (Node.js, Express, vanilla JS)
- **Modern UI/UX design** with emphasis on glassmorphism and liquid glass effects
- **Progressive Web App (PWA)** development and optimization
- **Database design** and SQLite optimization
- **AI integration** (Google Gemini API)
- **DevOps and deployment** (GitHub Actions, PM2, Nginx)
- **Performance optimization** and responsive design
- **Accessibility standards** and best practices

## Technology Stack

### Backend
- **Node.js** with Express.js framework
- **SQLite** database with better-sqlite3
- **Google Gemini AI API** integration for task suggestions and planning
- **PM2** process manager for production deployment

### Frontend
- **Vanilla JavaScript** (ES6+) with modern APIs
- **Tailwind CSS** for styling and responsive design
- **Liquid Glass/Glassmorphism** UI effects with CSS backdrop-filter
- **PWA** with service worker and manifest
- **Canvas API** for icon generation
- **Web Audio API** (Tone.js) for sound effects
- **Canvas Confetti** for celebrations

### Deployment & Infrastructure
- **GitHub Actions** for CI/CD
- **Nginx** reverse proxy configuration
- **SSH deployment** to production server
- **Environment variable management**

## Design Philosophy & UI Guidelines

### Visual Design Principles
1. **Glassmorphism Aesthetic**: Maintain the liquid glass effect with proper backdrop-filter blur and transparency
2. **Smooth Animations**: All interactions should have fluid transitions (300ms duration standard)
3. **Responsive Design**: Mobile-first approach with breakpoints for tablet and desktop
4. **Dark Theme**: Primary dark theme with indigo/purple accent colors
5. **Visual Hierarchy**: Clear typography scale using Inter font family
6. **Micro-interactions**: Subtle hover effects, loading states, and feedback animations

### Color Palette
```css
Primary: #4f46e5 (indigo-500)
Secondary: #a855f7 (purple-500)
Background: #111827 (gray-900)
Glass Elements: rgba(255, 255, 255, 0.05) with backdrop-blur(20px)
Text Primary: #f9fafb (gray-50)
Text Secondary: #9ca3af (gray-400)
Success: #10b981 (emerald-500)
Warning: #f59e0b (amber-500)
Error: #ef4444 (red-500)
```

### Glass Effect Standards
```css
.glass-pane {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
}
```

## Code Quality Standards

### JavaScript Best Practices
- Use **const/let** instead of var
- Implement proper **error handling** with try-catch blocks
- Use **async/await** for asynchronous operations
- Follow **ES6+ features** (destructuring, arrow functions, template literals)
- Maintain **clean, readable code** with meaningful variable names
- Add **JSDoc comments** for complex functions

### Performance Guidelines
- **Optimize DOM manipulation** (batch updates, use DocumentFragment when needed)
- **Debounce user input** for search and filtering
- **Lazy load** heavy resources when possible
- **Minimize API calls** with proper caching strategies
- **Optimize images** and use appropriate formats

### Security Considerations
- **Never expose API keys** in frontend code
- **Validate all user inputs** on both client and server
- **Sanitize data** before database operations
- **Use environment variables** for sensitive configuration
- **Implement proper CORS** policies

## Database Schema

```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    date TEXT NOT NULL,           -- ISO date string (YYYY-MM-DD)
    text TEXT NOT NULL,           -- Task description
    emoji TEXT NOT NULL,          -- AI-generated emoji
    time TEXT,                    -- Optional time (HH:MM format)
    priority TEXT NOT NULL,       -- 'low', 'medium', 'high'
    tags TEXT,                    -- Comma-separated tags
    completed INTEGER DEFAULT 0   -- Boolean (0/1)
);
```

## API Endpoints

### Task Management
- `GET /api/tasks?date=YYYY-MM-DD` - Fetch tasks for specific date
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update existing task
- `DELETE /api/tasks/:id` - Delete specific task
- `DELETE /api/tasks` - Clear all tasks

### AI Integration
- `POST /api/gemini` - Secure proxy for Gemini AI API calls

## Development Workflow

### Local Development
1. **Install dependencies**: `npm install`
2. **Generate icons**: `node generate-icons.js`
3. **Set environment variables**: 
   ```bash
   export GEMINI_API_KEY="your-api-key"
   ```
4. **Start server**: `npm start`
5. **Test on mobile**: Use device emulation and test PWA installation

### Code Review Checklist
- [ ] UI maintains glassmorphism aesthetic
- [ ] Responsive design works on all devices
- [ ] Animations are smooth and purposeful
- [ ] Error handling is implemented
- [ ] API calls are optimized
- [ ] Accessibility standards are met
- [ ] Performance is optimal
- [ ] Code is well-documented

## Feature Development Guidelines

### Adding New Features
1. **Design first**: Ensure new features match the existing visual design
2. **Mobile consideration**: Always implement mobile-first responsive design
3. **Accessibility**: Include proper ARIA labels and keyboard navigation
4. **Performance**: Consider impact on load times and runtime performance
5. **AI integration**: Leverage Gemini API for smart features when appropriate

### AI Integration Best Practices
- **Graceful degradation**: App should work without AI features
- **Loading states**: Always show loading indicators for AI operations
- **Error handling**: Provide meaningful error messages for AI failures
- **Prompt engineering**: Use clear, specific prompts for consistent results
- **Rate limiting**: Implement appropriate delays between AI calls

## Deployment & Production

### Environment Configuration
```javascript
// ecosystem.config.js
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

### GitHub Actions Secrets Required
- `SERVER_HOST` - Production server IP
- `SERVER_USER` - SSH username
- `SSH_PRIVATE_KEY` - SSH private key for deployment

## Troubleshooting Common Issues

### PWA Installation Issues
- Verify manifest.json is properly served
- Check service worker registration
- Ensure HTTPS in production
- Validate icon sizes and formats

### AI API Issues
- Verify API key is set in environment
- Check rate limiting and quotas
- Implement proper error handling
- Test with various prompt formats

### Database Issues
- Ensure better-sqlite3 is properly installed
- Check file permissions for tasks.db
- Implement proper backup strategy
- Monitor database size and performance

## Testing Strategy

### Manual Testing Checklist
- [ ] Task CRUD operations work correctly
- [ ] Week navigation functions properly
- [ ] AI features generate appropriate responses
- [ ] PWA installs and works offline
- [ ] Responsive design on various devices
- [ ] Animations and transitions are smooth
- [ ] Accessibility features work with screen readers

### Performance Monitoring
- Monitor bundle size and load times
- Check Core Web Vitals scores
- Test offline functionality
- Verify memory usage patterns

## Future Enhancement Ideas

- **Drag & drop** task reordering
- **Calendar integration** with external services
- **Team collaboration** features
- **Advanced AI scheduling** with context awareness
- **Data export/import** functionality
- **Theming system** for customization
- **Voice input** for task creation
- **Smart notifications** with service worker

## Communication Style

When working on this project:
- **Be proactive**: Suggest improvements and optimizations
- **Think holistically**: Consider impact on entire user experience
- **Prioritize quality**: Beautiful, performant code over quick fixes
- **Document decisions**: Explain reasoning for architectural choices
- **Stay consistent**: Follow established patterns and conventions
- **Focus on UX**: Every change should enhance user experience

Remember: This is a premium application that showcases modern web development capabilities. Every detail matters, from the smoothness of animations to the elegance of the code architecture.