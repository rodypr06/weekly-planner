/**
 * DOM manipulation utilities with security and performance optimizations
 * Provides safe methods for DOM updates, avoiding direct innerHTML usage
 */
(function() {
    'use strict';
    
    /**
     * DOM manipulation utilities
     */
    class DOMUtils {
        constructor() {
            // Cache for frequently accessed elements
            this.elementCache = new Map();
            
            // Fragment for batch operations
            this.fragment = null;
            
            // DOMPurify reference
            this.domPurify = window.DOMPurify || null;
            
            // Animation frame for optimized updates
            this.rafId = null;
        }
        
        /**
         * Safely create element with attributes and content
         * @param {string} tag - HTML tag name
         * @param {object} attributes - Attributes to set
         * @param {string|Node} content - Content to add
         * @returns {HTMLElement} - Created element
         */
        createElement(tag, attributes = {}, content = null) {
            const element = document.createElement(tag);
            
            // Set attributes safely
            for (const [key, value] of Object.entries(attributes)) {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'dataset') {
                    Object.assign(element.dataset, value);
                } else if (key.startsWith('on')) {
                    // Event listeners should be added separately
                    continue;
                } else {
                    element.setAttribute(key, value);
                }
            }
            
            // Add content safely
            if (content !== null) {
                if (typeof content === 'string') {
                    element.textContent = content;
                } else if (content instanceof Node) {
                    element.appendChild(content);
                }
            }
            
            return element;
        }
        
        /**
         * Safely update element content without innerHTML
         * @param {HTMLElement|string} element - Element or selector
         * @param {string} content - Content to set
         * @param {boolean} isHTML - Whether content contains HTML
         */
        updateContent(element, content, isHTML = false) {
            const el = typeof element === 'string' ? this.querySelector(element) : element;
            
            if (!el) {
                logger.warn('Element not found for content update');
                return;
            }
            
            if (isHTML && this.domPurify) {
                // Sanitize and parse HTML safely
                const sanitized = this.domPurify.sanitize(content);
                const temp = document.createElement('div');
                temp.innerHTML = sanitized;
                
                // Clear existing content
                while (el.firstChild) {
                    el.removeChild(el.firstChild);
                }
                
                // Move sanitized nodes
                while (temp.firstChild) {
                    el.appendChild(temp.firstChild);
                }
            } else {
                // Use textContent for plain text (safe)
                el.textContent = content;
            }
        }
        
        /**
         * Batch DOM updates for performance
         * @param {Function} updateFn - Function containing DOM updates
         */
        batchUpdate(updateFn) {
            // Cancel any pending update
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
            }
            
            // Schedule update in next animation frame
            this.rafId = requestAnimationFrame(() => {
                try {
                    updateFn();
                } catch (error) {
                    logger.error('Error in batch DOM update:', error);
                } finally {
                    this.rafId = null;
                }
            });
        }
        
        /**
         * Create document fragment for efficient DOM manipulation
         * @returns {DocumentFragment}
         */
        createFragment() {
            return document.createDocumentFragment();
        }
        
        /**
         * Append multiple elements efficiently
         * @param {HTMLElement} parent - Parent element
         * @param {Array<Node>} children - Children to append
         */
        appendChildren(parent, children) {
            const fragment = this.createFragment();
            
            children.forEach(child => {
                if (child instanceof Node) {
                    fragment.appendChild(child);
                }
            });
            
            parent.appendChild(fragment);
        }
        
        /**
         * Replace element content efficiently
         * @param {HTMLElement} element - Element to update
         * @param {Array<Node>} newChildren - New children
         */
        replaceChildren(element, newChildren) {
            // Clear existing content
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
            
            // Add new children
            this.appendChildren(element, newChildren);
        }
        
        /**
         * Cached querySelector
         * @param {string} selector - CSS selector
         * @param {boolean} useCache - Whether to use cache
         * @returns {HTMLElement|null}
         */
        querySelector(selector, useCache = true) {
            if (useCache && this.elementCache.has(selector)) {
                const cached = this.elementCache.get(selector);
                // Verify element is still in DOM
                if (document.body.contains(cached)) {
                    return cached;
                }
                // Remove stale cache entry
                this.elementCache.delete(selector);
            }
            
            const element = document.querySelector(selector);
            
            if (element && useCache) {
                this.elementCache.set(selector, element);
            }
            
            return element;
        }
        
        /**
         * Cached querySelectorAll
         * @param {string} selector - CSS selector
         * @returns {NodeList}
         */
        querySelectorAll(selector) {
            return document.querySelectorAll(selector);
        }
        
        /**
         * Add event listener with delegation
         * @param {string|HTMLElement} target - Target element or selector
         * @param {string} event - Event type
         * @param {string} delegateSelector - Selector for delegation
         * @param {Function} handler - Event handler
         */
        addDelegatedEventListener(target, event, delegateSelector, handler) {
            const element = typeof target === 'string' ? this.querySelector(target) : target;
            
            if (!element) {
                logger.warn('Target element not found for event listener');
                return;
            }
            
            element.addEventListener(event, (e) => {
                const delegateTarget = e.target.closest(delegateSelector);
                if (delegateTarget && element.contains(delegateTarget)) {
                    handler.call(delegateTarget, e);
                }
            });
        }
        
        /**
         * Toggle class with optional animation
         * @param {HTMLElement} element - Element to update
         * @param {string} className - Class to toggle
         * @param {boolean} force - Force add/remove
         */
        toggleClass(element, className, force) {
            if (!element) return;
            
            this.batchUpdate(() => {
                element.classList.toggle(className, force);
            });
        }
        
        /**
         * Show element with optional animation
         * @param {HTMLElement} element - Element to show
         * @param {string} displayType - Display type
         */
        show(element, displayType = 'block') {
            if (!element) return;
            
            this.batchUpdate(() => {
                element.style.display = displayType;
                element.setAttribute('aria-hidden', 'false');
            });
        }
        
        /**
         * Hide element
         * @param {HTMLElement} element - Element to hide
         */
        hide(element) {
            if (!element) return;
            
            this.batchUpdate(() => {
                element.style.display = 'none';
                element.setAttribute('aria-hidden', 'true');
            });
        }
        
        /**
         * Set multiple attributes at once
         * @param {HTMLElement} element - Element to update
         * @param {object} attributes - Attributes to set
         */
        setAttributes(element, attributes) {
            if (!element) return;
            
            this.batchUpdate(() => {
                for (const [key, value] of Object.entries(attributes)) {
                    if (value === null || value === undefined) {
                        element.removeAttribute(key);
                    } else {
                        element.setAttribute(key, value);
                    }
                }
            });
        }
        
        /**
         * Create and insert element before reference
         * @param {HTMLElement} reference - Reference element
         * @param {string} tag - Tag name
         * @param {object} attributes - Attributes
         * @param {string} content - Content
         * @returns {HTMLElement} - Created element
         */
        insertBefore(reference, tag, attributes = {}, content = null) {
            if (!reference || !reference.parentNode) return null;
            
            const element = this.createElement(tag, attributes, content);
            reference.parentNode.insertBefore(element, reference);
            return element;
        }
        
        /**
         * Create and insert element after reference
         * @param {HTMLElement} reference - Reference element
         * @param {string} tag - Tag name
         * @param {object} attributes - Attributes
         * @param {string} content - Content
         * @returns {HTMLElement} - Created element
         */
        insertAfter(reference, tag, attributes = {}, content = null) {
            if (!reference || !reference.parentNode) return null;
            
            const element = this.createElement(tag, attributes, content);
            reference.parentNode.insertBefore(element, reference.nextSibling);
            return element;
        }
        
        /**
         * Remove element safely
         * @param {HTMLElement|string} element - Element or selector
         */
        removeElement(element) {
            const el = typeof element === 'string' ? this.querySelector(element) : element;
            
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
                
                // Clear from cache if present
                for (const [selector, cached] of this.elementCache.entries()) {
                    if (cached === el) {
                        this.elementCache.delete(selector);
                        break;
                    }
                }
            }
        }
        
        /**
         * Clear cache
         */
        clearCache() {
            this.elementCache.clear();
        }
        
        /**
         * Measure element for performance optimization
         * @param {HTMLElement} element - Element to measure
         * @returns {object} - Dimensions
         */
        measureElement(element) {
            if (!element) return null;
            
            return {
                width: element.offsetWidth,
                height: element.offsetHeight,
                top: element.offsetTop,
                left: element.offsetLeft,
                scrollWidth: element.scrollWidth,
                scrollHeight: element.scrollHeight
            };
        }
        
        /**
         * Optimize large list rendering with virtual scrolling
         * @param {HTMLElement} container - Container element
         * @param {Array} items - Items to render
         * @param {Function} renderItem - Item render function
         * @param {number} itemHeight - Height of each item
         */
        virtualScroll(container, items, renderItem, itemHeight = 50) {
            const visibleHeight = container.clientHeight;
            const totalHeight = items.length * itemHeight;
            const visibleCount = Math.ceil(visibleHeight / itemHeight);
            const scrollTop = container.scrollTop;
            const startIndex = Math.floor(scrollTop / itemHeight);
            const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
            
            // Create spacer for scroll
            const spacer = this.createElement('div', {
                style: `height: ${totalHeight}px; position: relative;`
            });
            
            // Render visible items
            const fragment = this.createFragment();
            
            for (let i = startIndex; i < endIndex; i++) {
                const itemElement = renderItem(items[i], i);
                itemElement.style.position = 'absolute';
                itemElement.style.top = `${i * itemHeight}px`;
                fragment.appendChild(itemElement);
            }
            
            // Update container
            this.replaceChildren(container, [spacer]);
            spacer.appendChild(fragment);
        }
    }
    
    // Create global instance
    window.domUtils = new DOMUtils();
    
    // Export for modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = DOMUtils;
    }
    if (typeof define === 'function' && define.amd) {
        define([], function() { return DOMUtils; });
    }
})();