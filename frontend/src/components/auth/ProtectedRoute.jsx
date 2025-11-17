/**
 * Protected Route Component
 *
 * Wrapper component for routes that require authentication.
 * Redirects unauthenticated users to login page.
 * Optionally restricts access based on user roles.
 *
 * Features:
 * - Authentication check
 * - Role-based access control
 * - Loading state handling
 * - Automatic redirect to login
 *
 * Usage:
 * ```javascript
 * <Route path="/dashboard" element={
 *   <ProtectedRoute>
 *     <Dashboard />
 *   </ProtectedRoute>
 * } />
 *
 * // Require coach role
 * <Route path="/admin" element={
 *   <ProtectedRoute requireCoach>
 *     <AdminPanel />
 *   </ProtectedRoute>
 * } />
 * ```
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Protected Route Component
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Protected content
 * @param {boolean} props.requireCoach - Require coach/admin role
 * @param {boolean} props.requireAdmin - Require admin role
 * @param {string} props.redirectTo - Custom redirect path (default: /login)
 */
export default function ProtectedRoute({
  children,
  requireCoach = false,
  requireAdmin = false,
  redirectTo = '/login',
}) {
  const { user, loading, isCoach, isAdmin } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (requireCoach && !isCoach) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">This page is only accessible to coaches and administrators.</p>
        </div>
      </div>
    );
  }

  // All checks passed - render protected content
  return children;
}
