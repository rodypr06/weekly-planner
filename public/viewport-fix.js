/**
 * iOS Safari Viewport Height Fix for iPhone 15 Pro Max
 * Addresses the dynamic viewport height issues on mobile Safari
 */

(function() {
    'use strict';
    
    // Set initial viewport height custom property
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    }
    
    // Apply viewport height immediately
    setViewportHeight();
    
    // Update on resize and orientation change
    let resizeTimer;
    function handleResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            setViewportHeight();
        }, 150);
    }
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
        // Delay for orientation change animation
        setTimeout(setViewportHeight, 500);
    });
    
    // iOS Safari specific fixes
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        // Fix for iOS Safari address bar
        window.addEventListener('scroll', () => {
            if (window.pageYOffset === 0) {
                setViewportHeight();
            }
        });
        
        // Handle focus events that might change viewport
        document.addEventListener('focusin', () => {
            setTimeout(setViewportHeight, 300);
        });
        
        document.addEventListener('focusout', () => {
            setTimeout(setViewportHeight, 300);
        });
    }
    
    // iPhone 15 Pro Max specific optimizations
    if (window.screen.width === 430 || window.screen.height === 932) {
        // Add iPhone 15 Pro Max class for specific styling
        document.documentElement.classList.add('iphone-15-pro-max');
        
        // Enhanced safe area detection
        if (CSS.supports('padding: env(safe-area-inset-top)')) {
            document.documentElement.classList.add('has-safe-area');
        }
    }
    
    // Fix for webkit-fill-available not working
    if (CSS.supports('height', '-webkit-fill-available')) {
        document.documentElement.style.setProperty('--fill-available', '-webkit-fill-available');
    } else {
        document.documentElement.style.setProperty('--fill-available', '100vh');
    }
    
})();