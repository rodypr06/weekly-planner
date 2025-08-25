// Production-safe logging utility
const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args) => {
    // Always log errors, even in production
    console.error(...args);
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

// For browser environments
if (typeof window !== 'undefined') {
  window.logger = {
    log: (...args) => {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log(...args);
      }
    },
    
    error: (...args) => {
      // Always log errors, even in production
      console.error(...args);
    },
    
    warn: (...args) => {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn(...args);
      }
    },
    
    info: (...args) => {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.info(...args);
      }
    },
    
    debug: (...args) => {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.debug(...args);
      }
    }
  };
}

module.exports = logger;