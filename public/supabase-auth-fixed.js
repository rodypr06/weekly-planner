// Supabase Authentication Module - Fixed Version
// This file contains the enhanced authentication logic for Supabase integration

// Configuration will be loaded from server
let supabaseConfig = null;
let supabase;
let currentUser = null;
let currentSession = null;

// Load configuration from server
async function loadSupabaseConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error('Failed to load configuration');
        }
        supabaseConfig = await response.json();
        return supabaseConfig;
    } catch (error) {
        console.error('Error loading Supabase configuration:', error);
        throw error;
    }
}

// Initialize Supabase client
async function initializeSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase client not loaded. Make sure to include the Supabase CDN script.');
        return false;
    }
    
    try {
        // Load configuration if not already loaded
        if (!supabaseConfig) {
            await loadSupabaseConfig();
        }
        
        supabase = window.supabase.createClient(supabaseConfig.supabaseUrl, supabaseConfig.supabaseAnonKey);
        console.log('Supabase client initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        return false;
    }
}

// Authentication Management
const SupabaseAuth = {
    // Check current authentication status
    async checkAuth() {
        try {
            if (!supabase) {
                console.error('Supabase client not initialized');
                return { authenticated: false };
            }
            
            console.log('Checking authentication status...');
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('Error checking auth:', error);
                return { authenticated: false, error: error.message };
            }
            
            console.log('Session from Supabase:', session ? 'Session exists' : 'No session');
            
            // Check for active session from Supabase
            if (session?.user && session.access_token) {
                console.log('Valid Supabase session found');
                currentUser = session.user;
                currentSession = session;
                
                // Store session for API calls based on user preference
                const stayLoggedIn = localStorage.getItem('supabase-stay-logged-in');
                if (stayLoggedIn !== 'false') {
                    localStorage.setItem('supabase-session', JSON.stringify(session));
                } else {
                    sessionStorage.setItem('supabase-temp-session', JSON.stringify(session));
                }
                
                return {
                    authenticated: true,
                    user: {
                        id: session.user.id,
                        email: session.user.email,
                        username: session.user.user_metadata?.username || session.user.email
                    }
                };
            }
            
            // Try to restore from stored session
            const stayLoggedIn = localStorage.getItem('supabase-stay-logged-in');
            console.log('Stay logged in preference:', stayLoggedIn);
            
            let storedSession = null;
            
            if (stayLoggedIn !== 'false') {
                // Check localStorage for persistent session
                const persistentSession = localStorage.getItem('supabase-session');
                if (persistentSession) {
                    try {
                        storedSession = JSON.parse(persistentSession);
                        console.log('Found stored persistent session');
                    } catch (error) {
                        console.error('Error parsing persistent session:', error);
                        localStorage.removeItem('supabase-session');
                    }
                }
            } else {
                // Check sessionStorage for temporary session
                const tempSession = sessionStorage.getItem('supabase-temp-session');
                if (tempSession) {
                    try {
                        storedSession = JSON.parse(tempSession);
                        console.log('Found stored temporary session');
                    } catch (error) {
                        console.error('Error parsing temporary session:', error);
                        sessionStorage.removeItem('supabase-temp-session');
                    }
                }
            }
            
            // Validate and refresh stored session
            if (storedSession && storedSession.access_token && storedSession.refresh_token) {
                // Check if session is still valid
                const expiresAt = storedSession.expires_at;
                const now = Math.floor(Date.now() / 1000);
                
                if (expiresAt && expiresAt > now) {
                    console.log('Stored session is still valid, restoring...');
                    
                    // Try to restore the session
                    try {
                        const { data: { session: restoredSession }, error: restoreError } = 
                            await supabase.auth.setSession({
                                access_token: storedSession.access_token,
                                refresh_token: storedSession.refresh_token
                            });
                        
                        if (restoredSession && !restoreError) {
                            console.log('Session restored successfully');
                            currentUser = restoredSession.user;
                            currentSession = restoredSession;
                            
                            // Update stored session with potentially refreshed tokens
                            if (stayLoggedIn !== 'false') {
                                localStorage.setItem('supabase-session', JSON.stringify(restoredSession));
                            } else {
                                sessionStorage.setItem('supabase-temp-session', JSON.stringify(restoredSession));
                            }
                            
                            return {
                                authenticated: true,
                                user: {
                                    id: restoredSession.user.id,
                                    email: restoredSession.user.email,
                                    username: restoredSession.user.user_metadata?.username || restoredSession.user.email
                                }
                            };
                        } else {
                            console.log('Session restore failed:', restoreError);
                        }
                    } catch (restoreError) {
                        console.error('Error restoring session:', restoreError);
                    }
                } else {
                    console.log('Stored session expired, cleaning up');
                }
                
                // Clean up expired or invalid session
                localStorage.removeItem('supabase-session');
                sessionStorage.removeItem('supabase-temp-session');
            }
            
            console.log('No valid session found, user needs to log in');
            return { authenticated: false };
        } catch (error) {
            console.error('Auth check error:', error);
            return { authenticated: false, error: error.message };
        }
    },

    // Login with email and password
    async login(email, password, stayLoggedIn = true) {
        try {
            if (!supabase) {
                return { success: false, error: 'Supabase client not initialized' };
            }
            
            console.log('Attempting login for:', email);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                console.error('Login error:', error);
                return { success: false, error: error.message };
            }
            
            if (data.session && data.user) {
                console.log('Login successful');
                currentUser = data.user;
                currentSession = data.session;
                
                // Store session preference and session data
                localStorage.setItem('supabase-stay-logged-in', stayLoggedIn.toString());
                
                if (stayLoggedIn) {
                    localStorage.setItem('supabase-session', JSON.stringify(data.session));
                } else {
                    sessionStorage.setItem('supabase-temp-session', JSON.stringify(data.session));
                }
                
                return {
                    success: true,
                    user: {
                        id: data.user.id,
                        email: data.user.email,
                        username: data.user.user_metadata?.username || data.user.email
                    }
                };
            }
            
            return { success: false, error: 'Login failed - no session created' };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    },

    // Register new user
    async register(email, password, username) {
        try {
            if (!supabase) {
                return { success: false, error: 'Supabase client not initialized' };
            }
            
            console.log('Attempting registration for:', email);
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username || email.split('@')[0]
                    }
                }
            });
            
            if (error) {
                console.error('Registration error:', error);
                return { success: false, error: error.message };
            }
            
            // For email confirmation, user won't be immediately signed in
            if (data.user && !data.user.email_confirmed_at) {
                return {
                    success: true,
                    message: 'Please check your email to confirm your account',
                    needsConfirmation: true
                };
            }
            
            // If user is confirmed and signed in
            if (data.session && data.user) {
                currentUser = data.user;
                currentSession = data.session;
                
                // Default to staying logged in for new users
                localStorage.setItem('supabase-stay-logged-in', 'true');
                localStorage.setItem('supabase-session', JSON.stringify(data.session));
                
                return {
                    success: true,
                    user: {
                        id: data.user.id,
                        email: data.user.email,
                        username: data.user.user_metadata?.username || data.user.email
                    }
                };
            }
            
            return { success: false, error: 'Registration completed but no session created' };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    },

    // Logout
    async logout() {
        try {
            if (!supabase) {
                return { success: false, error: 'Supabase client not initialized' };
            }
            
            console.log('Attempting logout');
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('Logout error:', error);
                return { success: false, error: error.message };
            }
            
            // Clear all auth data
            currentUser = null;
            currentSession = null;
            
            // Clean up stored sessions
            localStorage.removeItem('supabase-stay-logged-in');
            localStorage.removeItem('supabase-session');
            sessionStorage.removeItem('supabase-temp-session');
            
            console.log('Logout successful');
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    },

    // Get current session token for API calls
    getAuthToken() {
        return currentSession?.access_token || null;
    },

    // Get current user
    getCurrentUser() {
        return currentUser;
    },

    // Set up auth state change listener
    onAuthStateChange(callback) {
        if (!supabase) {
            console.error('Supabase client not initialized');
            return null;
        }
        return supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            currentSession = session;
            currentUser = session?.user || null;
            
            // Update stored session based on preferences
            if (session) {
                const stayLoggedIn = localStorage.getItem('supabase-stay-logged-in');
                if (stayLoggedIn !== 'false') {
                    localStorage.setItem('supabase-session', JSON.stringify(session));
                } else {
                    sessionStorage.setItem('supabase-temp-session', JSON.stringify(session));
                }
            } else {
                // Clear stored sessions on signout
                localStorage.removeItem('supabase-session');
                sessionStorage.removeItem('supabase-temp-session');
            }
            
            callback(event, session);
        });
    }
};

// Enhanced API helper functions with better error handling
const ApiClient = {
    // Get auth headers for API calls
    getAuthHeaders() {
        const token = SupabaseAuth.getAuthToken();
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log('Adding auth header for API call');
        } else {
            console.warn('No auth token available for API call');
        }
        
        return headers;
    },

    // Enhanced fetch with auth and error handling
    async authenticatedFetch(url, options = {}) {
        const headers = {
            ...this.getAuthHeaders(),
            ...options.headers
        };
        
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        if (response.status === 401) {
            console.error('API call failed: Authentication required');
            // Trigger re-authentication
            window.location.reload();
            throw new Error('Authentication required');
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API call failed: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`API Error: ${response.statusText}`);
        }
        
        return response;
    },

    // Fetch tasks with auth
    async fetchTasks(date, includeArchived = false) {
        try {
            const params = new URLSearchParams({ date });
            if (includeArchived) {
                params.append('includeArchived', 'true');
            }
            
            const response = await this.authenticatedFetch(`/api/tasks?${params}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching tasks:', error);
            throw error;
        }
    },

    // Save task with auth
    async saveTask(task) {
        try {
            const response = await this.authenticatedFetch('/api/tasks', {
                method: 'POST',
                body: JSON.stringify(task)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error saving task:', error);
            throw error;
        }
    },

    // Update task with auth
    async updateTask(id, updates) {
        try {
            const response = await this.authenticatedFetch(`/api/tasks/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    },

    // Delete task with auth
    async deleteTask(id) {
        try {
            const response = await this.authenticatedFetch(`/api/tasks/${id}`, {
                method: 'DELETE'
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    },

    // Generate AI suggestions with auth
    async generateAISuggestions(goal, date) {
        try {
            const response = await this.authenticatedFetch('/api/generate-tasks', {
                method: 'POST',
                body: JSON.stringify({ goal, date })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error generating AI suggestions:', error);
            throw error;
        }
    },

    // Smart planning with auth
    async smartPlanning(tasks, date) {
        try {
            const response = await this.authenticatedFetch('/api/smart-plan', {
                method: 'POST',
                body: JSON.stringify({ tasks, date })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error with smart planning:', error);
            throw error;
        }
    }
};

// Make functions globally available
window.initializeSupabase = initializeSupabase;
window.SupabaseAuth = SupabaseAuth;
window.ApiClient = ApiClient;