// ═══════════════════════════════════════════════
//  REAL DATABASE (PHP/MySQL API Client)
// ═══════════════════════════════════════════════

// Configure your API base URL here
const API_BASE_URL = 'api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}/${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };
    
    try {
        const response = await fetch(url, config);
        const text = await response.text();
        
        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            // If not JSON, show the raw response for debugging
            console.error('API Error (non-JSON response):', text.substring(0, 500));
            throw new Error(`API Error: ${response.status} ${response.statusText}. Check console for details.`);
        }
        
        if (!response.ok) {
            throw new Error(data.error || `API Error: ${response.status} ${response.statusText}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Database API
const DB = {
    // Initialize database connection check
    async init() {
        try {
            // Test connection by getting session
            const session = this.session.get();
            if (session) {
                const valid = await this.session.validate();
                if (!valid) {
                    this.session.clear();
                }
            }
            return true;
        } catch (e) {
            console.warn('Database connection issue, falling back to localStorage');
            return this.initLocalStorage();
        }
    },
    
    // Fallback to localStorage if API fails
    initLocalStorage() {
        if (!localStorage.getItem('tq_db_version')) {
            localStorage.setItem('tq_db_version', '1.0');
            localStorage.setItem('tq_users', JSON.stringify([]));
            localStorage.setItem('tq_leaderboard', JSON.stringify([]));
            localStorage.setItem('tq_sessions', JSON.stringify([]));
        }
        return false;
    },
    
    // Check if using localStorage fallback
    isUsingLocalStorage() {
        return localStorage.getItem('tq_db_version') !== null;
    },
    
    // Users table operations
    users: {
        async getAll() {
            return apiCall('users.php?action=getAll');
        },
        
        async findByUsername(username) {
            return apiCall(`users.php?action=findByUsername&username=${encodeURIComponent(username)}`);
        },
        
        async getCurrentUser() {
            const session = DB.session.get();
            if (!session) return null;
            return apiCall(`users.php?action=current&session_token=${session.session_token}`);
        },
        
        async create(userData) {
            return apiCall('users.php?action=create', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        },
        
        async login(username, password) {
            return apiCall('users.php?action=login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
        },
        
        async update(userId, updates, sessionToken) {
            const data = { ...updates, user_id: userId, session_token: sessionToken };
            return apiCall('users.php', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },
        
        async logout() {
            const session = DB.session.get();
            if (session) {
                await apiCall(`users.php?session_token=${session.session_token}`, {
                    method: 'DELETE'
                });
            }
        }
    },
    
    // Leaderboard table operations
    leaderboard: {
        async getAll() {
            return apiCall('leaderboard.php?action=getAll');
        },
        
        async getTop(limit = 10) {
            return apiCall(`leaderboard.php?action=getTop&limit=${limit}`);
        },
        
        async getByUser(userId) {
            return apiCall(`leaderboard.php?action=getByUser&user_id=${userId}`);
        },
        
        async add(scoreData) {
            const session = DB.session.get();
            if (!session) throw new Error('No session found');
            
            return apiCall('leaderboard.php', {
                method: 'POST',
                body: JSON.stringify({
                    ...scoreData,
                    session_token: session.session_token
                })
            });
        }
    },
    
    // Session management
    session: {
        set(userData) {
            localStorage.setItem('tq_current_session', JSON.stringify({
                user_id: userData.user_id,
                username: userData.username,
                session_token: userData.session_token,
                loginTime: new Date().toISOString()
            }));
        },
        
        get() {
            try {
                const session = localStorage.getItem('tq_current_session');
                return session ? JSON.parse(session) : null;
            } catch (e) {
                return null;
            }
        },
        
        clear() {
            localStorage.removeItem('tq_current_session');
        },
        
        async validate() {
            const session = this.get();
            if (!session) return false;
            
            try {
                const result = await apiCall(`session.php?session_token=${session.session_token}`);
                return result.valid || false;
            } catch (e) {
                return false;
            }
        },
        
        async refresh() {
            const session = this.get();
            if (!session) return false;
            
            try {
                await apiCall(`session.php?session_token=${session.session_token}`, {
                    method: 'PUT'
                });
                return true;
            } catch (e) {
                return false;
            }
        }
    }
};

// Auto-initialize on load
DB.init();
