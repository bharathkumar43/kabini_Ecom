import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, AuthState, LoginResponse } from '../types';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { performFullCleanup } from '../utils/sessionCleanup';

// Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string | null }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: true,
  error: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: action.payload, // Can be string (error) or null (no error)
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

// Context
interface AuthContextType extends AuthState {
  login: (method?: string, credentials?: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // Navigation effect - redirect to overview after successful authentication
  useEffect(() => {
    if (state.isAuthenticated && state.user && !state.isLoading) {
      console.log('🔐 AuthContext: User authenticated, should redirect to overview');
      // The actual navigation will be handled by the Login/SignUp components
      // This effect just logs the state change
    }
  }, [state.isAuthenticated, state.user, state.isLoading]);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔐 AuthContext: Checking authentication status on mount...');
        dispatch({ type: 'AUTH_START' });
        
        // Clear any stale authentication state first
        const currentTime = new Date();
        const expiresAt = authService.getExpiresAt();
        
        if (expiresAt) {
          const expiryTime = new Date(expiresAt);
          if (expiryTime <= currentTime) {
            console.log('🔐 AuthContext: Token expired, clearing stale tokens');
            authService.clearTokens();
            dispatch({ type: 'AUTH_FAILURE', payload: null });
            return;
          }
        }
        
        if (authService.isAuthenticated()) {
          console.log('🔐 AuthContext: User is authenticated, getting user info...');
          const user = await authService.getCurrentUser();
          if (user) {
            console.log('🔐 AuthContext: User info retrieved, dispatching AUTH_SUCCESS');
            
            // Store user data in localStorage for persistence
            try {
              localStorage.setItem('user', JSON.stringify(user));
              console.log('🔐 AuthContext: User data stored in localStorage on startup:', user);
            } catch (error) {
              console.warn('🔐 AuthContext: Failed to store user data in localStorage on startup:', error);
            }
            
            dispatch({ 
              type: 'AUTH_SUCCESS', 
              payload: { user, token: authService.getAccessToken()! } 
            });
          } else {
            console.log('🔐 AuthContext: Failed to get user info, clearing tokens');
            // Clear tokens on auth failure
            authService.clearTokens();
            dispatch({ type: 'AUTH_FAILURE', payload: 'Failed to get user information' });
          }
        } else {
          console.log('🔐 AuthContext: User is not authenticated');
          // Don't set error for normal "not authenticated" state
          // Only set error for actual authentication failures
          // Set the final state: not authenticated and not loading
          dispatch({ 
            type: 'AUTH_FAILURE', 
            payload: null // Use null to indicate no error, just not authenticated
          });
        }
      } catch (error) {
        console.error('🔐 AuthContext: Auth check error:', error);
        // Clear tokens on auth failure
        authService.clearTokens();
        dispatch({ 
          type: 'AUTH_FAILURE', 
          payload: error instanceof Error ? error.message : 'Authentication failed' 
        });
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (method: string = 'microsoft', credentials?: Record<string, unknown>) => {
    try {
      console.log('🔐 AuthContext: Starting login with method:', method);
      
      // Clear analysis data for fresh session (but preserve essential app data)
      performFullCleanup();
      
      // Clear any stale authentication data before starting new login
      console.log('🔐 AuthContext: Clearing stale authentication data...');
      authService.clearTokens();
      
      // Clear any conflicting localStorage data that might cause issues
      const conflictingKeys = [
        'llm_qa_current_session',
        'structure_last_saved',
        'overview_market_analysis'
      ];
      
      conflictingKeys.forEach(key => {
        try {
          if (localStorage.getItem(key)) {
            console.log(`🔐 AuthContext: Clearing conflicting localStorage key: ${key}`);
            localStorage.removeItem(key);
          }
        } catch (e) {
          console.warn(`🔐 AuthContext: Could not clear ${key}:`, e);
        }
      });
      
      dispatch({ type: 'AUTH_START' });
      
      let response: LoginResponse;
      
      switch (method) {
        case 'local':
          console.log('🔐 AuthContext: Using local login');
          response = await authService.localLogin(credentials as { email: string; password: string });
          break;
        case 'register':
          console.log('🔐 AuthContext: Using register method');
          response = await authService.register(credentials as { email: string; password: string; name: string; displayName?: string });
          break;
        case 'google':
          console.log('🔐 AuthContext: Using Google login');
          response = await authService.googleLogin();
          break;
        case 'microsoft':
        default:
          console.log('🔐 AuthContext: Using Microsoft login');
          response = await authService.login();
          break;
      }
      
      console.log('✅ AuthContext: Login successful, dispatching AUTH_SUCCESS with:', {
        user: response.user,
        hasToken: !!response.accessToken
      });
      
      // Verify that tokens were properly stored before dispatching success
      console.log('🔐 AuthContext: Verifying token storage...');
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure storage completes
      
      // Verify authentication status
      const isAuthValid = authService.isAuthenticated();
      const storedToken = authService.getAccessToken();
      
      console.log('🔐 AuthContext: Token verification:', {
        isAuthValid,
        hasStoredToken: !!storedToken,
        tokenMatches: storedToken === response.accessToken
      });
      
      if (!isAuthValid || !storedToken) {
        console.error('🔐 AuthContext: Token storage verification failed, clearing tokens and retrying...');
        authService.clearTokens();
        // Retry storing tokens
        authService.setTokens(response.accessToken, response.refreshToken, response.expiresAt);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify again
        const retryAuthValid = authService.isAuthenticated();
        const retryStoredToken = authService.getAccessToken();
        
        console.log('🔐 AuthContext: Retry verification:', {
          isAuthValid: retryAuthValid,
          hasStoredToken: !!retryStoredToken,
          tokenMatches: retryStoredToken === response.accessToken
        });
        
        if (!retryAuthValid || !retryStoredToken) {
          throw new Error('Failed to store authentication tokens');
        }
      }
      
      console.log('🔐 AuthContext: Dispatching AUTH_SUCCESS with user:', response.user);
      
      // Store user data in localStorage for persistence and user isolation
      try {
        localStorage.setItem('user', JSON.stringify(response.user));
        console.log('🔐 AuthContext: User data stored in localStorage:', response.user);
      } catch (error) {
        console.warn('🔐 AuthContext: Failed to store user data in localStorage:', error);
      }
      
      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { user: response.user, token: response.accessToken } 
      });
      console.log('🔐 AuthContext: AUTH_SUCCESS dispatched');
      
      // Check state after dispatch
      setTimeout(() => {
        console.log('🔐 AuthContext: State after dispatch:', {
          isAuthenticated: authService.isAuthenticated(),
          hasToken: !!authService.getAccessToken(),
          user: authService.getCurrentUser()
        });
      }, 100);
    } catch (error) {
      console.error('❌ AuthContext: Login failed:', error);
      // Clear tokens on login failure
      authService.clearTokens();
      dispatch({ 
        type: 'AUTH_FAILURE', 
        payload: error instanceof Error ? error.message : 'Login failed' 
      });
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authService.logout();
      
      // Clear analysis data for fresh session (but preserve essential app data)
      performFullCleanup();
      
      // Clear user data from localStorage
      try {
        localStorage.removeItem('user');
        console.log('🔐 AuthContext: User data cleared from localStorage on logout');
      } catch (error) {
        console.warn('🔐 AuthContext: Failed to clear user data from localStorage on logout:', error);
      }
      
      dispatch({ type: 'AUTH_LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear the state even if logout fails
      authService.clearTokens();
      
      // Clear user data from localStorage even on logout failure
      try {
        localStorage.removeItem('user');
        console.log('🔐 AuthContext: User data cleared from localStorage on logout failure');
      } catch (clearError) {
        console.warn('🔐 AuthContext: Failed to clear user data from localStorage on logout failure:', clearError);
      }
      
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Refresh user function
  const refreshUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        // Store user data in localStorage for persistence
        try {
          localStorage.setItem('user', JSON.stringify(user));
          console.log('🔐 AuthContext: User data refreshed in localStorage:', user);
        } catch (error) {
          console.warn('🔐 AuthContext: Failed to store refreshed user data in localStorage:', error);
        }
        
        dispatch({ 
          type: 'AUTH_SUCCESS', 
          payload: { user, token: authService.getAccessToken()! } 
        });
      } else {
        // Clear tokens on refresh failure
        authService.clearTokens();
        dispatch({ type: 'AUTH_FAILURE', payload: 'Failed to refresh user information' });
      }
    } catch (error) {
      // Clear tokens on refresh failure
      authService.clearTokens();
      dispatch({ 
        type: 'AUTH_FAILURE', 
        payload: error instanceof Error ? error.message : 'Failed to refresh user' 
      });
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    clearError,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 