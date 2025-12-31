// Authentication UI Handler
// Handles login/register forms and user interface

(function() {
    // Wait for auth.js to load
    if (!window.auth) {
        console.error('Auth module not loaded!');
        return;
    }

    let currentUser = null;

    // DOM Elements
    const authModal = document.getElementById('auth-modal');
    const mainApp = document.getElementById('main-app');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const registerSwitch = document.getElementById('register-switch');
    const authMessage = document.getElementById('auth-message');
    const authMessageText = document.getElementById('auth-message-text');
    const userDisplayName = document.getElementById('user-display-name');
    const userMenuName = document.getElementById('user-menu-name');
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userMenu = document.getElementById('user-menu');
    const logoutBtn = document.getElementById('logout-btn');

    // Check authentication on page load
    async function checkAuth() {
        try {
            const result = await window.auth.checkAuth();

            if (result.authenticated) {
                currentUser = result.user;
                showMainApp();
            } else {
                showAuthModal();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            showAuthModal();
        }
    }

    function showAuthModal() {
        authModal.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }

    function showMainApp() {
        authModal.classList.add('hidden');
        mainApp.classList.remove('hidden');
        updateUserDisplay();

        // Trigger app initialization event
        window.dispatchEvent(new CustomEvent('app-ready'));
    }

    function updateUserDisplay() {
        if (currentUser) {
            if (userDisplayName) userDisplayName.textContent = currentUser.name || currentUser.email;
            if (userMenuName) userMenuName.textContent = currentUser.name || currentUser.email;
        }
    }

    function showMessage(message, type = 'error') {
        authMessage.className = `mt-4 p-3 rounded-lg ${type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`;
        authMessageText.className = `text-sm text-center ${type === 'success' ? 'text-emerald-400' : 'text-red-400'}`;
        authMessageText.textContent = message;
        authMessage.classList.remove('hidden');

        setTimeout(() => {
            authMessage.classList.add('hidden');
        }, 5000);
    }

    // Form switching
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            registerSwitch.classList.remove('hidden');
            authMessage.classList.add('hidden');
        });
    }

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            registerSwitch.classList.add('hidden');
            authMessage.classList.add('hidden');
        });
    }

    // User menu toggle
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('hidden');
        });
    }

    // Close user menu when clicking outside
    if (userMenu) {
        document.addEventListener('click', () => {
            userMenu.classList.add('hidden');
        });
    }

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const loginBtn = document.getElementById('login-btn');
        const loginBtnText = document.getElementById('login-btn-text');
        const loginSpinner = document.getElementById('login-spinner');

        // Show loading state
        loginBtnText.classList.add('hidden');
        loginSpinner.classList.remove('hidden');
        loginBtn.disabled = true;

        try {
            const result = await window.auth.login(email, password);

            if (result.success) {
                currentUser = result.user;
                showMainApp();
                showMessage('Welcome back!', 'success');
            } else {
                showMessage(result.error || 'Login failed');
            }
        } catch (error) {
            showMessage('Network error. Please try again.');
        } finally {
            // Reset loading state
            loginBtnText.classList.remove('hidden');
            loginSpinner.classList.add('hidden');
            loginBtn.disabled = false;
        }
    });

    // Register form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        const registerBtn = document.getElementById('register-btn');
        const registerBtnText = document.getElementById('register-btn-text');
        const registerSpinner = document.getElementById('register-spinner');

        if (password !== passwordConfirm) {
            showMessage('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            showMessage('Password must be at least 6 characters');
            return;
        }

        // Show loading state
        registerBtnText.classList.add('hidden');
        registerSpinner.classList.remove('hidden');
        registerBtn.disabled = true;

        try {
            const result = await window.auth.register(name, email, password);

            if (result.success) {
                currentUser = result.user;
                showMainApp();
                showMessage('Account created successfully!', 'success');
            } else {
                showMessage(result.error || 'Registration failed');
            }
        } catch (error) {
            showMessage('Network error. Please try again.');
        } finally {
            // Reset loading state
            registerBtnText.classList.remove('hidden');
            registerSpinner.classList.add('hidden');
            registerBtn.disabled = false;
        }
    });

    // Logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const result = await window.auth.logout();
                if (result.success) {
                    currentUser = null;
                    showAuthModal();

                    // Reset forms
                    loginForm.reset();
                    registerForm.reset();
                }
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });
    }

    // Initialize authentication check
    window.addEventListener('DOMContentLoaded', checkAuth);

    // Export current user getter
    window.getCurrentUser = () => currentUser;
})();
