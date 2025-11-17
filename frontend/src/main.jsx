/**
 * Application Entry Point
 *
 * Bootstraps the React application with:
 * - React 18 StrictMode
 * - React Router for navigation
 * - Authentication Context
 * - Global styles (Tailwind CSS)
 *
 * @see https://react.dev/
 * @see https://reactrouter.com/
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
