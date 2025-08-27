// Debug Helper for Weekly Planner - Client Side Debugging

// Enhanced console logging with timestamps
window.debugAuth = {
    log: (message, data = null) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] AUTH DEBUG:`, message, data || '');
    },
    
    error: (message, error = null) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] AUTH ERROR:`, message, error || '');
    },
    
    // Test authentication flow
    async testAuth() {
        this.log('Starting authentication test...');
        
        try {
            // Test 1: Config endpoint
            this.log('Test 1: Checking config endpoint');
            const configResponse = await fetch('/api/config');
            const config = await configResponse.json();
            this.log('Config loaded:', config.supabaseUrl ? 'URL present' : 'No URL');
            
            // Test 2: Supabase initialization
            this.log('Test 2: Testing Supabase initialization');
            if (typeof window.supabase !== 'undefined') {
                this.log('Supabase client available');
            } else {
                this.error('Supabase client not available');
                return false;
            }
            
            // Test 3: Check current session
            this.log('Test 3: Checking current session');
            if (window.SupabaseAuth) {
                const authStatus = await window.SupabaseAuth.checkAuth();
                this.log('Auth status:', authStatus);
                return authStatus;
            } else {
                this.error('SupabaseAuth not available');
                return false;
            }
            
        } catch (error) {
            this.error('Auth test failed:', error);
            return false;
        }
    },
    
    // Test API endpoints
    async testAPI() {
        this.log('Starting API test...');
        
        try {
            // Test authenticated endpoint
            const headers = window.ApiClient ? window.ApiClient.getAuthHeaders() : {};
            this.log('Using headers:', headers);
            
            const response = await fetch('/api/tasks?date=2025-01-27', {
                headers
            });
            
            this.log('API response status:', response.status);
            
            if (response.status === 401) {
                this.error('API returned 401 - authentication required');
                return false;
            }
            
            if (response.ok) {
                const data = await response.json();
                this.log('API test successful, tasks:', data.length || 0);
                return true;
            } else {
                const errorText = await response.text();
                this.error('API test failed:', errorText);
                return false;
            }
            
        } catch (error) {
            this.error('API test failed:', error);
            return false;
        }
    },
    
    // Full system test
    async fullTest() {
        this.log('Starting full system test...');
        
        const authTest = await this.testAuth();
        if (!authTest || !authTest.authenticated) {
            this.error('Authentication test failed');
            return false;
        }
        
        const apiTest = await this.testAPI();
        if (!apiTest) {
            this.error('API test failed');
            return false;
        }
        
        this.log('Full system test PASSED ✅');
        return true;
    },
    
    // Get debug info
    getDebugInfo() {
        return {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            currentUrl: window.location.href,
            localStorage: {
                stayLoggedIn: localStorage.getItem('supabase-stay-logged-in'),
                hasSession: !!localStorage.getItem('supabase-session')
            },
            sessionStorage: {
                hasTempSession: !!sessionStorage.getItem('supabase-temp-session')
            },
            supabaseAvailable: typeof window.supabase !== 'undefined',
            authModuleAvailable: typeof window.SupabaseAuth !== 'undefined',
            apiClientAvailable: typeof window.ApiClient !== 'undefined'
        };
    }
};

// Auto-run basic checks on load
window.addEventListener('load', () => {
    setTimeout(() => {
        console.log('=== WEEKLY PLANNER DEBUG INFO ===');
        console.log(window.debugAuth.getDebugInfo());
        console.log('===================================');
        
        // Auto-test if user is authenticated
        if (window.SupabaseAuth) {
            window.SupabaseAuth.checkAuth().then(auth => {
                if (auth && auth.authenticated) {
                    console.log('🚀 Run window.debugAuth.testAPI() to test authenticated endpoints');
                } else {
                    console.log('🔒 User not authenticated - login required for API tests');
                }
            });
        }
    }, 2000);
});