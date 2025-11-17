# Tennis Portal - Component Architecture Diagrams

## Overview

This document provides visual representations of the Tennis Portal's component architecture, data flow, and system interactions.

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                     (React SPA - Port 5173)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌────────────────┐ ┌─────────────┐ ┌──────────────────┐
│  Directus API  │ │  Cal.com    │ │  Static Assets   │
│  (REST/GraphQL)│ │  Embed      │ │  (Images/Videos) │
└────────┬───────┘ └──────┬──────┘ └──────────────────┘
         │                │
         │                │ (Webhook on booking)
         ▼                ▼
┌─────────────────────────────────┐
│        Directus Server          │
│       (Node.js - Port 8055)     │
│  ┌─────────────────────────┐   │
│  │   Directus Flows        │   │ ◄─── Webhook Receiver
│  │   (Automation Engine)   │   │
│  └─────────────────────────┘   │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│       PostgreSQL Database       │
│        (Port 5432)              │
│  ┌──────────────────────────┐  │
│  │  Collections:            │  │
│  │  - directus_users        │  │
│  │  - bookings              │  │
│  │  - media_items           │  │
│  │  - courts                │  │
│  │  - tags                  │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘

External Services:
┌─────────────┐       ┌─────────────┐
│  Cal.com    │       │   Stripe    │
│  Scheduling │◄─────►│  Payments   │
└─────────────┘       └─────────────┘
```

---

## 2. Frontend Component Hierarchy

```
App
├── AuthProvider (Context)
│   │
│   └── Router
│       ├── PublicRoutes
│       │   ├── Login (Page)
│       │   │   └── LoginForm
│       │   └── Register (Page)
│       │       └── RegisterForm
│       │
│       └── ProtectedRoutes (requires auth)
│           ├── Layout
│           │   ├── Header
│           │   │   ├── Navigation
│           │   │   └── UserMenu
│           │   └── Main Content Area
│           │
│           ├── Dashboard (Page)
│           │   ├── WelcomeBanner
│           │   ├── UpcomingBookings (Widget)
│           │   ├── RecommendedVideos (Widget)
│           │   └── QuickActions (Widget)
│           │
│           ├── Booking (Page)
│           │   ├── EventTypeSelector
│           │   └── BookingEmbed (Cal.com)
│           │
│           ├── Schedule (Page)
│           │   ├── UserCalendar (FullCalendar)
│           │   └── EventModal
│           │       ├── BookingDetails
│           │       └── RescheduleButton
│           │
│           ├── MediaLibrary (Page)
│           │   ├── FilterBar
│           │   │   ├── DifficultyFilter
│           │   │   └── TagFilter
│           │   ├── MediaGrid
│           │   │   └── MediaCard[] (map)
│           │   └── VideoPlayer (Modal)
│           │
│           └── Profile (Page)
│               ├── ProfileInfo
│               ├── EditProfileForm
│               └── ChangePasswordForm
│
└── UI Components (Shared)
    ├── LoadingSpinner
    ├── SkeletonCard
    ├── Button
    ├── Input
    ├── Modal
    └── Toast (react-hot-toast)
```

---

## 3. Frontend Data Flow

### 3.1 Authentication Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │
     │ 1. Enter email/password
     ▼
┌─────────────────┐
│  LoginForm      │
└────┬────────────┘
     │
     │ 2. client.login(email, password)
     ▼
┌─────────────────────────────────┐
│  Directus SDK (lib/directus.js) │
└────┬────────────────────────────┘
     │
     │ 3. POST /auth/login
     ▼
┌─────────────────────────────────┐
│      Directus Server            │
│  - Validates credentials        │
│  - Issues JWT access token      │
│  - Sets refresh token cookie    │
└────┬────────────────────────────┘
     │
     │ 4. Response: { access_token, user }
     │    + Set-Cookie: directus_refresh_token
     ▼
┌─────────────────────────────────┐
│  AuthContext (React Context)    │
│  - Stores user state            │
│  - Updates components via hook  │
└────┬────────────────────────────┘
     │
     │ 5. User logged in
     ▼
┌─────────────────────────────────┐
│  Dashboard (Protected Route)    │
└─────────────────────────────────┘
```

**Auto-Refresh Mechanism**:

```
API Request → 401 (Token Expired)
    ↓
SDK intercepts error
    ↓
POST /auth/refresh (with refresh_token cookie)
    ↓
Receive new access_token
    ↓
Retry original request
    ↓
Success
```

---

### 3.2 Booking Flow

```
User Journey:

┌─────────┐
│  User   │
└────┬────┘
     │
     │ 1. Click "Book Now"
     ▼
┌─────────────────────────────────┐
│  Booking Page                   │
│  - Renders Cal.com Embed        │
└────┬────────────────────────────┘
     │
     │ 2. Cal.com Embed initialized
     │    Prefilled: user.name, user.email
     ▼
┌─────────────────────────────────┐
│  Cal.com (External Service)     │
│  - Shows availability           │
│  - Handles time selection       │
└────┬────────────────────────────┘
     │
     │ 3. User selects time slot
     ▼
┌─────────────────────────────────┐
│  Stripe Payment (via Cal.com)   │
│  - User enters card details     │
│  - Payment processed            │
└────┬────────────────────────────┘
     │
     │ 4. Payment successful
     │    Booking confirmed in Cal.com
     ▼
┌─────────────────────────────────┐
│  Cal.com fires Webhook          │
│  POST /flows/trigger/sync-booking
│  {                               │
│    triggerEvent: "BOOKING_PAID" │
│    payload: { ... }             │
│  }                               │
└────┬────────────────────────────┘
     │
     │ 5. Webhook received
     ▼
┌─────────────────────────────────┐
│  Directus Flow: sync-booking    │
│  Operations:                    │
│  1. Validate secret             │
│  2. Resolve user by email       │
│  3. Check for duplicate         │
│  4. Upsert booking record       │
└────┬────────────────────────────┘
     │
     │ 6. Booking created in PostgreSQL
     ▼
┌─────────────────────────────────┐
│  PostgreSQL: bookings table     │
│  {                               │
│    id: uuid                     │
│    user_id: uuid                │
│    cal_booking_id: int          │
│    start_time: timestamp        │
│    status: "confirmed"          │
│    payment_status: "paid"       │
│  }                               │
└────┬────────────────────────────┘
     │
     │ 7. Frontend event listener (optional)
     │    Cal.com fires "bookingSuccessful"
     ▼
┌─────────────────────────────────┐
│  React App                      │
│  - Shows success message        │
│  - Refetches user's bookings    │
│  - Updates calendar (if open)   │
└─────────────────────────────────┘
```

**Key Points**:
- **Payment** handled entirely by Cal.com + Stripe (PCI-DSS compliant)
- **Booking** confirmed only after payment succeeds
- **Webhook** ensures data sync between Cal.com and Directus
- **Single Source of Truth**: Directus/PostgreSQL (not Cal.com)

---

### 3.3 Calendar Visualization Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │
     │ 1. Navigate to Schedule page
     ▼
┌─────────────────────────────────┐
│  Schedule Page (React)          │
│  - Renders UserCalendar         │
└────┬────────────────────────────┘
     │
     │ 2. FullCalendar initializes
     │    events={fetchEvents} (function)
     ▼
┌─────────────────────────────────┐
│  fetchEvents function           │
│  - Receives: fetchInfo          │
│    { startStr, endStr }         │
└────┬────────────────────────────┘
     │
     │ 3. Query Directus API
     │    GET /items/bookings?filter[user_id]=...
     │    &filter[start_time][_gte]=2023-10-01
     │    &filter[end_time][_lte]=2023-10-31
     ▼
┌─────────────────────────────────┐
│  Directus API                   │
│  - Filters bookings by user     │
│  - Filters by date range        │
│  - Includes court_assignment    │
└────┬────────────────────────────┘
     │
     │ 4. Response: Array of bookings
     ▼
┌─────────────────────────────────┐
│  Transform to FullCalendar      │
│  events format:                 │
│  {                               │
│    id: booking.id               │
│    title: court.name            │
│    start: booking.start_time    │
│    end: booking.end_time        │
│    extendedProps: { ... }       │
│    backgroundColor: ...         │
│  }                               │
└────┬────────────────────────────┘
     │
     │ 5. successCallback(events)
     ▼
┌─────────────────────────────────┐
│  FullCalendar renders events    │
│  - Color-coded by status        │
│  - Border-coded by payment      │
└────┬────────────────────────────┘
     │
     │ 6. User clicks event
     ▼
┌─────────────────────────────────┐
│  EventModal opens               │
│  - Shows booking details        │
│  - Reschedule button            │
└─────────────────────────────────┘
```

**Optimization**:
- **Lazy Loading**: Only fetches bookings for visible month
- **Caching**: Browser caches responses for repeated navigation
- **Server-Side Filtering**: Directus filters in database (not in React)

---

### 3.4 Media Recommendation Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │
     │ 1. Navigate to Media Library
     ▼
┌─────────────────────────────────┐
│  MediaLibrary Page              │
│  - useMedia() hook              │
└────┬────────────────────────────┘
     │
     │ 2. useAuth() gets user.skill_level
     ▼
┌─────────────────────────────────┐
│  useMedia Hook                  │
│  - Fetches recommendations      │
│    based on skill level         │
└────┬────────────────────────────┘
     │
     │ 3. Query Directus with filters
     │    GET /items/media_items?
     │    filter[difficulty_level][_eq]=Beginner
     │    &filter[status][_eq]=published
     │    &fields=*,tags.tags_id.name
     ▼
┌─────────────────────────────────┐
│  Directus API                   │
│  - Filters by difficulty        │
│  - Filters by status            │
│  - Includes M2M tags            │
└────┬────────────────────────────┘
     │
     │ 4. Response: Array of media_items
     │    (with nested tags)
     ▼
┌─────────────────────────────────┐
│  MediaGrid Component            │
│  - Maps media items to cards    │
└────┬────────────────────────────┘
     │
     │ 5. Render MediaCard for each
     ▼
┌─────────────────────────────────┐
│  MediaCard                      │
│  - Thumbnail                    │
│  - Title                        │
│  - Difficulty badge             │
│  - Tags (chips)                 │
│  - Duration                     │
└────┬────────────────────────────┘
     │
     │ 6. User clicks card
     ▼
┌─────────────────────────────────┐
│  VideoPlayer Modal              │
│  - Embedded video (YouTube)     │
│  - Description                  │
│  - Tags (clickable filters)     │
└─────────────────────────────────┘
```

**M2M Deep Filtering**:

```sql
-- Directus translates this filter:
filter[tags][tags_id][name][_in]=Serve,Forehand

-- To this SQL:
SELECT m.* FROM media_items m
JOIN media_items_tags mt ON m.id = mt.media_item_id
JOIN tags t ON mt.tags_id = t.id
WHERE t.name IN ('Serve', 'Forehand')
AND m.difficulty_level = 'Beginner'
AND m.status = 'published'
```

---

## 4. Backend Component Architecture

### 4.1 Directus Collections & Relationships

```
┌────────────────────────────────────────────────────────────────┐
│                      DIRECTUS COLLECTIONS                      │
└────────────────────────────────────────────────────────────────┘

directus_users (System Collection - Extended)
├── id (UUID, PK)
├── email (String, Unique)
├── password (Hash)
├── first_name (String)
├── last_name (String)
├── role (M2O → directus_roles)
├── skill_level (Dropdown) ◄── Custom Field
├── preferred_court_surface (Dropdown) ◄── Custom Field
├── stripe_customer_id (String) ◄── Custom Field
├── phone_number (String) ◄── Custom Field
└── membership_tier (Dropdown) ◄── Custom Field

bookings (Custom Collection)
├── id (UUID, PK)
├── user_id (M2O → directus_users) ◄── Owner
├── cal_booking_id (Integer) ◄── Cal.com reference
├── cal_uid (String, Unique) ◄── Cal.com UID
├── event_type_id (Integer)
├── start_time (Timestamp) ◄── Indexed
├── end_time (Timestamp)
├── status (Dropdown: confirmed, cancelled, rescheduled, completed)
├── payment_status (Dropdown: paid, pending, refunded)
├── court_assignment (M2O → courts)
└── notes (Text)

courts (Custom Collection)
├── id (Integer, PK)
├── name (String, Unique)
├── surface (Dropdown: Clay, Grass, Hard)
├── image (Image → directus_files)
├── maintenance_schedule (JSON)
├── cal_resource_id (String)
└── status (Dropdown: active, maintenance, closed)

media_items (Custom Collection)
├── id (UUID, PK)
├── title (String)
├── description (Text)
├── video_url (String)
├── video_file (File → directus_files)
├── thumbnail (Image → directus_files)
├── difficulty_level (Dropdown: Beginner, Intermediate, Advanced, Pro)
├── duration (Integer, seconds)
├── status (Dropdown: draft, published, archived)
├── tags (M2M → media_items_tags → tags) ◄── Many-to-Many
├── created_at (Timestamp)
└── published_date (Timestamp)

tags (Custom Collection)
├── id (Integer, PK)
├── name (String, Unique)
├── slug (String, Unique)
├── category (Dropdown: Technique, Strategy, Fitness, Mental)
└── description (Text)

media_items_tags (Junction Table - Auto-Created)
├── id (Integer, PK)
├── media_item_id (UUID, FK → media_items)
└── tags_id (Integer, FK → tags)


RELATIONSHIPS DIAGRAM:

directus_users
    │
    │ (One-to-Many)
    ▼
bookings ──────┐
    │          │ (Many-to-One)
    │          ▼
    │      courts
    │
    │ (Foreign Key Reference)
    │
   Cal.com ──► (cal_booking_id, cal_uid)

media_items ◄──────┐
    │               │
    │ (Many-to-Many via junction)
    ▼               │
media_items_tags    │
    │               │
    ▼               │
  tags ─────────────┘
```

---

### 4.2 Directus Flows Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                       DIRECTUS FLOWS                           │
└────────────────────────────────────────────────────────────────┘

Flow: sync-booking
├── Trigger: Webhook (POST /flows/trigger/sync-booking)
├── Operations:
│   │
│   ├─ 1. Log Payload (Console)
│   │    Purpose: Audit trail
│   │
│   ├─ 2. Validate Secret (Condition)
│   │    Check: headers['x-cal-secret-key'] == SECRET
│   │    Fail: Return 401 Unauthorized
│   │
│   ├─ 3. Validate Event Type (Condition)
│   │    Check: triggerEvent in ['BOOKING_CREATED', 'BOOKING_PAID']
│   │    Fail: Stop (ignore event)
│   │
│   ├─ 4. Resolve User (Read Data: directus_users)
│   │    Filter: email == payload.attendees[0].email
│   │    Output: $resolved_user
│   │
│   ├─ 5. Check User Exists (Condition)
│   │    Check: $resolved_user.length > 0
│   │    Fail: Email admin + Stop
│   │
│   ├─ 6. Check Duplicate (Read Data: bookings)
│   │    Filter: cal_uid == payload.uid
│   │    Output: $existing_booking
│   │
│   ├─ 7. Upsert Booking (Run Script - JavaScript)
│   │    Logic:
│   │      if ($existing_booking.length > 0)
│   │        Update existing booking
│   │      else
│   │        Create new booking
│   │    Output: $booking_result
│   │
│   └─ 8. Log Result (Console)
│        Data: "Booking {action}: {id}"
│
└── Result: Booking synced to PostgreSQL

Flow: send-confirmation-email (Future)
├── Trigger: On bookings.create
├── Operations:
│   ├─ 1. Read Booking Details
│   ├─ 2. Read User Details
│   ├─ 3. Send Email
│   └─ 4. Log Delivery
└── Result: User receives confirmation email
```

---

## 5. Data Model Entity-Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────┐
│                  ENTITY-RELATIONSHIP DIAGRAM                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   directus_users     │
├──────────────────────┤
│ PK: id (UUID)        │
│ email                │
│ password_hash        │
│ first_name           │
│ last_name            │
│ role_id (FK)         │
│ skill_level          │◄────────────┐
│ membership_tier      │             │
│ stripe_customer_id   │             │
│ phone_number         │             │
└──────────────────────┘             │
          │                          │ Filters recommendations
          │ Creates                  │ based on skill level
          │ (1:N)                    │
          ▼                          │
┌──────────────────────┐             │
│     bookings         │             │
├──────────────────────┤             │
│ PK: id (UUID)        │             │
│ FK: user_id          │             │
│ cal_booking_id       │             │
│ cal_uid (Unique)     │             │
│ event_type_id        │             │
│ start_time           │             │
│ end_time             │             │
│ status               │             │
│ payment_status       │             │
│ FK: court_id         │             │
│ notes                │             │
└──────────────────────┘             │
          │ Reserves                 │
          │ (N:1)                    │
          ▼                          │
┌──────────────────────┐             │
│      courts          │             │
├──────────────────────┤             │
│ PK: id (Integer)     │             │
│ name                 │             │
│ surface              │             │
│ image_id (FK)        │             │
│ maintenance_schedule │             │
│ cal_resource_id      │             │
│ status               │             │
└──────────────────────┘             │
                                     │
                                     │
┌──────────────────────┐             │
│    media_items       │◄────────────┘
├──────────────────────┤
│ PK: id (UUID)        │
│ title                │
│ description          │
│ video_url            │
│ thumbnail_id (FK)    │
│ difficulty_level     │◄──── Matches user.skill_level
│ duration             │
│ status               │
└──────────────────────┘
          │
          │ (M:N)
          ▼
┌──────────────────────┐
│ media_items_tags     │ (Junction Table)
├──────────────────────┤
│ PK: id               │
│ FK: media_item_id    │
│ FK: tags_id          │
└──────────────────────┘
          │
          │ (N:1)
          ▼
┌──────────────────────┐
│       tags           │
├──────────────────────┤
│ PK: id (Integer)     │
│ name (Unique)        │
│ slug (Unique)        │
│ category             │
│ description          │
└──────────────────────┘


RELATIONSHIP TYPES:
─────────────────────
directus_users ──1:N──► bookings (One user has many bookings)
bookings ──N:1──► courts (Many bookings to one court)
media_items ◄──M:N──► tags (Many-to-many via junction table)
media_items.difficulty_level ══► directus_users.skill_level (Logical filter, not FK)
```

---

## 6. API Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      API ENDPOINTS                              │
└─────────────────────────────────────────────────────────────────┘

AUTHENTICATION ENDPOINTS:
POST   /auth/login          ─► Login (returns access token + sets cookie)
POST   /auth/logout         ─► Logout (clears cookie)
POST   /auth/refresh        ─► Refresh access token (uses cookie)
POST   /auth/password/request ─► Request password reset
POST   /users/register      ─► Public user registration

COLLECTION ENDPOINTS (Auto-Generated by Directus):
GET    /items/bookings      ─► List bookings (filtered by RBAC)
GET    /items/bookings/:id  ─► Get single booking
POST   /items/bookings      ─► Create booking (manual, not via Cal.com)
PATCH  /items/bookings/:id  ─► Update booking (limited by RBAC)
DELETE /items/bookings/:id  ─► Delete booking (admin only)

GET    /items/media_items   ─► List media (published only for players)
GET    /items/media_items/:id ─► Get single media item

GET    /items/courts         ─► List courts (public read)
GET    /items/tags           ─► List tags (public read)

USER ENDPOINTS:
GET    /users/me            ─► Get current user profile
PATCH  /users/me            ─► Update own profile (limited fields)

FLOW ENDPOINTS (Custom Webhook Triggers):
POST   /flows/trigger/sync-booking  ─► Cal.com webhook receiver

QUERY PARAMETERS (Directus Standard):
?filter[field][_eq]=value        ─► Exact match
?filter[field][_contains]=value  ─► Contains (for strings)
?filter[field][_gte]=value       ─► Greater than or equal
?filter[field][_in]=val1,val2    ─► IN operator
?fields=field1,field2            ─► Select specific fields
?fields=*,relation.field         ─► Deep field selection (for M2O, M2M)
?limit=10                        ─► Limit results
?offset=20                       ─► Pagination offset
?sort=-created_at                ─► Sort (- for descending)


EXAMPLE QUERIES:

Get user's upcoming bookings:
GET /items/bookings?filter[user_id][_eq]=$CURRENT_USER&filter[start_time][_gte]=$NOW&fields=*,court_assignment.name&sort=start_time

Get beginner videos tagged "Serve":
GET /items/media_items?filter[difficulty_level][_eq]=Beginner&filter[tags][tags_id][name][_eq]=Serve&fields=*,tags.tags_id.name,thumbnail.filename_disk

Get current user with extended fields:
GET /users/me?fields=*,role.name
```

---

## 7. Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Network Security (Production)                         │
├─────────────────────────────────────────────────────────────────┤
│ - HTTPS/TLS for all traffic                                    │
│ - Firewall rules (Docker network isolation)                    │
│ - CORS restricted to specific domain                           │
│ - Rate limiting on API endpoints                               │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Authentication                                         │
├─────────────────────────────────────────────────────────────────┤
│ - JWT access tokens (short-lived: 15 min)                      │
│ - Refresh tokens (HttpOnly cookies, 7 days)                    │
│ - No tokens in LocalStorage (XSS mitigation)                   │
│ - Auto-refresh mechanism                                       │
│ - Cookie settings: Secure, SameSite=Lax, HttpOnly              │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Authorization (RBAC)                                   │
├─────────────────────────────────────────────────────────────────┤
│ Tennis Player Role:                                             │
│ - Read own profile ($CURRENT_USER filter)                      │
│ - Read own bookings ($CURRENT_USER filter)                     │
│ - Read published media (status filter)                         │
│ - Update own profile (limited fields)                          │
│ - Denied: Other users' data, admin operations                  │
│                                                                 │
│ Coach/Admin Role:                                               │
│ - Full CRUD on all collections                                 │
│ - Access to Directus Admin UI                                  │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Data Security                                          │
├─────────────────────────────────────────────────────────────────┤
│ - No credit card storage (PCI-DSS compliant)                   │
│ - Passwords hashed (bcrypt)                                    │
│ - Sensitive fields denied in RBAC (stripe_customer_id, role)   │
│ - Database connection encrypted (SSL in production)            │
│ - Field-level permissions                                      │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5: Webhook Security                                       │
├─────────────────────────────────────────────────────────────────┤
│ - Secret header validation (X-Cal-Secret-Key)                  │
│ - Signature verification (HMAC SHA256)                         │
│ - Replay attack prevention (cal_uid uniqueness check)          │
│ - IP whitelisting (optional, production)                       │
│ - Webhook payload validation                                   │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 6: Application Security                                  │
├─────────────────────────────────────────────────────────────────┤
│ - Input validation (Directus schema + React Hook Form)         │
│ - XSS prevention (React escapes by default)                    │
│ - CSRF prevention (SameSite cookies)                           │
│ - SQL injection prevention (Directus ORM)                      │
│ - No dangerouslySetInnerHTML usage                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                        │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────┐
│         CDN / Static Hosting      │
│         (Vercel/Netlify/S3)       │
│  - React build (frontend/dist/)   │
│  - Gzip compression               │
│  - Cache headers                  │
└───────────────┬───────────────────┘
                │
                │ HTTPS
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
│  - React App loaded from CDN                                    │
│  - API calls to Directus (HTTPS)                                │
│  - Cal.com embed loaded (iframe)                                │
└───────────┬────────────────────────────────────┬────────────────┘
            │                                    │
            │ API Requests                       │ Booking Embed
            ▼                                    ▼
┌───────────────────────────┐      ┌────────────────────────────┐
│   Directus API Server     │      │      Cal.com Service       │
│   (VPS/Cloud Instance)    │◄─────┤  (SaaS or Self-Hosted)    │
│  - Node.js runtime        │      │  - Scheduling logic        │
│  - Port: 8055 (internal)  │      │  - Payment via Stripe      │
│  - Reverse proxy (nginx)  │      │  - Webhook trigger         │
│  - HTTPS via Let's Encrypt│      └────────────┬───────────────┘
└───────────┬───────────────┘                   │
            │                                   │ Webhook POST
            │                                   ▼
            │                      ┌────────────────────────────┐
            │                      │  Directus Flow Endpoint    │
            │                      │  /flows/trigger/sync-booking│
            │                      └────────────────────────────┘
            │
            │ Database Connection (PostgreSQL protocol)
            ▼
┌───────────────────────────┐
│   PostgreSQL Database     │
│  - Version: 15+           │
│  - Docker container       │
│  - Persistent volume      │
│  - Automated backups      │
└───────────────────────────┘


EXTERNAL SERVICES:
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Stripe API    │◄──────┤   Cal.com       │──────►│  Email (SMTP)   │
│  (Payments)     │       │  (Scheduling)   │       │  (SendGrid)     │
└─────────────────┘       └─────────────────┘       └─────────────────┘


BACKUP & MONITORING:
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  S3 / Cloud     │◄──────┤  Cron Job       │       │  Sentry/LogRocket│
│  Storage        │       │  (DB Backups)   │       │  (Error Tracking)│
│  (Backups)      │       │  Daily @ 2 AM   │       │  (Optional)     │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## Conclusion

This component architecture provides a comprehensive view of the Tennis Portal's technical implementation, from high-level system design to detailed component interactions and data flows.

**Key Architectural Principles**:
- **Separation of Concerns**: Frontend, backend, and external services decoupled
- **Single Source of Truth**: Directus/PostgreSQL as system of record
- **Event-Driven Sync**: Webhooks bridge Cal.com and Directus
- **Security by Design**: Multi-layer security architecture
- **Scalability**: Composable architecture allows independent scaling
- **Maintainability**: Clear component boundaries and responsibilities

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**Maintained By**: Claude Code Agent
