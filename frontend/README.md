# Tennis Portal - Frontend

React.js single-page application for the Tennis Client Portal.

## Features

- **Authentication System**: Login/Register with Directus SDK
- **Cookie-Based Auth**: Secure HttpOnly cookies with auto-refresh
- **Protected Routes**: Role-based access control (Player, Coach, Admin)
- **Responsive Design**: TailwindCSS for mobile-first UI
- **Form Validation**: React Hook Form + Zod schemas

## Tech Stack

- **React 18+**: Modern hooks-based components
- **Vite**: Fast development and optimized builds
- **React Router v6**: Client-side routing
- **Directus SDK v17**: Headless CMS integration
- **TailwindCSS**: Utility-first styling
- **React Hook Form + Zod**: Type-safe form validation

## Prerequisites

- Node.js 20.0.0 or higher
- npm or yarn
- Running Directus backend (see `/backend/DEPLOYMENT.md`)

## Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Update .env with your Directus URL
VITE_DIRECTUS_URL=http://localhost:8055
```

## Development

```bash
# Start development server
npm run dev

# Access application
# http://localhost:5173
```

## Available Scripts

```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run test         # Run tests (Vitest)
```

## Project Structure

```
frontend/
├── src/
│   ├── lib/
│   │   └── directus.js          # Directus SDK client
│   ├── contexts/
│   │   └── AuthContext.jsx      # Authentication context
│   ├── components/
│   │   └── auth/
│   │       ├── LoginForm.jsx    # Login UI
│   │       ├── RegisterForm.jsx # Registration UI
│   │       └── ProtectedRoute.jsx # Route guard
│   ├── App.jsx                  # Root component with routing
│   ├── main.jsx                 # Application entry point
│   └── index.css                # Global styles (Tailwind)
├── index.html                   # HTML template
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind customization
└── package.json                # Dependencies
```

## Authentication Flow

### Login

1. User submits email/password
2. `AuthContext.login()` calls Directus SDK
3. Directus sets HttpOnly cookie (refresh token)
4. Access token stored in memory (15-min expiry)
5. User redirected to dashboard

### Protected Routes

```jsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>

// Require coach role
<Route
  path="/admin"
  element={
    <ProtectedRoute requireCoach>
      <AdminPanel />
    </ProtectedRoute>
  }
/>
```

### Session Management

- Access tokens: 15 minutes (auto-refresh)
- Refresh tokens: 7 days (HttpOnly cookie)
- Automatic re-authentication on page reload

## Environment Variables

```bash
# Required
VITE_DIRECTUS_URL=http://localhost:8055

# Optional
VITE_APP_NAME=Tennis Portal
VITE_APP_ENV=development
VITE_CALCOM_NAMESPACE=tennisBooking
VITE_CALCOM_LINK=your-org/court-booking
```

## Next Steps (Phase 4 Roadmap)

### Week 2: Booking & Synchronization
- [ ] Implement Cal.com React Embed component
- [ ] Build booking management UI
- [ ] Test end-to-end booking flow

### Week 3: Visualization & Content
- [ ] Integrate FullCalendar.io for calendar view
- [ ] Build media library with recommendations
- [ ] Implement user dashboard with stats

### Week 4: Polish & Optimization
- [ ] Add loading states and error boundaries
- [ ] Implement code splitting (lazy loading)
- [ ] Run security audit
- [ ] Performance optimization

## Troubleshooting

### "Failed to fetch" errors

**Cause**: Backend not running or CORS misconfiguration

**Fix**:
```bash
# Ensure Directus is running
cd ../backend
docker-compose ps

# Check CORS_ORIGIN in backend/.env
CORS_ORIGIN=http://localhost:5173
```

### "Authentication failed" errors

**Cause**: Invalid credentials or user not found

**Fix**:
1. Verify user exists in Directus Admin UI
2. Check user status is "active"
3. Ensure correct password

### Build errors

**Cause**: Missing dependencies

**Fix**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## API Integration

### Directus SDK Usage

```javascript
import { client } from '@/lib/directus';
import { readItems } from '@directus/sdk';

// Fetch bookings
const bookings = await client.request(
  readItems('bookings', {
    filter: {
      user_id: { _eq: '$CURRENT_USER' },
      start_time: { _gte: '$NOW' }
    },
    sort: ['start_time']
  })
);
```

### Authentication Hook

```javascript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <div>Welcome, {user.first_name}!</div>;
}
```

## Deployment

### Production Build

```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

### Deploy to Vercel/Netlify

```bash
# Build command
npm run build

# Output directory
dist

# Environment variables (add in hosting platform)
VITE_DIRECTUS_URL=https://your-directus-instance.com
```

## Contributing

1. Follow React naming conventions (PascalCase components, camelCase functions)
2. Use Tailwind utility classes (avoid custom CSS)
3. Run linter before committing: `npm run lint:fix`
4. Write tests for new components (coming in Week 4)

## Support

- **Documentation**: See `/docs/` directory
- **Backend Setup**: See `/backend/DEPLOYMENT.md`
- **API Reference**: See `/docs/api/directus-api-reference.md`
- **Architecture**: See `/docs/architecture/implementation-roadmap.md`

## License

Proprietary - Tennis Portal Project
