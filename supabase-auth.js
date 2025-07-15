// Supabase Authentication Module
// This file contains the new authentication logic for Supabase integration

// Initialize Supabase client (will be loaded from CDN)
const SUPABASE_URL = 'https://buvzbxinbrfrfssvyagk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dnpieGluYnJmcmZzc3Z5YWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDQ4MzQsImV4cCI6MjA2ODE4MDgzNH0.3Tj-Y-EcCly8Yf2VPvEMM_NWDT6dxQuvga5vW_EATco';

let supabase;
let currentUser = null;
let currentSession = null;

// Initialize Supabase client
function initializeSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase client not loaded. Make sure to include the Supabase CDN script.');
        return false;
    }
    
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
}

// Authentication Management
const SupabaseAuth = {
    // Check current authentication status
    async checkAuth() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('Error checking auth:', error);
                return null;
            }
            
            if (session?.user) {
                currentUser = session.user;
                currentSession = session;
                return {
                    authenticated: true,
                    user: {
                        id: session.user.id,
                        email: session.user.email,
                        username: session.user.user_metadata?.username || session.user.email
                    }
                };
            }
            
            return { authenticated: false };
        } catch (error) {
            console.error('Auth check failed:', error);
            return { authenticated: false };
        }
    },

    // Login with email and password
    async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                return { success: false, error: error.message };
            }
            
            currentUser = data.user;
            currentSession = data.session;
            
            return {
                success: true,
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    username: data.user.user_metadata?.username || data.user.email
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Register new user
    async register(email, password, username) {
        try {
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
                return { success: false, error: error.message };
            }
            
            // For email confirmation flow
            if (data.user && !data.session) {
                return {
                    success: true,
                    needsConfirmation: true,
                    message: 'Please check your email to confirm your account.'
                };
            }
            
            currentUser = data.user;
            currentSession = data.session;
            
            return {
                success: true,
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    username: data.user.user_metadata?.username || data.user.email
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Logout
    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('Logout error:', error);
                return { success: false, error: error.message };
            }
            
            currentUser = null;
            currentSession = null;
            
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

    // Set up auth state change listener
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange((event, session) => {
            currentSession = session;
            currentUser = session?.user || null;
            
            callback(event, session);
        });
    }
};

// Updated API helper functions with Supabase auth
const ApiClient = {
    // Get auth headers for API calls
    getAuthHeaders() {
        const token = SupabaseAuth.getAuthToken();
        return token ? {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        } : {
            'Content-Type': 'application/json'
        };
    },

    // Fetch tasks with auth
    async fetchTasks(date, includeArchived = false) {
        try {
            const params = new URLSearchParams({ date });
            if (includeArchived) {
                params.append('includeArchived', 'true');
            }
            
            const response = await fetch(`/api/tasks?${params}`, {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch tasks: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching tasks:', error);
            throw error;
        }
    },

    // Save task with auth
    async saveTask(task) {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(task)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save task: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error saving task:', error);
            throw error;
        }
    },

    // Update task with auth
    async updateTask(id, updates) {
        try {
            const response = await fetch(`/api/tasks/${id}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update task: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    },

    // Delete task with auth
    async deleteTask(id) {
        try {
            const response = await fetch(`/api/tasks/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete task: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    },

    // Clear all tasks with auth
    async clearAllTasks() {
        try {
            const response = await fetch('/api/tasks', {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Failed to clear tasks: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error clearing tasks:', error);
            throw error;
        }
    },

    // Archive tasks with auth
    async archiveTasks(date) {
        try {
            const response = await fetch('/api/tasks/archive', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ date })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to archive tasks: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error archiving tasks:', error);
            throw error;
        }
    },

    // Unarchive tasks with auth
    async unarchiveTasks(taskIds) {
        try {
            const response = await fetch('/api/tasks/unarchive', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ taskIds })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to unarchive tasks: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error unarchiving tasks:', error);
            throw error;
        }
    },

    // Reorder tasks with auth
    async reorderTasks(taskOrders) {
        try {
            console.log('Sending reorder request:', taskOrders);
            const response = await fetch('/api/tasks/reorder', {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ taskOrders })
            });
            
            const responseText = await response.text();
            console.log('Reorder response:', response.status, responseText);
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                let needsMigration = false;
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error || errorMessage;
                    needsMigration = errorData.needsMigration || false;
                } catch (e) {
                    errorMessage = responseText || errorMessage;
                }
                
                const error = new Error(errorMessage);
                error.needsMigration = needsMigration;
                throw error;
            }
            
            return JSON.parse(responseText);
        } catch (error) {
            console.error('Error reordering tasks:', error);
            throw error;
        }
    },

    // Call Gemini AI with auth
    async callGemini(prompt) {
        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ prompt })
            });
            
            if (!response.ok) {
                throw new Error(`AI request failed with status ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts.length > 0) {
                return result.candidates[0].content.parts[0].text;
            }
            
            throw new Error("Invalid response structure from AI API.");
        } catch (error) {
            console.error("Gemini API call failed:", error);
            throw error;
        }
    }
};

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SupabaseAuth, ApiClient };
} else {
    // Make ApiClient and SupabaseAuth globally available in browser
    window.ApiClient = ApiClient;
    window.SupabaseAuth = SupabaseAuth;
}