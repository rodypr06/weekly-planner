/**
 * Mobile Navigation and Touch Interaction Handler
 * Provides responsive navigation and touch-friendly interactions
 */

(function() {
    'use strict';
    
    class MobileNavigation {
        constructor() {
            this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            this.isMobile = window.innerWidth < 768;
            this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
            
            // Navigation elements
            this.hamburger = null;
            this.sidebar = null;
            this.overlay = null;
            this.mobileNav = null;
            
            // Touch gesture tracking
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.touchEndX = 0;
            this.touchEndY = 0;
            this.swipeThreshold = 50;
            
            // Pull to refresh
            this.pullToRefreshEnabled = false;
            this.pullStartY = 0;
            this.pullDistance = 0;
            this.pullThreshold = 80;
            
            this.init();
        }
        
        /**
         * Initialize mobile navigation
         */
        init() {
            this.createMobileElements();
            this.attachEventListeners();
            this.handleOrientationChange();
            this.setupPullToRefresh();
            this.optimizeForMobile();
        }
        
        /**
         * Create mobile navigation elements
         */
        createMobileElements() {
            // Create mobile header with hamburger menu
            if (!document.querySelector('.mobile-header') && this.isMobile) {
                this.createMobileHeader();
            }
            
            // Create floating menu button as fallback
            if (!document.querySelector('.floating-menu-btn') && this.isMobile && !this.hamburger) {
                this.createFloatingMenuButton();
            }
            
            // Create sidebar
            if (!document.querySelector('.mobile-sidebar')) {
                this.createSidebar();
            }
            
            // Create overlay
            if (!document.querySelector('.mobile-overlay')) {
                this.createOverlay();
            }
        }
        
        /**
         * Create floating menu button as fallback
         */
        createFloatingMenuButton() {
            const floatingBtn = document.createElement('button');
            floatingBtn.className = 'floating-menu-btn';
            floatingBtn.innerHTML = `
                <i class="fas fa-bars"></i>
            `;
            floatingBtn.style.cssText = `
                position: fixed;
                top: 20px;
                left: 20px;
                z-index: 1000;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: rgba(79, 70, 229, 0.9);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            
            document.body.appendChild(floatingBtn);
            
            floatingBtn.addEventListener('click', () => this.toggleSidebar());
            this.floatingMenuBtn = floatingBtn;
        }
        
        /**
         * Create mobile header with hamburger menu
         */
        createMobileHeader() {
            const header = document.createElement('div');
            header.className = 'mobile-header';
            header.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="hamburger-menu" id="hamburger-menu">
                        <div class="hamburger-line"></div>
                        <div class="hamburger-line"></div>
                        <div class="hamburger-line"></div>
                    </div>
                    <h1 class="text-responsive-lg font-semibold">Smart Planner</h1>
                    <div class="w-10"></div>
                </div>
            `;
            
            document.body.insertBefore(header, document.body.firstChild);
            this.hamburger = document.getElementById('hamburger-menu');
        }
        
        /**
         * Create bottom navigation for mobile
         */
        createBottomNav() {
            const nav = document.createElement('nav');
            nav.className = 'mobile-nav safe-area-inset';
            nav.innerHTML = `
                <a href="#home" class="mobile-nav-item active" data-page="home">
                    <i class="fas fa-home"></i>
                    <span>Home</span>
                </a>
                <a href="#calendar" class="mobile-nav-item" data-page="calendar">
                    <i class="fas fa-calendar"></i>
                    <span>Calendar</span>
                </a>
                <a href="#add" class="mobile-nav-item" data-page="add">
                    <i class="fas fa-plus-circle"></i>
                    <span>Add</span>
                </a>
                <a href="#tasks" class="mobile-nav-item" data-page="tasks">
                    <i class="fas fa-tasks"></i>
                    <span>Tasks</span>
                </a>
                <a href="#profile" class="mobile-nav-item" data-page="profile">
                    <i class="fas fa-user"></i>
                    <span>Profile</span>
                </a>
            `;
            
            document.body.appendChild(nav);
            this.mobileNav = nav;
            
            // Add padding to body to account for fixed nav
            document.body.style.paddingBottom = '80px';
        }
        
        /**
         * Create sidebar menu
         */
        /**
         * Create sidebar menu
         */
        createSidebar() {
            const sidebar = document.createElement('div');
            sidebar.className = 'mobile-sidebar';
            sidebar.innerHTML = `
                <div class="sidebar-header mb-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-responsive-xl font-bold">Menu</h2>
                        <button class="touch-target" id="close-sidebar">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="user-info flex items-center gap-3">
                        <div class="user-avatar w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600"></div>
                        <div>
                            <p class="font-semibold" id="sidebar-username">User</p>
                            <p class="text-sm text-gray-400" id="sidebar-email">email@example.com</p>
                        </div>
                    </div>
                </div>
                
                <nav class="sidebar-nav">
                    <a href="#settings" class="sidebar-item">
                        <i class="fas fa-cog mr-3"></i>
                        <span>Settings</span>
                    </a>
                    <a href="#help" class="sidebar-item">
                        <i class="fas fa-question-circle mr-3"></i>
                        <span>Help & Support</span>
                    </a>
                    <hr class="my-4 border-gray-700">
                    <a href="#logout" class="sidebar-item text-red-400">
                        <i class="fas fa-sign-out-alt mr-3"></i>
                        <span>Logout</span>
                    </a>
                </nav>
            `;
            
            document.body.appendChild(sidebar);
            this.sidebar = sidebar;
            
            // Style sidebar items
            const style = document.createElement('style');
            style.textContent = `
                .sidebar-item {
                    display: flex;
                    align-items: center;
                    padding: 12px 16px;
                    margin-bottom: 4px;
                    border-radius: 8px;
                    color: #e5e7eb;
                    text-decoration: none;
                    transition: all 0.2s ease;
                }
                
                .sidebar-item:hover,
                .sidebar-item:active {
                    background: rgba(255, 255, 255, 0.1);
                }
            `;
            document.head.appendChild(style);
        }
        
        /**
         * Create overlay for sidebar
         */
        createOverlay() {
            const overlay = document.createElement('div');
            overlay.className = 'mobile-overlay';
            document.body.appendChild(overlay);
            this.overlay = overlay;
        }
        
        /**
         * Attach event listeners
         */
        attachEventListeners() {
            // Hamburger menu
            if (this.hamburger) {
                this.hamburger.addEventListener('click', () => this.toggleSidebar());
            }
            
            // Close sidebar
            const closeSidebar = document.getElementById('close-sidebar');
            if (closeSidebar) {
                closeSidebar.addEventListener('click', () => this.closeSidebar());
            }
            
            // Overlay click
            if (this.overlay) {
                this.overlay.addEventListener('click', () => this.closeSidebar());
            }
            
            // Window resize
            window.addEventListener('resize', () => this.handleResize());
            
            // Touch gestures
            if (this.isTouch) {
                this.setupTouchGestures();
            }
            
            // Orientation change
            window.addEventListener('orientationchange', () => this.handleOrientationChange());
            
            // Viewport height fix for mobile browsers
            this.fixViewportHeight();
        }
        
        /**
         * Setup touch gestures
         */
        setupTouchGestures() {
            document.addEventListener('touchstart', (e) => {
                this.touchStartX = e.changedTouches[0].screenX;
                this.touchStartY = e.changedTouches[0].screenY;
            }, { passive: true });
            
            document.addEventListener('touchend', (e) => {
                this.touchEndX = e.changedTouches[0].screenX;
                this.touchEndY = e.changedTouches[0].screenY;
                this.handleSwipe();
            }, { passive: true });
        }
        
        /**
         * Handle swipe gestures
         */
        handleSwipe() {
            const deltaX = this.touchEndX - this.touchStartX;
            const deltaY = this.touchEndY - this.touchStartY;
            
            // Horizontal swipe
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.swipeThreshold) {
                if (deltaX > 0 && this.touchStartX < 20) {
                    // Swipe right from left edge - open sidebar
                    this.openSidebar();
                } else if (deltaX < 0 && this.sidebar && this.sidebar.classList.contains('active')) {
                    // Swipe left - close sidebar
                    this.closeSidebar();
                }
            }
        }
        
        /**
         * Setup pull to refresh
         */
        setupPullToRefresh() {
            if (!this.isTouch || !this.isMobile) return;
            
            let isPulling = false;
            const scrollContainer = document.querySelector('.main-content') || document.body;
            
            // Create pull to refresh indicator
            const pullIndicator = document.createElement('div');
            pullIndicator.className = 'pull-to-refresh';
            pullIndicator.innerHTML = '<i class="fas fa-sync"></i>';
            scrollContainer.appendChild(pullIndicator);
            
            scrollContainer.addEventListener('touchstart', (e) => {
                if (scrollContainer.scrollTop === 0) {
                    this.pullStartY = e.touches[0].clientY;
                    isPulling = true;
                }
            }, { passive: true });
            
            scrollContainer.addEventListener('touchmove', (e) => {
                if (!isPulling) return;
                
                this.pullDistance = e.touches[0].clientY - this.pullStartY;
                
                if (this.pullDistance > 0 && scrollContainer.scrollTop === 0) {
                    e.preventDefault();
                    
                    const opacity = Math.min(this.pullDistance / this.pullThreshold, 1);
                    const rotation = Math.min(this.pullDistance * 3, 360);
                    
                    pullIndicator.style.transform = `translateX(-50%) translateY(${Math.min(this.pullDistance, this.pullThreshold)}px)`;
                    pullIndicator.style.opacity = opacity;
                    pullIndicator.querySelector('i').style.transform = `rotate(${rotation}deg)`;
                }
            }, { passive: false });
            
            scrollContainer.addEventListener('touchend', () => {
                if (isPulling && this.pullDistance > this.pullThreshold) {
                    pullIndicator.classList.add('refreshing');
                    this.refresh();
                }
                
                isPulling = false;
                this.pullDistance = 0;
                
                setTimeout(() => {
                    pullIndicator.style.transform = 'translateX(-50%) translateY(-60px)';
                    pullIndicator.style.opacity = '0';
                    pullIndicator.classList.remove('refreshing');
                }, 300);
            }, { passive: true });
        }
        
        /**
         * Refresh content
         */
        refresh() {
            // Trigger refresh event
            window.dispatchEvent(new Event('pullToRefresh'));
            
            // Reload tasks or content
            if (window.loadTasks) {
                window.loadTasks();
            }
            
            // Show feedback
            if (window.notificationManager) {
                window.notificationManager.show('Refreshed!', 'success');
            }
        }
        
        /**
         * Toggle sidebar
         */
        /**
         * Toggle sidebar
         */
        toggleSidebar() {
            if (this.sidebar.classList.contains('active')) {
                this.closeSidebar();
            } else {
                this.openSidebar();
            }
        }
        
        /**
         * Open sidebar
         */
        openSidebar() {
            if (this.sidebar) {
                this.sidebar.classList.add('active');
            }
            if (this.overlay) {
                this.overlay.classList.add('active');
            }
            if (this.hamburger) {
                this.hamburger.classList.add('active');
            }
            document.body.style.overflow = 'hidden';
        }
        
        /**
         * Close sidebar
         */
        closeSidebar() {
            if (this.sidebar) {
                this.sidebar.classList.remove('active');
            }
            if (this.overlay) {
                this.overlay.classList.remove('active');
            }
            if (this.hamburger) {
                this.hamburger.classList.remove('active');
            }
            document.body.style.overflow = '';
        }
        
        /**
         * Handle nav item click
         */
        handleNavClick(e) {
            e.preventDefault();
            
            // Update active state
            this.mobileNav.querySelectorAll('.mobile-nav-item').forEach(item => {
                item.classList.remove('active');
            });
            e.currentTarget.classList.add('active');
            
            // Trigger navigation event
            const page = e.currentTarget.dataset.page;
            window.dispatchEvent(new CustomEvent('mobileNavigation', { detail: { page } }));
            
            // Haptic feedback on supported devices
            if (window.navigator.vibrate) {
                window.navigator.vibrate(10);
            }
        }
        
        /**
         * Handle window resize
         */
        /**
         * Handle window resize
         */
        handleResize() {
            const newIsMobile = window.innerWidth < 768;
            const newIsTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
            
            this.isMobile = newIsMobile;
            this.isTablet = newIsTablet;
        }
        
        /**
         * Handle orientation change
         */
        handleOrientationChange() {
            // Close sidebar on orientation change
            this.closeSidebar();
            
            // Adjust layout
            setTimeout(() => {
                this.fixViewportHeight();
            }, 100);
        }
        
        /**
         * Fix viewport height for mobile browsers
         */
        fixViewportHeight() {
            // Fix for mobile browser viewport height
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            // Apply to elements that need full height
            const style = document.createElement('style');
            style.textContent = `
                .full-height-mobile {
                    height: calc(var(--vh, 1vh) * 100);
                }
            `;
            
            // Remove old style if exists
            const oldStyle = document.getElementById('viewport-height-fix');
            if (oldStyle) {
                oldStyle.remove();
            }
            
            style.id = 'viewport-height-fix';
            document.head.appendChild(style);
        }
        
        /**
         * Optimize for mobile performance
         */
        optimizeForMobile() {
            if (!this.isMobile) return;
            
            // Disable hover effects on mobile
            const style = document.createElement('style');
            style.textContent = `
                @media (hover: none) and (pointer: coarse) {
                    *:hover {
                        all: initial !important;
                    }
                }
            `;
            document.head.appendChild(style);
            
            // Add fastclick behavior
            document.addEventListener('touchstart', () => {}, { passive: true });
            
            // Optimize animations for mobile
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                    document.body.classList.add('mobile-optimized');
                });
            }
        }
        
        /**
         * Show mobile-specific modal
         */
        showMobileModal(content, options = {}) {
            const modal = document.createElement('div');
            modal.className = 'mobile-modal';
            modal.innerHTML = `
                <div class="mobile-modal-handle"></div>
                <div class="mobile-modal-content">
                    ${content}
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Show with animation
            requestAnimationFrame(() => {
                modal.classList.add('active');
            });
            
            // Handle swipe down to close
            let startY = 0;
            let currentY = 0;
            
            const handle = modal.querySelector('.mobile-modal-handle');
            
            handle.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
            }, { passive: true });
            
            handle.addEventListener('touchmove', (e) => {
                currentY = e.touches[0].clientY;
                const deltaY = currentY - startY;
                
                if (deltaY > 0) {
                    modal.style.transform = `translateY(${deltaY}px)`;
                }
            }, { passive: true });
            
            handle.addEventListener('touchend', () => {
                const deltaY = currentY - startY;
                
                if (deltaY > 100) {
                    modal.classList.remove('active');
                    setTimeout(() => modal.remove(), 300);
                } else {
                    modal.style.transform = '';
                }
            }, { passive: true });
            
            return modal;
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.mobileNav = new MobileNavigation();
        });
    } else {
        window.mobileNav = new MobileNavigation();
    }
    
    // Re-initialize when authentication state changes
    window.addEventListener('authStateChanged', () => {
        if (window.mobileNav) {
            window.mobileNav.handleResize();
        }
    });
})();