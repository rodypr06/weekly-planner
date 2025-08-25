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

## Development Tools

### Key Guidelines
- Always use the mcp tools before using code tools.

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

[The rest of the file remains unchanged...]