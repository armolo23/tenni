# Frontend - React SPA

## Overview

React.js Single Page Application serving as the primary user interface for the Tennis Client Portal. Acts as an orchestration layer consuming Directus REST API and Cal.com Embed.

## Technology Stack

- **Framework**: React 18+ (with Vite)
- **State Management**: React Context + Hooks (no Redux/Zustand needed for this scope)
- **Routing**: React Router v6
- **HTTP Client**: Directus JavaScript SDK
- **Styling**: TailwindCSS (utility-first)
- **Calendar**: FullCalendar.io with React adapter
- **Booking Embed**: @calcom/embed-react
- **Forms**: React Hook Form + Zod validation
- **Date Handling**: date-fns (lightweight alternative to moment.js)

## Project Structure

```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── auth/
│   │   │   ├── LoginForm.jsx
│   │   │   ├── RegisterForm.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── booking/
│   │   │   ├── BookingEmbed.jsx
│   │   │   ├── BookingList.jsx
│   │   │   └── BookingModal.jsx
│   │   ├── calendar/
│   │   │   ├── UserCalendar.jsx
│   │   │   └── EventModal.jsx
│   │   ├── media/
│   │   │   ├── MediaGrid.jsx
│   │   │   ├── VideoPlayer.jsx
│   │   │   └── RecommendationEngine.jsx
│   │   └── ui/              # Generic UI (buttons, cards, modals)
│   ├── pages/               # Route-level components
│   │   ├── Home.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Booking.jsx
│   │   ├── Schedule.jsx
│   │   ├── MediaLibrary.jsx
│   │   └── Profile.jsx
│   ├── lib/                 # External service clients
│   │   ├── directus.js      # Directus SDK instance
│   │   └── cal.js           # Cal.com helpers
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.js       # Authentication state
│   │   ├── useBookings.js   # Booking data fetching
│   │   └── useMedia.js      # Media recommendations
│   ├── contexts/            # React Context providers
│   │   └── AuthContext.jsx
│   ├── utils/               # Helper functions
│   │   ├── date-utils.js
│   │   └── validators.js
│   ├── App.jsx              # Root component
│   └── main.jsx             # Entry point
├── public/
│   └── assets/
├── .env.example
├── vite.config.js
└── package.json
```

## Code Conventions

### Component Structure

**Functional Components Only** (no class components)

```jsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * BookingList - Displays user's booking history
 * @component
 */
export default function BookingList() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch bookings
  }, [user]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="booking-list">
      {/* Component JSX */}
    </div>
  );
}
```

### Naming Conventions

- **Components**: PascalCase (`BookingForm.jsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.js`)
- **Utils**: camelCase (`formatDate.js`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)

### Import Order

1. External dependencies (React, libraries)
2. Internal modules (components, hooks)
3. Utils/helpers
4. Styles

```jsx
// ✅ GOOD
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import BookingModal from '@/components/booking/BookingModal';
import { useAuth } from '@/hooks/useAuth';

import { formatDate } from '@/utils/date-utils';
```

## Authentication Patterns

### Directus SDK Setup

**File**: `src/lib/directus.js`

```javascript
import { createDirectus, authentication, rest, readMe, readItems } from '@directus/sdk';

const client = createDirectus(import.meta.env.VITE_DIRECTUS_URL)
  .with(rest())
  .with(authentication('cookie', { autoRefresh: true }));

export { client, readMe, readItems };
export default client;
```

### Auth Context

**File**: `src/contexts/AuthContext.jsx`

```jsx
import { createContext, useState, useEffect } from 'react';
import { client, readMe } from '@/lib/directus';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await client.request(readMe({
        fields: ['*', 'role.name']
      }));
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    await client.login(email, password);
    await checkAuth();
  };

  const logout = async () => {
    await client.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Protected Routes

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
```

## Data Fetching Patterns

### Booking Data Hook

**File**: `src/hooks/useBookings.js`

```javascript
import { useState, useEffect } from 'react';
import { client, readItems } from '@/lib/directus';

export function useBookings(userId) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, [userId]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await client.request(readItems('bookings', {
        filter: {
          user_id: { _eq: userId }
        },
        fields: ['*', 'court_assignment.name', 'court_assignment.surface'],
        sort: ['-start_time']
      }));
      setBookings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { bookings, loading, error, refetch: fetchBookings };
}
```

### Media Recommendation Hook

**File**: `src/hooks/useMedia.js`

```javascript
import { useState, useEffect } from 'react';
import { client, readItems } from '@/lib/directus';
import { useAuth } from './useAuth';

export function useMedia() {
  const { user } = useAuth();
  const [recommendedVideos, setRecommendedVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.skill_level) {
      fetchRecommendations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    try {
      const videos = await client.request(readItems('media_items', {
        filter: {
          _and: [
            { difficulty_level: { _eq: user.skill_level } },
            { status: { _eq: 'published' } }
          ]
        },
        fields: ['*', 'tags.tags_id.name', 'tags.tags_id.category'],
        limit: 12
      }));
      setRecommendedVideos(videos);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  return { recommendedVideos, loading };
}
```

## Cal.com Integration

### Booking Embed Component

**File**: `src/components/booking/BookingEmbed.jsx`

```jsx
import { useEffect } from 'react';
import Cal, { getCalApi } from '@calcom/embed-react';
import { useAuth } from '@/hooks/useAuth';

export default function BookingEmbed({ calLink }) {
  const { user } = useAuth();

  useEffect(() => {
    (async function () {
      const cal = await getCalApi({ namespace: "tennisBooking" });

      // Prefill user data
      cal("preload", {
        calLink: calLink,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email
      });

      // Apply branding
      cal("ui", {
        styles: { branding: { brandColor: "#10b981" } },
        hideEventTypeDetails: false,
        layout: "month_view"
      });
    })();
  }, [user, calLink]);

  return (
    <Cal
      namespace="tennisBooking"
      calLink={calLink}
      style={{ width: "100%", height: "100%", overflow: "scroll" }}
      config={{ layout: 'month_view' }}
    />
  );
}
```

## FullCalendar Integration

### User Calendar Component

**File**: `src/components/calendar/UserCalendar.jsx`

```jsx
import { useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { client, readItems } from '@/lib/directus';
import { useAuth } from '@/hooks/useAuth';

export default function UserCalendar() {
  const { user } = useAuth();

  // Lazy fetch events based on calendar viewport
  const fetchEvents = useCallback(async (fetchInfo, successCallback, failureCallback) => {
    try {
      const bookings = await client.request(readItems('bookings', {
        filter: {
          _and: [
            { user_id: { _eq: user.id } },
            { start_time: { _gte: fetchInfo.startStr } },
            { end_time: { _lte: fetchInfo.endStr } }
          ]
        },
        fields: ['*', 'court_assignment.name']
      }));

      const events = bookings.map(booking => ({
        id: booking.id,
        title: booking.court_assignment?.name || 'Court Booking',
        start: booking.start_time,
        end: booking.end_time,
        extendedProps: {
          calUid: booking.cal_uid,
          status: booking.status,
          paymentStatus: booking.payment_status
        },
        backgroundColor: booking.status === 'confirmed' ? '#10b981' : '#ef4444',
        borderColor: booking.payment_status === 'paid' ? '#10b981' : '#f59e0b'
      }));

      successCallback(events);
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      failureCallback(error);
    }
  }, [user]);

  const handleEventClick = (clickInfo) => {
    // Open modal with booking details
    console.log('Event clicked:', clickInfo.event.extendedProps);
  };

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      }}
      events={fetchEvents}
      eventClick={handleEventClick}
      timeZone="local"
      height="auto"
    />
  );
}
```

## Styling Guidelines

### TailwindCSS Conventions

- Use utility classes for common patterns
- Extract complex components to separate files
- Use `@apply` sparingly (only for repeated patterns)

```jsx
// ✅ GOOD - Utility classes
<button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
  Book Now
</button>

// ⚠️ USE SPARINGLY - @apply
// Only in component CSS files for repeated patterns
```

### Responsive Design

Mobile-first approach with Tailwind breakpoints:

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

## Error Handling

### API Error Patterns

```javascript
try {
  const data = await client.request(readItems('bookings'));
  setBookings(data);
} catch (error) {
  // Directus errors have structured format
  if (error.errors) {
    // Validation errors
    console.error('Validation:', error.errors);
  } else if (error.message) {
    // Generic errors
    console.error('Error:', error.message);
  }
  setError('Failed to load bookings');
}
```

### User Feedback

Always provide user feedback for async operations:

```jsx
const [status, setStatus] = useState('idle'); // idle | loading | success | error

const handleSubmit = async (data) => {
  setStatus('loading');
  try {
    await client.request(/* ... */);
    setStatus('success');
    toast.success('Booking confirmed!');
  } catch (error) {
    setStatus('error');
    toast.error('Booking failed. Please try again.');
  }
};
```

## Performance Optimization

### Lazy Loading

```jsx
import { lazy, Suspense } from 'react';

const MediaLibrary = lazy(() => import('@/pages/MediaLibrary'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MediaLibrary />
    </Suspense>
  );
}
```

### Memoization

```jsx
import { useMemo } from 'react';

const filteredBookings = useMemo(() => {
  return bookings.filter(b => b.status === 'confirmed');
}, [bookings]);
```

## Environment Variables

**File**: `.env.example`

```bash
VITE_DIRECTUS_URL=https://api.tennisportal.com
VITE_CAL_NAMESPACE=tennisBooking
```

## Testing Strategy

- **Unit Tests**: Utilities and hooks (Vitest)
- **Component Tests**: React Testing Library
- **E2E Tests**: Playwright (optional for critical flows)

## Common Pitfalls

### ❌ Avoid

```javascript
// Don't fetch in component body (causes infinite loops)
function Component() {
  const data = fetchData(); // WRONG
}

// Don't store Directus client in state
const [client, setClient] = useState(createDirectus(...)); // WRONG
```

### ✅ Correct

```javascript
// Fetch in useEffect
useEffect(() => {
  fetchData();
}, []);

// Keep client as singleton in lib/directus.js
import { client } from '@/lib/directus'; // CORRECT
```

## Quick Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check (if using TypeScript)
npm run type-check

# Lint
npm run lint
```

---

**Last Updated**: 2025-11-17
**React Version**: 18+
**Build Tool**: Vite
