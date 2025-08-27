// MagicUI Effects and Interactions for Weekly Planner

class MagicUIEffects {
    constructor() {
        this.init();
    }

    init() {
        this.createParticles();
        this.enhanceButtons();
        this.enhanceTaskCards();
        this.addSmoothScrolling();
        this.enhanceInputs();
        this.addHoverEffects();
        this.animateOnScroll();
        this.enhanceModals();
        this.createFloatingNav();
        this.enhanceBackground();
    }

    // Create floating particles
    createParticles() {
        const particleContainer = document.createElement('div');
        particleContainer.className = 'particles-container';
        particleContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        `;
        document.body.appendChild(particleContainer);

        const particleCount = window.innerWidth < 768 ? 20 : 50;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 15 + 's';
            particle.style.animationDuration = (15 + Math.random() * 10) + 's';
            particleContainer.appendChild(particle);
        }
    }

    // Enhance buttons with magnetic effect
    enhanceButtons() {
        const buttons = document.querySelectorAll('button, .btn');
        
        buttons.forEach(button => {
            // Skip if already enhanced
            if (button.dataset.magicEnhanced) return;
            button.dataset.magicEnhanced = 'true';
            
            // Add magnetic effect on mouse move
            button.addEventListener('mousemove', (e) => {
                const rect = button.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                const moveX = x * 0.1;
                const moveY = y * 0.1;
                
                button.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.02)`;
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = '';
            });
            
            // Add ripple effect on click
            button.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                ripple.className = 'ripple';
                ripple.style.cssText = `
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.5);
                    pointer-events: none;
                    animation: ripple-effect 0.6s ease-out;
                `;
                
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
                ripple.style.top = e.clientY - rect.top - size / 2 + 'px';
                
                this.style.position = 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);
                
                setTimeout(() => ripple.remove(), 600);
            });
        });
        
        // Add ripple animation if not exists
        if (!document.querySelector('#magic-ripple-style')) {
            const style = document.createElement('style');
            style.id = 'magic-ripple-style';
            style.textContent = `
                @keyframes ripple-effect {
                    from {
                        transform: scale(0);
                        opacity: 1;
                    }
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Enhance task cards with premium effects
    enhanceTaskCards() {
        const taskItems = document.querySelectorAll('.task-item');
        
        taskItems.forEach((card, index) => {
            // Skip if already enhanced
            if (card.dataset.magicEnhanced) return;
            card.dataset.magicEnhanced = 'true';
            
            // Add staggered animation on load
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
            
            // Add tilt effect on hover
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = ((y - centerY) / centerY) * -5;
                const rotateY = ((x - centerX) / centerX) * 5;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
            
            // Add glow effect
            const glow = document.createElement('div');
            glow.className = 'card-glow';
            glow.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                border-radius: inherit;
                opacity: 0;
                transition: opacity 0.3s;
                background: radial-gradient(circle at center, rgba(139, 92, 246, 0.3), transparent 70%);
                pointer-events: none;
            `;
            card.style.position = 'relative';
            card.appendChild(glow);
            
            card.addEventListener('mouseenter', () => {
                glow.style.opacity = '1';
            });
            
            card.addEventListener('mouseleave', () => {
                glow.style.opacity = '0';
            });
        });
    }

    // Add smooth scrolling animations
    addSmoothScrolling() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);
        
        // Observe all main content sections
        document.querySelectorAll('.glass-pane, .task-item, .modal-content').forEach(el => {
            observer.observe(el);
        });
        
        // Add animation styles if not exists
        if (!document.querySelector('#magic-scroll-style')) {
            const style = document.createElement('style');
            style.id = 'magic-scroll-style';
            style.textContent = `
                .animate-in {
                    animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }
                
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Enhance input fields
    enhanceInputs() {
        const inputs = document.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // Skip if already enhanced
            if (input.dataset.magicEnhanced) return;
            input.dataset.magicEnhanced = 'true';
            
            // Add focus glow effect
            input.addEventListener('focus', () => {
                input.style.transition = 'all 0.3s';
                input.classList.add('glowing');
            });
            
            input.addEventListener('blur', () => {
                input.classList.remove('glowing');
            });
            
            // Add typing animation for textareas
            if (input.tagName === 'TEXTAREA') {
                input.addEventListener('input', () => {
                    if (input.value.length > 0) {
                        input.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                    } else {
                        input.style.borderColor = '';
                    }
                });
            }
        });
    }

    // Add hover effects to interactive elements
    addHoverEffects() {
        // Add hover sound effect preparation (if Tone.js is loaded)
        const interactiveElements = document.querySelectorAll('button, .task-item, .clickable');
        
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                // Add subtle scale effect
                if (!el.style.transform.includes('scale')) {
                    el.style.transition = 'transform 0.2s';
                }
            });
        });
    }

    // Animate elements on scroll
    animateOnScroll() {
        let scrollTimeout;
        
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            document.body.style.pointerEvents = 'none';
            
            scrollTimeout = setTimeout(() => {
                document.body.style.pointerEvents = '';
            }, 100);
            
            // Parallax effect for background orbs
            const scrolled = window.pageYOffset;
            const orbs = document.querySelectorAll('.background-orb');
            
            orbs.forEach((orb, index) => {
                const speed = 0.5 + (index * 0.2);
                orb.style.transform = `translateY(${scrolled * speed}px)`;
            });
        });
    }

    // Enhance modals
    enhanceModals() {
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            // Skip if already enhanced
            if (modal.dataset.magicEnhanced) return;
            modal.dataset.magicEnhanced = 'true';
            
            const backdrop = modal;
            const content = modal.querySelector('.modal-content');
            
            if (content) {
                // Add blur to background when modal opens
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModalWithAnimation(modal);
                    }
                });
                
                // Enhance modal open animation
                const originalDisplay = modal.style.display;
                const showModal = () => {
                    modal.style.display = 'flex';
                    modal.style.opacity = '0';
                    content.style.transform = 'scale(0.9) translateY(20px)';
                    
                    setTimeout(() => {
                        modal.style.transition = 'opacity 0.3s';
                        modal.style.opacity = '1';
                        content.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                        content.style.transform = 'scale(1) translateY(0)';
                    }, 10);
                };
                
                // Store the show function for later use
                modal.showWithAnimation = showModal;
            }
        });
    }

    closeModalWithAnimation(modal) {
        const content = modal.querySelector('.modal-content');
        
        modal.style.opacity = '0';
        if (content) {
            content.style.transform = 'scale(0.9) translateY(20px)';
        }
        
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    // Create floating navigation
    createFloatingNav() {
        const header = document.querySelector('#user-info');
        
        if (header && !header.dataset.magicEnhanced) {
            header.dataset.magicEnhanced = 'true';
            
            // Add floating effect on scroll
            let lastScroll = 0;
            
            window.addEventListener('scroll', () => {
                const currentScroll = window.pageYOffset;
                
                if (currentScroll > 100) {
                    header.style.backdropFilter = 'blur(30px)';
                    header.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                } else {
                    header.style.backdropFilter = '';
                    header.style.backgroundColor = '';
                }
                
                lastScroll = currentScroll;
            });
        }
    }

    // Enhance background with dynamic gradients
    enhanceBackground() {
        const orbs = document.querySelectorAll('.background-orb');
        
        orbs.forEach((orb, index) => {
            // Add gradient variation
            const gradients = [
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
            ];
            
            orb.style.background = gradients[index % gradients.length];
            
            // Add morphing animation
            orb.style.animation = `magic-float ${20 + index * 5}s infinite ease-in-out`;
        });
        
        // Add background gradient animation
        if (!document.querySelector('#magic-bg-style')) {
            const style = document.createElement('style');
            style.id = 'magic-bg-style';
            style.textContent = `
                body::before {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: radial-gradient(ellipse at bottom, #1a0033 0%, #050505 100%);
                    z-index: -3;
                    animation: bg-pulse 10s ease-in-out infinite;
                }
                
                @keyframes bg-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.95; }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Initialize MagicUI effects when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.magicUI = new MagicUIEffects();
    });
} else {
    window.magicUI = new MagicUIEffects();
}

// Re-initialize when new content is added dynamically
window.reinitializeMagicUI = function() {
    if (window.magicUI) {
        window.magicUI.enhanceButtons();
        window.magicUI.enhanceTaskCards();
        window.magicUI.enhanceInputs();
        window.magicUI.addHoverEffects();
    }
};