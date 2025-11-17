/**
 * Authentication Context
 *
 * Provides global authentication state and methods to the entire application.
 *
 * Features:
 * - Current user state management
 * - Login/logout methods
 * - Authentication status (loading, authenticated, error)
 * - Automatic session restoration on app load
 * - Role-based access control helpers
 *
 * Usage:
 * ```javascript
 * import { useAuth } from '@/contexts/AuthContext';
 *
 * function MyComponent() {
 *   const { user, login, logout, loading } = useAuth();
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (!user) return <LoginForm />;
 *
 *   return <div>Welcome, {user.first_name}!</div>;
 * }
 * ```
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { client } from '@/lib/directus';
import { readMe } from '@directus/sdk';

/**
 * Authentication Context
 */
const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
  refetch: async () => {},
  isAuthenticated: false,
  isCoach: false,
  isAdmin: false,
});

/**
 * Authentication Provider Component
 *
 * Wraps the application and provides auth state to all children.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Check if user is already authenticated (on app load)
   * Attempts to fetch current user using existing session cookie
   */
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Check Authentication Status
   * Fetches current user from Directus /users/me endpoint
   */
  const checkAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch current user with extended tennis fields
      const currentUser = await client.request(
        readMe({
          fields: [
            '*',
            'role.name',
            'role.admin_access',
            'avatar.id',
            'avatar.filename_disk',
          ],
        })
      );

      setUser(currentUser);
    } catch (err) {
      // User not authenticated (401) or session expired
      setUser(null);
      setError(null); // Not an error, just not logged in
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login User
   *
   * @param {string} email - User email
   * @param {string} password - User password
   * @throws {Error} If login fails
   */
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      // Directus SDK login (sets cookie automatically)
      await client.login(email, password);

      // Fetch user data after successful login
      await checkAuth();
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register New User
   *
   * @param {Object} userData - User registration data
   * @param {string} userData.email - Email
   * @param {string} userData.password - Password
   * @param {string} userData.first_name - First name
   * @param {string} userData.last_name - Last name
   * @throws {Error} If registration fails
   */
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      // Create user via Directus API
      const response = await fetch(`${import.meta.env.VITE_DIRECTUS_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          role: null, // Will be assigned default role by Directus
          status: 'active',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0]?.message || 'Registration failed');
      }

      // Auto-login after successful registration
      await login(userData.email, userData.password);
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout User
   * Clears session cookie and resets user state
   */
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);

      // Directus SDK logout (clears cookie)
      await client.logout();

      setUser(null);
    } catch (err) {
      setError(err.message || 'Logout failed');
      // Clear user state anyway
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Computed Authentication Helpers
   */
  const isAuthenticated = !!user;
  const isCoach = user?.role?.name === 'Coach' || user?.role?.admin_access === true;
  const isAdmin = user?.role?.admin_access === true;

  /**
   * Context Value
   */
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register,
    refetch: checkAuth,
    isAuthenticated,
    isCoach,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 *
 * Convenience hook to access authentication context.
 *
 * @returns {Object} Auth context value
 * @throws {Error} If used outside AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default AuthContext;
