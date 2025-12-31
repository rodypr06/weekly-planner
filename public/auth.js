// Local Authentication Module
// Replaces Supabase authentication with local session-based auth

class LocalAuth {
    constructor() {
        this.currentUser = null;
        this.authCheckInterval = null;
    }

    /**
     * Check if user is authenticated
     */
    async checkAuth() {
        try {
            const response = await fetch('/api/me', {
                credentials: 'include' // Important for cookies/session
            });

            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    this.currentUser = data.user;
                    return { authenticated: true, user: data.user };
                }
            }

            this.currentUser = null;
            return { authenticated: false, user: null };
        } catch (error) {
            console.error('Auth check error:', error);
            return { authenticated: false, user: null };
        }
    }

    /**
     * Register a new user
     */
    async register(name, email, password) {
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                return { success: true, user: data.user, error: null };
            }

            return { success: false, user: null, error: data.error };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, user: null, error: error.message };
        }
    }

    /**
     * Login user
     */
    async login(email, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                return { success: true, user: data.user, error: null };
            }

            return { success: false, user: null, error: data.error };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, user: null, error: error.message };
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                this.currentUser = null;
                return { success: true, error: null };
            }

            const data = await response.json();
            return { success: false, error: data.error };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Start periodic auth checking
     */
    startAuthCheck(callback, interval = 60000) {
        // Initial check
        this.checkAuth().then(callback);

        // Periodic checks
        this.authCheckInterval = setInterval(async () => {
            const result = await this.checkAuth();
            callback(result);
        }, interval);
    }

    /**
     * Stop periodic auth checking
     */
    stopAuthCheck() {
        if (this.authCheckInterval) {
            clearInterval(this.authCheckInterval);
            this.authCheckInterval = null;
        }
    }
}

// Create global instance
window.auth = new LocalAuth();
