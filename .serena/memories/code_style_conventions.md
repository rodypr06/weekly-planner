# Code Style and Conventions - Weekly Planner

## JavaScript Conventions

### General Style
- **ES6+ Syntax**: Use const/let instead of var, arrow functions, template literals, destructuring
- **Async/Await**: Prefer async/await over Promise chains for better readability
- **Error Handling**: Always use try-catch blocks for async operations
- **Naming**: camelCase for variables and functions, PascalCase for constructors/classes
- **Comments**: Use JSDoc style comments for complex functions

### Code Structure Patterns
```javascript
// DOM element selection at top of scope
const element = document.getElementById('element-id');

// Event listener pattern
element.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        // async operation
    } catch (error) {
        console.error('Operation failed:', error);
        showMessage('Error message', 'error');
    }
});

// API call pattern
async function apiCall() {
    try {
        const response = await fetch('/api/endpoint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}
```

### Frontend JavaScript Architecture
- **Single Page Application (SPA)**: All logic in one large script block in index.html
- **Module-like Organization**: Code organized by functionality (auth, tasks, UI) within the main script
- **State Management**: Simple global variables (currentUser, tasks) for application state
- **DOM Manipulation**: Direct DOM API usage, no frameworks
- **Event-Driven**: Heavy use of addEventListener for user interactions

## CSS/Styling Conventions

### Design System
- **Glass Effect Standard**:
  ```css
  .glass-pane {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
  }
  ```

### Color Palette
```css
/* Primary Colors */
--indigo-500: #4f46e5;
--purple-500: #a855f7;
--gray-900: #111827;

/* Glass Elements */
background: rgba(255, 255, 255, 0.05);

/* Text Colors */
--text-primary: #f9fafb;    /* gray-50 */
--text-secondary: #9ca3af;  /* gray-400 */
```

### Animation Standards
- **Transition Duration**: 300ms standard for all transitions
- **Easing**: ease, ease-in-out for smooth animations
- **Loading States**: Spinner animations with consistent styling
- **Micro-interactions**: Hover effects, button press feedback

### Responsive Design
- **Mobile-first**: Design starts with mobile layout
- **Tailwind CSS**: Utility-first CSS framework via CDN
- **Breakpoints**: sm: (640px), md: (768px), lg: (1024px), xl: (1280px)

## Backend Node.js Conventions

### Express.js Patterns
```javascript
// Middleware pattern
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
};

// Route handler pattern
app.post('/api/endpoint', requireAuth, async (req, res) => {
    try {
        // Database operation
        const result = stmt.run(data);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database operation failed' });
    }
});
```

### Database Patterns
- **better-sqlite3**: Synchronous SQLite operations (no callbacks/promises needed)
- **Prepared Statements**: Always use prepared statements for security
- **Foreign Keys**: Enforce referential integrity
- **Error Handling**: Try-catch for database operations with graceful degradation

### Security Practices
- **Password Hashing**: bcryptjs with 12 salt rounds
- **Session Management**: HTTP-only cookies with secure settings
- **SQL Injection Prevention**: Prepared statements only
- **API Key Protection**: Server-side proxy for external APIs
- **Input Validation**: Validate all user inputs on both client and server

## File Organization

### Single File Architecture
- **index.html**: Contains all HTML, CSS, and JavaScript (SPA approach)
- **server.js**: Contains all backend logic, routes, and database operations
- **Minimal file structure**: Focus on functionality over file organization

### Configuration Files
- **package.json**: Standard Node.js dependencies and scripts
- **ecosystem.config.js**: PM2 configuration with environment variables
- **manifest.json**: PWA manifest with app metadata
- **sw.js**: Service worker for offline functionality

## Development Workflow

### No Testing Framework
- **Manual Testing**: No automated tests, relies on manual testing
- **Browser DevTools**: Primary debugging tool
- **Console Logging**: Extensive use of console.log/error for debugging

### Version Control
- **Git**: Standard Git workflow with main branch
- **Commit Messages**: Descriptive commit messages following conventional format
- **GitHub Actions**: Automated deployment on main branch push

### Documentation Style
- **README.md**: Comprehensive documentation with setup instructions
- **CLAUDE.md**: Detailed project guidelines for AI assistant
- **Inline Comments**: Minimal inline comments, focus on self-documenting code

## Performance Considerations

### Frontend Optimization
- **CDN Resources**: External libraries loaded from CDN
- **Service Worker**: Caching strategy for offline functionality
- **Image Optimization**: Generated PWA icons in multiple sizes
- **DOM Efficiency**: Minimal DOM queries, cache element references

### Backend Optimization
- **SQLite**: Fast local database with better-sqlite3
- **Session Storage**: Persistent session storage in SQLite
- **Static Files**: Express static middleware for file serving
- **Memory Management**: PM2 with 1GB memory limit