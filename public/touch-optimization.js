/**
 * Touch Optimization and Mobile Gesture Enhancement
 * Improves touch interactions, gestures, and mobile usability
 */

(function() {
    'use strict';
    
    class TouchOptimization {
        constructor() {
            this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            this.isMobile = window.innerWidth < 768;
            
            // Touch state tracking
            this.touchStartTime = 0;
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.touchEndX = 0;
            this.touchEndY = 0;
            this.longPressTimer = null;
            this.longPressThreshold = 500;
            this.tapThreshold = 10;
            this.swipeThreshold = 50;
            
            // Enhanced drag and drop
            this.dragState = {
                isDragging: false,
                dragElement: null,
                dragClone: null,
                startX: 0,
                startY: 0,
                offsetX: 0,
                offsetY: 0,
                scrollContainer: null
            };
            
            // Haptic feedback
            this.hapticEnabled = 'vibrate' in navigator;
            
            this.init();
        }
        
        /**
         * Initialize touch optimizations
         */
        init() {
            if (!this.isTouch) return;
            
            this.optimizeTouchTargets();
            this.enhanceDragAndDrop();
            this.setupGestureRecognition();
            this.setupTouchFeedback();
            this.preventDoubleTouch();
            this.optimizeScrolling();
            this.setupAccessibilityFeatures();
        }
        
        /**
         * Optimize touch targets for better accessibility
         */
        optimizeTouchTargets() {
            // Ensure minimum touch target size of 44px
            const touchTargets = document.querySelectorAll('button, a, input, .task-item, .btn, [role="button"]');
            
            touchTargets.forEach(target => {
                const rect = target.getBoundingClientRect();
                
                if (rect.width < 44 || rect.height < 44) {
                    target.classList.add('touch-target');
                }
            });
            
            // Add visual feedback for touch interactions
            const style = document.createElement('style');
            style.textContent = `
                .touch-feedback {
                    position: relative;
                    overflow: hidden;
                }
                
                .touch-feedback::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 0;
                    height: 0;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.3);
                    transform: translate(-50%, -50%);
                    transition: width 0.3s ease, height 0.3s ease;
                    pointer-events: none;
                    z-index: 1;
                }
                
                .touch-feedback.active::before {
                    width: 100px;
                    height: 100px;
                }
                
                .touch-optimized {
                    -webkit-tap-highlight-color: transparent;
                    -webkit-touch-callout: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                    touch-action: manipulation;
                }
                
                .draggable-enhanced {
                    cursor: grab;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                
                .draggable-enhanced:active {
                    cursor: grabbing;
                }
                
                .dragging-enhanced {
                    transform: scale(1.05) rotate(2deg);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    z-index: 1000;
                    opacity: 0.9;
                }
                
                .drop-zone-active {
                    background: rgba(99, 102, 241, 0.2);
                    border: 2px dashed #6366f1;
                    transform: scale(1.02);
                }
            `;
            document.head.appendChild(style);
        }
        
        /**
         * Enhance existing drag and drop functionality
         */
        enhanceDragAndDrop() {
            // Find existing task list
            const taskList = document.querySelector('#task-list, .task-list, [data-task-list]');
            if (!taskList) return;
            
            // Enhanced touch events for drag and drop
            taskList.addEventListener('touchstart', (e) => {
                const taskItem = e.target.closest('.task-item, [data-task-id]');
                if (!taskItem) return;
                
                this.startDrag(e, taskItem);
            }, { passive: false });
            
            document.addEventListener('touchmove', (e) => {
                if (this.dragState.isDragging) {
                    this.handleDragMove(e);
                }
            }, { passive: false });
            
            document.addEventListener('touchend', (e) => {
                if (this.dragState.isDragging) {
                    this.endDrag(e);
                }
            }, { passive: true });
        }
        
        /**
         * Start enhanced drag operation
         */
        startDrag(e, element) {
            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = element.getBoundingClientRect();
            
            this.dragState = {
                isDragging: true,
                dragElement: element,
                startX: touch.clientX,
                startY: touch.clientY,
                offsetX: touch.clientX - rect.left,
                offsetY: touch.clientY - rect.top,
                scrollContainer: this.findScrollContainer(element)
            };
            
            // Create enhanced drag clone
            const clone = element.cloneNode(true);
            clone.classList.add('dragging-enhanced');
            clone.style.cssText = `
                position: fixed;
                top: ${rect.top}px;
                left: ${rect.left}px;
                width: ${rect.width}px;
                height: ${rect.height}px;
                pointer-events: none;
                z-index: 1000;
                transform-origin: center;
            `;
            
            document.body.appendChild(clone);
            this.dragState.dragClone = clone;
            
            // Add dragging class to original
            element.classList.add('touch-optimized');
            element.style.opacity = '0.5';
            
            // Haptic feedback
            this.hapticFeedback('start');
            
            // Highlight drop zones
            this.highlightDropZones(true);
        }
        
        /**
         * Handle drag move
         */
        handleDragMove(e) {
            if (!this.dragState.isDragging || !this.dragState.dragClone) return;
            
            e.preventDefault();
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.dragState.startX;
            const deltaY = touch.clientY - this.dragState.startY;
            
            // Update clone position
            this.dragState.dragClone.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.05) rotate(2deg)`;
            
            // Auto-scroll if near edges
            this.handleAutoScroll(touch.clientY);
            
            // Highlight drop target
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            this.updateDropTarget(elementBelow);
        }
        
        /**
         * End drag operation
         */
        endDrag(e) {
            if (!this.dragState.isDragging) return;
            
            const touch = e.changedTouches[0];
            const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            
            // Animate to drop position
            if (this.dragState.dragClone) {
                const clone = this.dragState.dragClone;
                
                if (this.isValidDropTarget(dropTarget)) {
                    // Successful drop
                    const targetRect = dropTarget.getBoundingClientRect();
                    clone.style.transition = 'all 0.3s ease';
                    clone.style.transform = `translate(${targetRect.left - this.dragState.startX}px, ${targetRect.top - this.dragState.startY}px) scale(1)`;
                    
                    setTimeout(() => {
                        this.performDrop(dropTarget);
                        this.cleanupDrag();
                    }, 300);
                    
                    this.hapticFeedback('success');
                } else {
                    // Return to original position
                    clone.style.transition = 'all 0.3s ease';
                    clone.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
                    
                    setTimeout(() => {
                        this.cleanupDrag();
                    }, 300);
                    
                    this.hapticFeedback('error');
                }
            }
            
            this.highlightDropZones(false);
        }
        
        /**
         * Clean up drag state
         */
        cleanupDrag() {
            if (this.dragState.dragClone) {
                this.dragState.dragClone.remove();
            }
            
            if (this.dragState.dragElement) {
                this.dragState.dragElement.classList.remove('touch-optimized');
                this.dragState.dragElement.style.opacity = '';
            }
            
            this.dragState = {
                isDragging: false,
                dragElement: null,
                dragClone: null,
                startX: 0,
                startY: 0,
                offsetX: 0,
                offsetY: 0,
                scrollContainer: null
            };
        }
        
        /**
         * Setup gesture recognition
         */
        setupGestureRecognition() {
            let gestureStartTime = 0;
            let gesturePoints = [];
            
            document.addEventListener('touchstart', (e) => {
                gestureStartTime = Date.now();
                gesturePoints = [];
                
                const touch = e.touches[0];
                this.touchStartTime = gestureStartTime;
                this.touchStartX = touch.clientX;
                this.touchStartY = touch.clientY;
                
                // Setup long press detection
                this.longPressTimer = setTimeout(() => {
                    this.handleLongPress(e);
                }, this.longPressThreshold);
                
            }, { passive: true });
            
            document.addEventListener('touchmove', (e) => {
                // Cancel long press on move
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                }
                
                const touch = e.touches[0];
                gesturePoints.push({
                    x: touch.clientX,
                    y: touch.clientY,
                    time: Date.now()
                });
                
            }, { passive: true });
            
            document.addEventListener('touchend', (e) => {
                // Cancel long press
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                }
                
                const touch = e.changedTouches[0];
                this.touchEndX = touch.clientX;
                this.touchEndY = touch.clientY;
                
                const duration = Date.now() - gestureStartTime;
                const deltaX = this.touchEndX - this.touchStartX;
                const deltaY = this.touchEndY - this.touchStartY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                // Detect tap
                if (duration < 300 && distance < this.tapThreshold) {
                    this.handleTap(e, touch);
                }
                
                // Detect swipe
                if (distance > this.swipeThreshold) {
                    this.handleSwipe(deltaX, deltaY, e);
                }
                
            }, { passive: true });
        }
        
        /**
         * Handle tap gesture
         */
        handleTap(e, touch) {
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            
            // Add visual feedback
            if (element && !element.classList.contains('no-touch-feedback')) {
                this.addTouchFeedback(element);
            }
            
            // Haptic feedback for buttons
            if (element && (element.matches('button, .btn, a[role="button"]'))) {
                this.hapticFeedback('tap');
            }
        }
        
        /**
         * Handle long press gesture
         */
        handleLongPress(e) {
            const touch = e.touches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            
            if (element) {
                // Dispatch custom long press event
                const longPressEvent = new CustomEvent('longpress', {
                    detail: {
                        element: element,
                        x: touch.clientX,
                        y: touch.clientY
                    }
                });
                
                element.dispatchEvent(longPressEvent);
                this.hapticFeedback('longpress');
            }
        }
        
        /**
         * Handle swipe gesture
         */
        handleSwipe(deltaX, deltaY, e) {
            const direction = this.getSwipeDirection(deltaX, deltaY);
            const touch = e.changedTouches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            
            if (element) {
                const swipeEvent = new CustomEvent('swipe', {
                    detail: {
                        direction: direction,
                        deltaX: deltaX,
                        deltaY: deltaY,
                        element: element
                    }
                });
                
                element.dispatchEvent(swipeEvent);
            }
        }
        
        /**
         * Get swipe direction
         */
        getSwipeDirection(deltaX, deltaY) {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                return deltaX > 0 ? 'right' : 'left';
            } else {
                return deltaY > 0 ? 'down' : 'up';
            }
        }
        
        /**
         * Setup touch feedback
         */
        setupTouchFeedback() {
            // Add touch feedback to interactive elements
            const interactiveElements = document.querySelectorAll('button, .btn, a, .task-item, [role="button"]');
            
            interactiveElements.forEach(element => {
                element.addEventListener('touchstart', () => {
                    element.classList.add('touch-feedback', 'active');
                }, { passive: true });
                
                element.addEventListener('touchend', () => {
                    setTimeout(() => {
                        element.classList.remove('active');
                    }, 150);
                }, { passive: true });
                
                element.addEventListener('touchcancel', () => {
                    element.classList.remove('active');
                }, { passive: true });
            });
        }
        
        /**
         * Add visual touch feedback
         */
        addTouchFeedback(element) {
            if (element.classList.contains('touch-feedback')) {
                element.classList.add('active');
                setTimeout(() => {
                    element.classList.remove('active');
                }, 300);
            }
        }
        
        /**
         * Provide haptic feedback
         */
        hapticFeedback(type = 'tap') {
            if (!this.hapticEnabled) return;
            
            const patterns = {
                tap: [10],
                start: [15],
                success: [10, 50, 10],
                error: [50],
                longpress: [20, 100, 20]
            };
            
            const pattern = patterns[type] || patterns.tap;
            navigator.vibrate(pattern);
        }
        
        /**
         * Prevent double touch issues
         */
        preventDoubleTouch() {
            let lastTouchEnd = 0;
            
            document.addEventListener('touchend', (e) => {
                const now = Date.now();
                if (now - lastTouchEnd <= 500) {
                    e.preventDefault();
                }
                lastTouchEnd = now;
            }, { passive: false });
        }
        
        /**
         * Optimize scrolling behavior
         */
        optimizeScrolling() {
            // Add momentum scrolling for iOS
            const scrollableElements = document.querySelectorAll('.task-list, .scrollable, [data-scroll]');
            
            scrollableElements.forEach(element => {
                element.style.webkitOverflowScrolling = 'touch';
                element.style.overscrollBehavior = 'contain';
            });
            
            // Prevent scroll bounce on main container
            document.body.style.overscrollBehavior = 'none';
        }
        
        /**
         * Setup accessibility features
         */
        setupAccessibilityFeatures() {
            // Add touch accessibility hints
            const touchElements = document.querySelectorAll('.task-item, [draggable="true"]');
            
            touchElements.forEach(element => {
                if (!element.getAttribute('aria-label')) {
                    element.setAttribute('aria-label', 'Draggable item. Long press to select, then drag to reorder.');
                }
                
                element.setAttribute('role', 'button');
                element.setAttribute('tabindex', '0');
            });
        }
        
        /**
         * Find scroll container for auto-scroll
         */
        findScrollContainer(element) {
            let parent = element.parentElement;
            
            while (parent) {
                const overflow = window.getComputedStyle(parent).overflow;
                if (overflow === 'scroll' || overflow === 'auto') {
                    return parent;
                }
                parent = parent.parentElement;
            }
            
            return document.documentElement;
        }
        
        /**
         * Handle auto-scroll during drag
         */
        handleAutoScroll(y) {
            const scrollContainer = this.dragState.scrollContainer;
            if (!scrollContainer) return;
            
            const containerRect = scrollContainer.getBoundingClientRect();
            const scrollZone = 50;
            
            if (y < containerRect.top + scrollZone) {
                // Scroll up
                scrollContainer.scrollTop -= 5;
            } else if (y > containerRect.bottom - scrollZone) {
                // Scroll down
                scrollContainer.scrollTop += 5;
            }
        }
        
        /**
         * Highlight drop zones
         */
        highlightDropZones(highlight) {
            const dropZones = document.querySelectorAll('.task-item, [data-drop-zone]');
            
            dropZones.forEach(zone => {
                if (zone !== this.dragState.dragElement) {
                    zone.classList.toggle('drop-zone-active', highlight);
                }
            });
        }
        
        /**
         * Update drop target highlighting
         */
        updateDropTarget(element) {
            // Remove previous highlighting
            document.querySelectorAll('.drop-target-hover').forEach(el => {
                el.classList.remove('drop-target-hover');
            });
            
            // Add new highlighting
            if (this.isValidDropTarget(element)) {
                element.classList.add('drop-target-hover');
            }
        }
        
        /**
         * Check if element is valid drop target
         */
        isValidDropTarget(element) {
            return element && 
                   element !== this.dragState.dragElement &&
                   (element.classList.contains('task-item') || 
                    element.classList.contains('drop-zone') ||
                    element.hasAttribute('data-drop-zone'));
        }
        
        /**
         * Perform drop operation
         */
        performDrop(dropTarget) {
            // Trigger existing drop logic
            const dropEvent = new CustomEvent('touchdrop', {
                detail: {
                    dragElement: this.dragState.dragElement,
                    dropTarget: dropTarget
                }
            });
            
            dropTarget.dispatchEvent(dropEvent);
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.touchOptimization = new TouchOptimization();
        });
    } else {
        window.touchOptimization = new TouchOptimization();
    }
})();