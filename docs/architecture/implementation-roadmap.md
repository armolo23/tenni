# Tennis Portal - Implementation Roadmap

## Overview

This document provides a detailed, phase-by-phase implementation plan for the Tennis Client Portal, with task breakdown, time estimates, dependencies, and success criteria.

## Roadmap Summary

| Phase | Duration | Status | Dependencies |
|-------|----------|--------|--------------|
| Phase 1: Foundation & Identity | 1 week | 🔵 Ready | None |
| Phase 2: Booking & Synchronization | 2 weeks | ⚪ Pending | Phase 1 |
| Phase 3: Visualization & Content | 1 week | ⚪ Pending | Phase 1 |
| Phase 4: Polish & Optimization | 1 week | ⚪ Pending | Phases 2-3 |

**Total Estimated Duration**: 5 weeks

---

## Phase 1: Foundation & Identity

**Duration**: 1 week (5 working days)
**Goal**: Establish infrastructure and authentication system
**Status**: 🔵 Ready to Start

### Day 1-2: Backend Infrastructure

#### Task 1.1: Deploy Directus + PostgreSQL

**Complexity**: Low
**Time Estimate**: 4 hours

**Subtasks**:
- [ ] Copy `.env.example` to `.env` in `backend/`
- [ ] Generate secure secrets:
  ```bash
  openssl rand -base64 32  # For SECRET
  openssl rand -base64 32  # For KEY
  ```
- [ ] Configure environment variables:
  - Database credentials
  - Admin email/password
  - CORS origin (frontend URL)
  - Public URL
- [ ] Start Docker containers:
  ```bash
  cd backend && docker-compose up -d
  ```
- [ ] Verify Directus Admin UI accessible at `http://localhost:8055`
- [ ] Login with admin credentials
- [ ] Create schema snapshot (baseline):
  ```bash
  /schema-migrate create
  ```

**Success Criteria**:
- ✅ PostgreSQL healthy and accepting connections
- ✅ Directus Admin UI accessible
- ✅ Admin login successful
- ✅ Initial schema snapshot created

**Deliverables**:
- Running Docker containers
- Configured `.env` file
- Baseline schema snapshot

---

#### Task 1.2: Extend directus_users Schema

**Complexity**: Low
**Time Estimate**: 2 hours

**Subtasks**:
- [ ] Access Directus Admin: Settings > Data Model > directus_users
- [ ] Add custom fields:
  - `skill_level` (Dropdown: Beginner, Intermediate, Advanced, Pro)
  - `preferred_court_surface` (Dropdown: Clay, Grass, Hard)
  - `stripe_customer_id` (String, nullable)
  - `phone_number` (String, nullable, validation: E.164 format)
  - `membership_tier` (Dropdown: Standard, Gold, Platinum)
- [ ] Create schema snapshot:
  ```bash
  /schema-migrate create
  ```
- [ ] Commit snapshot to git

**Success Criteria**:
- ✅ All custom fields created
- ✅ Fields visible in user profile
- ✅ Schema snapshot updated

**Deliverables**:
- Extended `directus_users` collection
- Updated schema snapshot

---

#### Task 1.3: Create Custom Collections

**Complexity**: Medium
**Time Estimate**: 6 hours

**Subtasks**:
- [ ] Create `courts` collection:
  - Primary key: `id` (Integer, auto-increment)
  - Fields: `name`, `surface`, `image`, `maintenance_schedule`, `cal_resource_id`, `status`
- [ ] Create `tags` collection:
  - Primary key: `id` (Integer, auto-increment)
  - Fields: `name`, `slug`, `category`, `description`
  - Add unique constraint on `slug`
- [ ] Create `media_items` collection:
  - Primary key: `id` (UUID, auto-generated)
  - Fields: `title`, `description`, `video_url`, `video_file`, `thumbnail`, `difficulty_level`, `duration`, `status`
- [ ] Create M2M relationship for `media_items` ↔ `tags`:
  - Junction table: `media_items_tags` (auto-created)
  - Configure bidirectional relationship
- [ ] Create `bookings` collection:
  - Primary key: `id` (UUID, auto-generated)
  - Fields: `user_id` (M2O → directus_users), `cal_booking_id`, `cal_uid`, `event_type_id`, `start_time`, `end_time`, `status`, `payment_status`, `court_assignment` (M2O → courts), `notes`
  - Configure relationships with proper on-delete behavior
- [ ] Create schema snapshot
- [ ] Verify all collections in Data Model UI

**Success Criteria**:
- ✅ All collections created with correct field types
- ✅ Relationships configured properly
- ✅ Unique constraints working
- ✅ Schema snapshot created

**Deliverables**:
- Complete data model (5 collections + system extensions)
- Schema snapshot with full schema

**Reference**: Use `/schema-designer` subagent for assistance

---

### Day 3: RBAC Configuration

#### Task 1.4: Create Custom Roles

**Complexity**: Medium
**Time Estimate**: 4 hours

**Subtasks**:
- [ ] Create "Tennis Player" role:
  - Settings > Access Control > Roles > Create
  - App Access: Disabled
  - Configure permissions (see detailed spec below)
- [ ] Create "Coach" role:
  - App Access: Enabled
  - Full access to all collections
- [ ] Test role permissions:
  - Create test user with Tennis Player role
  - Login via API and verify data isolation
  - Test that player can only see own bookings

**Tennis Player Permissions**:

**Collection: directus_users**
- Read: `{ "id": { "_eq": "$CURRENT_USER" } }`
- Update: `{ "id": { "_eq": "$CURRENT_USER" } }`
  - Allowed fields: `first_name`, `last_name`, `avatar`, `phone_number`, `preferred_court_surface`
  - Denied fields: `role`, `status`, `membership_tier`, `stripe_customer_id`

**Collection: bookings**
- Create: Preset `user_id` to `$CURRENT_USER`
- Read: `{ "user_id": { "_eq": "$CURRENT_USER" } }`
- Update: `{ "user_id": { "_eq": "$CURRENT_USER" } }`
  - Allowed fields: `notes`
  - Denied fields: `start_time`, `end_time`, `payment_status`, `cal_booking_id`

**Collection: media_items**
- Read: `{ "status": { "_eq": "published" } }`
- Fields: All (including deep fields for tags)

**Collection: courts**
- Read: All
- Fields: `id`, `name`, `surface`, `image`

**Collection: tags**
- Read: All

**Success Criteria**:
- ✅ Both roles created
- ✅ Permissions enforced (verified via API testing)
- ✅ Players cannot access other users' data
- ✅ Players cannot modify sensitive fields

**Deliverables**:
- Tennis Player role configuration
- Coach role configuration
- Permission test results

**Reference**: Use `/security-reviewer` subagent to audit

---

### Day 4-5: Frontend Foundation

#### Task 1.5: React Project Setup

**Complexity**: Low
**Time Estimate**: 3 hours

**Subtasks**:
- [ ] Install frontend dependencies:
  ```bash
  cd frontend && npm install
  ```
- [ ] Copy `.env.example` to `.env`
- [ ] Configure environment variables:
  - `VITE_DIRECTUS_URL=http://localhost:8055`
  - `VITE_CAL_NAMESPACE=tennisBooking`
- [ ] Verify Vite dev server runs:
  ```bash
  npm run dev
  # Access http://localhost:5173
  ```
- [ ] Configure TailwindCSS:
  ```bash
  npx tailwindcss init -p
  ```
- [ ] Set up path aliases in `vite.config.js` (already configured)

**Success Criteria**:
- ✅ Dependencies installed without errors
- ✅ Dev server runs successfully
- ✅ Can access localhost:5173
- ✅ TailwindCSS compiling

**Deliverables**:
- Working React development environment
- Configured `.env` file

---

#### Task 1.6: Directus SDK Integration

**Complexity**: Medium
**Time Estimate**: 4 hours

**Subtasks**:
- [ ] Create `src/lib/directus.js`:
  ```javascript
  import { createDirectus, authentication, rest, readMe, readItems } from '@directus/sdk';

  const client = createDirectus(import.meta.env.VITE_DIRECTUS_URL)
    .with(rest())
    .with(authentication('cookie', { autoRefresh: true }));

  export { client, readMe, readItems };
  export default client;
  ```
- [ ] Create `src/contexts/AuthContext.jsx`:
  - Implement auth state management
  - Provide `login`, `logout`, `checkAuth` functions
- [ ] Create `src/hooks/useAuth.js`:
  - Hook to access auth context
- [ ] Create `src/components/auth/ProtectedRoute.jsx`:
  - Route wrapper for authenticated pages
- [ ] Test authentication flow:
  - Login with test credentials
  - Verify cookie is set
  - Verify `readMe()` returns current user

**Success Criteria**:
- ✅ SDK client initialized
- ✅ Auth context provides user state
- ✅ Login/logout functions work
- ✅ Protected routes redirect when unauthenticated

**Deliverables**:
- Directus SDK client (`lib/directus.js`)
- Auth context and hook
- Protected route component

**Reference**: Use `/api-integrator` subagent for guidance

---

#### Task 1.7: Authentication UI

**Complexity**: Medium
**Time Estimate**: 5 hours

**Subtasks**:
- [ ] Create `src/components/auth/LoginForm.jsx`:
  - Email/password inputs
  - Form validation (React Hook Form + Zod)
  - Error handling and display
  - Loading state
- [ ] Create `src/components/auth/RegisterForm.jsx`:
  - Registration fields
  - Skill level selection
  - Terms acceptance
  - Email verification flow
- [ ] Create `src/pages/Login.jsx` and `src/pages/Register.jsx`
- [ ] Configure React Router in `App.jsx`:
  ```javascript
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  </Routes>
  ```
- [ ] Enable public registration in Directus:
  - Settings > Project Settings > Public Registration: On
  - Default Role: Tennis Player
  - Email verification: Recommended
- [ ] Test end-to-end flow:
  - Register new user
  - Verify email (if enabled)
  - Login
  - Access protected route

**Success Criteria**:
- ✅ Users can register via UI
- ✅ Users can login
- ✅ Errors displayed clearly
- ✅ Protected routes work
- ✅ User redirected to dashboard after login

**Deliverables**:
- Login and Register forms
- Login/Register pages
- Configured routing

---

## Phase 2: Booking & Synchronization

**Duration**: 2 weeks (10 working days)
**Goal**: Implement Cal.com integration and webhook sync
**Status**: ⚪ Pending
**Dependencies**: Phase 1 complete

### Week 1: Cal.com Configuration

#### Task 2.1: Cal.com Account Setup

**Complexity**: Low
**Time Estimate**: 2 hours

**Subtasks**:
- [ ] Sign up for Cal.com account (or self-host)
- [ ] Configure organization/team
- [ ] Connect Stripe account:
  - Install Stripe app
  - Configure API keys
  - Set up payment methods
- [ ] Create event types:
  - "Private Lesson" (60 min, $50)
  - "Court Rental" (60 min, $30)
  - Configure availability (e.g., 9am-5pm weekdays)
- [ ] Test booking flow manually:
  - Book a slot
  - Complete payment in test mode
  - Verify booking appears in Cal.com dashboard

**Success Criteria**:
- ✅ Cal.com account active
- ✅ Stripe connected and tested
- ✅ Event types created
- ✅ Test booking successful

**Deliverables**:
- Configured Cal.com account
- Active event types

---

#### Task 2.2: Webhook Configuration

**Complexity**: Medium
**Time Estimate**: 3 hours

**Subtasks**:
- [ ] Generate webhook secret:
  ```bash
  openssl rand -hex 32
  ```
- [ ] Configure webhook in Cal.com:
  - Settings > Developer > Webhooks
  - URL: `https://api.tennisportal.com/flows/trigger/sync-booking` (use ngrok for local testing)
  - Events: `BOOKING_CREATED`, `BOOKING_PAID`
  - Secret: [generated above]
- [ ] For local testing, set up ngrok:
  ```bash
  ngrok http 8055
  # Use ngrok URL for webhook
  ```
- [ ] Test webhook delivery:
  - Create test booking
  - Verify webhook POST sent to Directus
  - Check webhook delivery logs in Cal.com

**Success Criteria**:
- ✅ Webhook configured in Cal.com
- ✅ Test webhook delivered successfully
- ✅ Payload structure matches expected format

**Deliverables**:
- Webhook configuration
- Webhook secret (stored securely)

---

### Week 1-2: Frontend Booking Integration

#### Task 2.3: Cal.com React Embed

**Complexity**: Medium
**Time Estimate**: 6 hours

**Subtasks**:
- [ ] Install Cal.com embed package:
  ```bash
  npm install @calcom/embed-react
  ```
- [ ] Create `src/components/booking/BookingEmbed.jsx`:
  - Import `Cal` and `getCalApi`
  - Implement namespace isolation
  - Prefill user data (name, email)
  - Apply branding/styling
- [ ] Create `src/pages/Booking.jsx`:
  - Render `BookingEmbed` component
  - Add event type selector (dropdown)
  - Dynamic `calLink` based on selection
- [ ] Implement event listeners:
  - `bookingSuccessful`: Show success message, trigger refetch
  - `bookingCancelled`: Handle cancellation
- [ ] Test embed:
  - Verify user data prefilled
  - Complete test booking
  - Verify success callback fires

**Success Criteria**:
- ✅ Cal.com embed renders in React
- ✅ User data prefilled correctly
- ✅ Booking can be completed through embed
- ✅ Success events captured

**Deliverables**:
- `BookingEmbed` component
- Booking page with embed

**Reference**: Use `/api-integrator` subagent

---

#### Task 2.4: Directus Flow - Sync Booking

**Complexity**: High
**Time Estimate**: 8 hours

**Subtasks**:
- [ ] Create Flow in Directus Admin:
  - Name: `sync-booking`
  - Trigger: Webhook (POST)
  - Path: `sync-booking`
- [ ] Add Operations (see detailed spec below)
- [ ] Test Flow with sample payload:
  ```bash
  /api-test bookings POST '<sample-webhook-payload>'
  ```
- [ ] Verify booking created in database
- [ ] Test edge cases:
  - Duplicate webhook (should update, not duplicate)
  - Missing user email (should handle gracefully)
  - Invalid payload structure
- [ ] Export Flow:
  ```bash
  /flow-export sync-booking
  ```
- [ ] Commit Flow JSON to git

**Flow Operations**:

1. **Log Payload** (Audit)
   - Type: Log to Console
   - Data: `{{ $trigger.body }}`

2. **Validate Secret**
   - Type: Condition
   - Rule: `{{ $trigger.headers['x-cal-secret-key'] }} == 'SECRET'`
   - Reject: Stop with 401

3. **Validate Event Type**
   - Type: Condition
   - Rule: `{{ $trigger.body.triggerEvent }} in ['BOOKING_CREATED', 'BOOKING_PAID']`
   - Reject: Stop (ignore event)

4. **Resolve User**
   - Type: Read Data
   - Collection: `directus_users`
   - Filter: `{ "email": { "_eq": "{{ $trigger.body.payload.attendees[0].email }}" } }`
   - Output: `$resolved_user`

5. **Check User Exists**
   - Type: Condition
   - Rule: `{{ $resolved_user.length }} > 0`
   - Reject: Email admin + stop

6. **Check Duplicate**
   - Type: Read Data
   - Collection: `bookings`
   - Filter: `{ "cal_uid": { "_eq": "{{ $trigger.body.payload.uid }}" } }`
   - Output: `$existing_booking`

7. **Upsert Booking**
   - Type: Run Script (JavaScript)
   - Script: (see detailed implementation in flow-builder subagent)

**Success Criteria**:
- ✅ Flow processes webhook successfully
- ✅ Booking record created in PostgreSQL
- ✅ Duplicate webhooks handled (idempotent)
- ✅ User lookup works
- ✅ Flow exported and committed

**Deliverables**:
- Directus Flow: `sync-booking`
- Flow export JSON
- Test results documentation

**Reference**: Use `/flow-builder` subagent

---

#### Task 2.5: End-to-End Testing

**Complexity**: Medium
**Time Estimate**: 4 hours

**Subtasks**:
- [ ] Test complete booking flow:
  1. User logs into React app
  2. Navigates to Booking page
  3. Selects event type (e.g., "Private Lesson")
  4. Books time slot via Cal.com embed
  5. Completes payment (Stripe test mode)
  6. Webhook fires to Directus Flow
  7. Booking record created in database
  8. User sees confirmation
- [ ] Verify data consistency:
  - Booking `start_time` matches Cal.com
  - `payment_status` = "paid"
  - `user_id` linked correctly
- [ ] Test error scenarios:
  - Network failure during webhook
  - Invalid payment
  - User not found
- [ ] Document test results

**Success Criteria**:
- ✅ End-to-end booking flow works
- ✅ Data syncs correctly
- ✅ Error handling works
- ✅ No data loss

**Deliverables**:
- Test report
- Confirmed working booking system

---

## Phase 3: Visualization & Content

**Duration**: 1 week (5 working days)
**Goal**: Implement calendar UI and media recommendation engine
**Status**: ⚪ Pending
**Dependencies**: Phase 1 complete (Phase 2 enhances but not required)

### Day 1-2: FullCalendar Integration

#### Task 3.1: Calendar Component

**Complexity**: Medium
**Time Estimate**: 6 hours

**Subtasks**:
- [ ] Install FullCalendar packages:
  ```bash
  npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
  ```
- [ ] Create `src/components/calendar/UserCalendar.jsx`:
  - Configure calendar plugins
  - Implement lazy loading via `events` function
  - Fetch bookings from Directus (not Cal.com)
  - Transform booking records to FullCalendar event objects
- [ ] Create `src/pages/Schedule.jsx`:
  - Render calendar component
  - Add event click handler (show booking details modal)
- [ ] Style calendar to match design:
  - Custom colors based on booking status
  - Border colors based on payment status
- [ ] Test calendar:
  - Navigate between months
  - Verify lazy loading (only fetches visible date range)
  - Click event to see details

**FullCalendar Events Function**:
```javascript
const fetchEvents = async (fetchInfo, successCallback, failureCallback) => {
  try {
    const bookings = await client.request(readItems('bookings', {
      filter: {
        _and: [
          { user_id: { _eq: userId } },
          { start_time: { _gte: fetchInfo.startStr } },
          { end_time: { _lte: fetchInfo.endStr } }
        ]
      },
      fields: ['*', 'court_assignment.name']
    }));

    const events = bookings.map(b => ({
      id: b.id,
      title: b.court_assignment?.name || 'Booking',
      start: b.start_time,
      end: b.end_time,
      extendedProps: { calUid: b.cal_uid, status: b.status, paymentStatus: b.payment_status },
      backgroundColor: b.status === 'confirmed' ? '#10b981' : '#ef4444',
      borderColor: b.payment_status === 'paid' ? '#10b981' : '#f59e0b'
    }));

    successCallback(events);
  } catch (error) {
    failureCallback(error);
  }
};
```

**Success Criteria**:
- ✅ Calendar renders with bookings
- ✅ Lazy loading works (queries only visible range)
- ✅ Event click shows details
- ✅ Timezone handling correct

**Deliverables**:
- `UserCalendar` component
- Schedule page

**Reference**: Use `/api-integrator` subagent

---

#### Task 3.2: Event Details Modal

**Complexity**: Low
**Time Estimate**: 3 hours

**Subtasks**:
- [ ] Create `src/components/calendar/EventModal.jsx`:
  - Display booking details from `extendedProps`
  - Show court name, time, status, payment status
  - Add "Reschedule" button (links to Cal.com reschedule URL)
  - Add "Cancel" button (future feature)
- [ ] Integrate modal with calendar:
  - `eventClick` handler opens modal
  - Pass event data to modal
- [ ] Style modal (TailwindCSS)
- [ ] Test modal interactions

**Success Criteria**:
- ✅ Modal opens on event click
- ✅ Displays correct booking details
- ✅ Reschedule link works
- ✅ Modal can be closed

**Deliverables**:
- Event details modal component

---

### Day 3-4: Media Library & Recommendations

#### Task 3.3: Seed Media Content

**Complexity**: Low
**Time Estimate**: 4 hours

**Subtasks**:
- [ ] Create seed data script (SQL or via Directus UI):
  ```bash
  /seed-data demo
  ```
- [ ] Populate `tags` collection:
  - 20+ tags (Serve, Forehand, Backhand, Volley, Footwork, Strategy, etc.)
  - Categorize: Technique, Strategy, Fitness, Mental
- [ ] Populate `media_items` collection:
  - 15+ sample videos (can use YouTube links)
  - Vary difficulty levels (Beginner, Intermediate, Advanced)
  - Add thumbnails (placeholder images)
  - Link to tags via M2M relationship
- [ ] Verify M2M relationships:
  - Each video has 2-4 tags
  - Tags have multiple videos
- [ ] Test deep filtering:
  ```bash
  /api-test media_items GET
  # With filter on tag names
  ```

**Success Criteria**:
- ✅ 15+ media items created
- ✅ 20+ tags created
- ✅ M2M relationships configured
- ✅ Deep filtering works

**Deliverables**:
- Seeded media library
- Tag taxonomy

---

#### Task 3.4: Media Recommendation Engine

**Complexity**: Medium
**Time Estimate**: 5 hours

**Subtasks**:
- [ ] Create `src/hooks/useMedia.js`:
  - Fetch media items based on user's skill level
  - Apply filters for published status
  - Optionally filter by tags (user interests)
- [ ] Create `src/components/media/MediaGrid.jsx`:
  - Display media items as cards
  - Show thumbnail, title, difficulty, duration
  - Click to view/play video
- [ ] Create `src/components/media/VideoPlayer.jsx`:
  - Embed video (YouTube/Vimeo iframe)
  - Show description and tags
- [ ] Create `src/pages/MediaLibrary.jsx`:
  - Render MediaGrid with recommended videos
  - Add filters (difficulty, tags)
- [ ] Test recommendations:
  - User with skill_level="Beginner" sees beginner videos
  - Filtering by tag works

**Recommendation Query**:
```javascript
const recommendedVideos = await client.request(readItems('media_items', {
  filter: {
    _and: [
      { difficulty_level: { _eq: user.skill_level } },
      { status: { _eq: 'published' } }
    ]
  },
  fields: ['*', 'tags.tags_id.name', 'tags.tags_id.category', 'thumbnail.filename_disk'],
  limit: 12
}));
```

**Success Criteria**:
- ✅ Recommendations filtered by user skill level
- ✅ Media items display correctly
- ✅ Video player works
- ✅ Tag filtering functional

**Deliverables**:
- Media recommendation hook
- Media grid and player components
- Media library page

**Reference**: Use `/api-integrator` subagent

---

### Day 5: Dashboard & Navigation

#### Task 3.5: User Dashboard

**Complexity**: Medium
**Time Estimate**: 5 hours

**Subtasks**:
- [ ] Create `src/pages/Dashboard.jsx`:
  - Display welcome message with user's name
  - Show upcoming bookings (next 7 days)
  - Show recommended videos (3-4 items)
  - Add quick action buttons (Book Now, View Schedule, Browse Media)
- [ ] Create dashboard widgets:
  - `UpcomingBookings` widget (list view)
  - `RecommendedVideos` widget (horizontal scroll)
  - `QuickStats` widget (total bookings, progress, etc.)
- [ ] Implement data fetching for dashboard
- [ ] Style with TailwindCSS (responsive layout)

**Success Criteria**:
- ✅ Dashboard displays user-specific data
- ✅ Upcoming bookings shown
- ✅ Recommended videos shown
- ✅ Quick actions work

**Deliverables**:
- Dashboard page
- Dashboard widgets

---

#### Task 3.6: Navigation & Layout

**Complexity**: Low
**Time Estimate**: 3 hours

**Subtasks**:
- [ ] Create `src/components/ui/Header.jsx`:
  - Logo/branding
  - Navigation links (Dashboard, Booking, Schedule, Media, Profile)
  - User menu (Profile, Logout)
- [ ] Create `src/components/ui/Layout.jsx`:
  - Wrapper component with Header
  - Main content area
  - Optional footer
- [ ] Update `App.jsx` to use Layout:
  ```javascript
  <Layout>
    <Routes>...</Routes>
  </Layout>
  ```
- [ ] Add active link styling
- [ ] Test navigation between pages

**Success Criteria**:
- ✅ Navigation works on all pages
- ✅ Active link highlighted
- ✅ Logout works
- ✅ Responsive design

**Deliverables**:
- Header and Layout components
- Complete navigation system

---

## Phase 4: Polish & Optimization

**Duration**: 1 week (5 working days)
**Goal**: Improve UX, performance, and production readiness
**Status**: ⚪ Pending
**Dependencies**: Phases 1-3 complete

### Day 1-2: UX Enhancements

#### Task 4.1: Loading States & Skeleton Screens

**Complexity**: Low
**Time Estimate**: 4 hours

**Subtasks**:
- [ ] Create `src/components/ui/LoadingSpinner.jsx`
- [ ] Create `src/components/ui/SkeletonCard.jsx`
- [ ] Add loading states to all data-fetching components
- [ ] Add skeleton screens for:
  - Dashboard (while loading bookings/videos)
  - Media Grid (while loading videos)
  - Calendar (initial load)
- [ ] Test loading states (simulate slow network)

**Success Criteria**:
- ✅ No blank screens during loading
- ✅ Skeleton screens match final layout
- ✅ Smooth transitions

**Deliverables**:
- Loading components
- Enhanced UX

---

#### Task 4.2: Error Handling & Toast Notifications

**Complexity**: Low
**Time Estimate**: 3 hours

**Subtasks**:
- [ ] Install toast library:
  ```bash
  npm install react-hot-toast
  ```
- [ ] Set up toast provider in `App.jsx`
- [ ] Add error boundaries for component crashes
- [ ] Replace console.error with toast notifications
- [ ] Add success toasts for actions (login, booking, etc.)
- [ ] Style toasts to match design

**Success Criteria**:
- ✅ Errors displayed to user (not just console)
- ✅ Success feedback provided
- ✅ App doesn't crash on errors

**Deliverables**:
- Toast notification system
- Error boundaries

---

### Day 3-4: Performance Optimization

#### Task 4.3: Code Splitting & Lazy Loading

**Complexity**: Medium
**Time Estimate**: 4 hours

**Subtasks**:
- [ ] Implement lazy loading for route components:
  ```javascript
  const Dashboard = lazy(() => import('./pages/Dashboard'));
  const MediaLibrary = lazy(() => import('./pages/MediaLibrary'));
  ```
- [ ] Wrap routes in `<Suspense>` with fallback
- [ ] Lazy load FullCalendar (only on Schedule page)
- [ ] Lazy load Cal.com embed (only on Booking page)
- [ ] Analyze bundle size:
  ```bash
  npm run build
  # Check dist/ output sizes
  ```
- [ ] Verify code splitting in build output

**Success Criteria**:
- ✅ Initial bundle size reduced
- ✅ Routes load on demand
- ✅ No regression in UX

**Deliverables**:
- Optimized bundle structure

---

#### Task 4.4: Database Indexing

**Complexity**: Low
**Time Estimate**: 2 hours

**Subtasks**:
- [ ] Review common queries (from API testing)
- [ ] Add indexes in PostgreSQL:
  - `bookings.user_id` (already has FK index)
  - `bookings.start_time` (for date range queries)
  - `bookings.cal_uid` (for webhook lookups)
  - `media_items.difficulty_level` (for filtering)
  - `media_items_tags.tags_id` (for M2M filtering)
- [ ] Test query performance:
  ```bash
  docker-compose exec postgres psql -U directus -d tenni -c "EXPLAIN ANALYZE SELECT * FROM bookings WHERE user_id = 'uuid' AND start_time >= NOW();"
  ```
- [ ] Create schema snapshot with indexes

**Success Criteria**:
- ✅ Queries run in < 50ms
- ✅ Indexes created on frequently queried fields

**Deliverables**:
- Optimized database indexes

**Reference**: Use `/schema-designer` subagent

---

### Day 5: Security & Production Prep

#### Task 4.5: Security Audit

**Complexity**: Medium
**Time Estimate**: 5 hours

**Subtasks**:
- [ ] Run security review:
  ```
  Launch security-reviewer subagent to audit:
  - Authentication implementation
  - RBAC permissions
  - Webhook security
  - XSS/CSRF prevention
  ```
- [ ] Review findings and fix critical issues
- [ ] Verify environment variables:
  - No secrets in frontend build
  - Production `.env` uses strong secrets
  - `AUTH_COOKIE_SECURE=true` in production
- [ ] Test CORS configuration
- [ ] Review Directus logs for security warnings

**Success Criteria**:
- ✅ No critical security issues
- ✅ All secrets properly secured
- ✅ RBAC working correctly

**Deliverables**:
- Security audit report
- Fixed security issues

**Reference**: Use `/security-reviewer` subagent

---

#### Task 4.6: Production Deployment Prep

**Complexity**: Medium
**Time Estimate**: 4 hours

**Subtasks**:
- [ ] Update environment variables for production:
  - Backend `.env`: `PUBLIC_URL`, `CORS_ORIGIN`, `AUTH_COOKIE_SECURE=true`
  - Frontend `.env`: `VITE_DIRECTUS_URL` (production API)
- [ ] Set up production database backup:
  ```bash
  /db-backup
  # Set up automated backups via cron
  ```
- [ ] Configure webhook URL in Cal.com (production endpoint)
- [ ] Test production build:
  ```bash
  cd frontend && npm run build
  cd backend && docker-compose -f docker-compose.prod.yml up -d
  ```
- [ ] Run deployment smoke tests:
  - Login works
  - Booking works
  - Webhook receives events
- [ ] Document deployment procedure

**Success Criteria**:
- ✅ Production environment configured
- ✅ Database backup automated
- ✅ Deployment tested
- ✅ Documentation complete

**Deliverables**:
- Production configuration
- Deployment documentation

---

## Post-Implementation: Launch & Monitoring

### Task 5.1: Launch Checklist

**Pre-Launch**:
- [ ] All tests passing
- [ ] Security audit complete
- [ ] Database backed up
- [ ] Monitoring set up (optional: Sentry, LogRocket)
- [ ] User documentation created
- [ ] Admin training completed

**Launch**:
- [ ] Deploy to production:
  ```bash
  /deploy-production
  ```
- [ ] Verify all services healthy
- [ ] Test critical flows manually
- [ ] Monitor logs for errors (first 24 hours)

**Post-Launch**:
- [ ] Gather user feedback
- [ ] Address bugs (priority: critical > high > medium)
- [ ] Plan Phase 2 features (if applicable)

---

## Risk Management

### High-Risk Items

1. **Cal.com Webhook Reliability**
   - **Risk**: Webhook failures cause booking data loss
   - **Mitigation**: Implement retry logic, monitor webhook delivery, manual reconciliation process

2. **RBAC Misconfiguration**
   - **Risk**: Users access other users' data
   - **Mitigation**: Thorough testing, security audit, monitoring

3. **Payment Sync Issues**
   - **Risk**: Payment completes but booking not created
   - **Mitigation**: Idempotent webhook processing, manual reconciliation tool

### Medium-Risk Items

1. **Performance Degradation**
   - **Risk**: App slows down as data grows
   - **Mitigation**: Database indexing, pagination, caching

2. **Timezone Confusion**
   - **Risk**: Bookings show wrong times
   - **Mitigation**: Store all times in UTC, test with different timezones

---

## Success Metrics

### Technical Metrics

- API response time < 200ms (p95)
- Webhook processing time < 2 seconds
- Frontend bundle size < 500KB (initial load)
- Zero critical security vulnerabilities
- Test coverage > 70% (if implementing tests)

### Business Metrics

- User registration rate
- Booking completion rate
- Media engagement (views per user)
- User retention (7-day, 30-day)

---

## Appendix: Estimation Assumptions

- **Developer Experience**: Intermediate to advanced (React, APIs, databases)
- **Working Hours**: 6 productive hours/day
- **Blockers**: Minimal (access to all required tools/services)
- **Iterations**: First-time implementation (no refactoring)

**Total Effort Estimate**: ~200 hours (5 weeks × 40 hours/week)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Maintained By**: Claude Code Agent
