/**
 * Root Application Component
 *
 * Defines application routing and layout structure.
 *
 * Routes:
 * - / - Landing page (public)
 * - /login - Login page (public)
 * - /register - Registration page (public)
 * - /dashboard - User dashboard (protected)
 * - /bookings - Booking management (protected)
 * - /calendar - Calendar view (protected)
 * - /media - Training videos (protected)
 * - /admin - Admin panel (protected, admin only)
 *
 * Features:
 * - React Router v6 routing
 * - Protected routes with authentication check
 * - Role-based access control
 * - Lazy loading for code splitting (future enhancement)
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';

/**
 * Temporary placeholder components
 * These will be replaced with actual components in subsequent phases
 */
function LandingPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-green-800 mb-4">
          {import.meta.env.VITE_APP_NAME || 'Tennis Portal'}
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Book courts, schedule lessons, and improve your game
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
          >
            Sign In
          </a>
          <a
            href="/register"
            className="inline-block px-6 py-3 bg-white text-green-600 font-medium rounded-lg border-2 border-green-600 hover:bg-green-50 transition"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome, {user?.first_name}!
          </h1>
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <h2 className="text-xl font-semibold text-gray-800">Quick Stats</h2>
              <p className="text-gray-600">Skill Level: {user?.skill_level || 'Not set'}</p>
              <p className="text-gray-600">Email: {user?.email}</p>
              <p className="text-gray-600">Role: {user?.role?.name || 'Tennis Player'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <a
                href="/bookings"
                className="block p-6 bg-green-50 rounded-lg hover:bg-green-100 transition"
              >
                <h3 className="text-lg font-semibold text-green-800">Book a Court</h3>
                <p className="text-gray-600 mt-2">Reserve your court time</p>
              </a>

              <a
                href="/calendar"
                className="block p-6 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                <h3 className="text-lg font-semibold text-blue-800">My Calendar</h3>
                <p className="text-gray-600 mt-2">View your upcoming sessions</p>
              </a>

              <a
                href="/media"
                className="block p-6 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
              >
                <h3 className="text-lg font-semibold text-purple-800">Training Videos</h3>
                <p className="text-gray-600 mt-2">Improve your skills</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaceholderPage({ title, description }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-gray-600">{description}</p>
        <a
          href="/dashboard"
          className="inline-block mt-6 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}

/**
 * Main App Component
 */
function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bookings"
        element={
          <ProtectedRoute>
            <PlaceholderPage
              title="Court Bookings"
              description="This page will feature Cal.com embed for court reservations (Week 2)"
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <PlaceholderPage
              title="My Calendar"
              description="This page will feature FullCalendar.io for visualizing bookings (Week 3)"
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/media"
        element={
          <ProtectedRoute>
            <PlaceholderPage
              title="Training Media"
              description="This page will feature video library with recommendations (Week 3)"
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <PlaceholderPage
              title="Admin Panel"
              description="This page will feature admin controls for coaches and administrators"
            />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
