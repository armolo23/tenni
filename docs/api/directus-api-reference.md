# Directus API Reference - Tennis Portal

## Overview

This document provides a comprehensive reference for the Directus REST API endpoints used in the Tennis Portal application.

**Base URL**: `https://api.tennisportal.com` (Production)
**Base URL**: `http://localhost:8055` (Development)

**API Version**: Directus 10+
**Authentication**: Cookie-based JWT

---

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Bookings](#bookings)
4. [Media Items](#media-items)
5. [Courts](#courts)
6. [Tags](#tags)
7. [Filtering & Querying](#filtering--querying)
8. [Error Responses](#error-responses)

---

## Authentication

### POST /auth/login

Login with email and password.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200 OK):
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires": 900000,
    "refresh_token": null
  }
}
```

**Headers**:
```
Set-Cookie: directus_refresh_token=<token>; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
```

**Notes**:
- `access_token` expires in 15 minutes (900000 ms)
- `refresh_token` stored in HttpOnly cookie (7 days)
- Use `access_token` in `Authorization: Bearer <token>` header for subsequent requests

---

### POST /auth/logout

Logout and invalidate refresh token.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{}
```

---

### POST /auth/refresh

Refresh access token using refresh token cookie.

**Request**: (No body, refresh token sent via cookie)

**Response** (200 OK):
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires": 900000,
    "refresh_token": null
  }
}
```

**Error** (401 Unauthorized):
```json
{
  "errors": [
    {
      "message": "Token expired.",
      "extensions": {
        "code": "TOKEN_EXPIRED"
      }
    }
  ]
}
```

---

### POST /users/register

Register a new user (public registration must be enabled in Directus settings).

**Request**:
```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "skill_level": "Beginner",
  "phone_number": "+14155551234"
}
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "a3f2c8d1-4b5e-6789-a012-3456789abcde",
    "email": "newuser@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "tennis-player-role-id",
    "status": "unverified"
  }
}
```

**Notes**:
- User created with default role "Tennis Player"
- Status may be `unverified` if email verification is enabled
- User must verify email before login

---

## Users

### GET /users/me

Get current user's profile.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Query Parameters**:
```
fields=*,role.name
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "a3f2c8d1-4b5e-6789-a012-3456789abcde",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": {
      "id": "role-id",
      "name": "Tennis Player"
    },
    "skill_level": "Beginner",
    "preferred_court_surface": "Clay",
    "stripe_customer_id": "cus_ABC123",
    "phone_number": "+14155551234",
    "membership_tier": "Standard",
    "avatar": null
  }
}
```

---

### PATCH /users/me

Update current user's profile (limited fields based on RBAC).

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request**:
```json
{
  "first_name": "Jonathan",
  "preferred_court_surface": "Grass",
  "phone_number": "+14155559999"
}
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "a3f2c8d1-4b5e-6789-a012-3456789abcde",
    "first_name": "Jonathan",
    "preferred_court_surface": "Grass",
    "phone_number": "+14155559999"
  }
}
```

**Forbidden Fields** (403 Forbidden):
```json
{
  "errors": [
    {
      "message": "You don't have permission to access this.",
      "extensions": {
        "code": "FORBIDDEN"
      }
    }
  ]
}
```

**Notes**:
- Users **cannot** update: `role`, `status`, `membership_tier`, `stripe_customer_id`
- Users **can** update: `first_name`, `last_name`, `avatar`, `phone_number`, `preferred_court_surface`

---

## Bookings

### GET /items/bookings

List user's bookings.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Query Parameters**:
```
filter[user_id][_eq]=$CURRENT_USER
filter[start_time][_gte]=$NOW
fields=*,court_assignment.name,court_assignment.surface
sort=-start_time
limit=20
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "b1c2d3e4-5678-90ab-cdef-1234567890ab",
      "user_id": "a3f2c8d1-4b5e-6789-a012-3456789abcde",
      "cal_booking_id": 12345,
      "cal_uid": "abc123-def456",
      "event_type_id": 101,
      "start_time": "2023-10-27T10:00:00.000Z",
      "end_time": "2023-10-27T11:00:00.000Z",
      "status": "confirmed",
      "payment_status": "paid",
      "court_assignment": {
        "name": "Center Court",
        "surface": "Hard"
      },
      "notes": null
    },
    {
      "id": "c2d3e4f5-6789-01ab-cdef-234567890abc",
      "user_id": "a3f2c8d1-4b5e-6789-a012-3456789abcde",
      "cal_booking_id": 12346,
      "cal_uid": "xyz789-uvw012",
      "event_type_id": 102,
      "start_time": "2023-10-28T14:00:00.000Z",
      "end_time": "2023-10-28T15:00:00.000Z",
      "status": "confirmed",
      "payment_status": "paid",
      "court_assignment": {
        "name": "Court 1",
        "surface": "Clay"
      },
      "notes": "Bring racquet"
    }
  ]
}
```

**Notes**:
- Users only see their own bookings (enforced by RBAC)
- `$CURRENT_USER` auto-replaced with authenticated user's ID
- `$NOW` auto-replaced with current timestamp

---

### GET /items/bookings/:id

Get single booking by ID.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "b1c2d3e4-5678-90ab-cdef-1234567890ab",
    "user_id": "a3f2c8d1-4b5e-6789-a012-3456789abcde",
    "cal_booking_id": 12345,
    "cal_uid": "abc123-def456",
    "event_type_id": 101,
    "start_time": "2023-10-27T10:00:00.000Z",
    "end_time": "2023-10-27T11:00:00.000Z",
    "status": "confirmed",
    "payment_status": "paid",
    "court_assignment": {
      "id": 1,
      "name": "Center Court",
      "surface": "Hard"
    },
    "notes": null
  }
}
```

**Error** (403 Forbidden):
```json
{
  "errors": [
    {
      "message": "You don't have permission to access this.",
      "extensions": {
        "code": "FORBIDDEN"
      }
    }
  ]
}
```

**Notes**:
- User can only access their own bookings
- Returns 403 if booking belongs to another user

---

### POST /items/bookings

Create a booking (manual creation, not via Cal.com webhook).

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request**:
```json
{
  "start_time": "2023-10-30T10:00:00.000Z",
  "end_time": "2023-10-30T11:00:00.000Z",
  "court_assignment": 1,
  "notes": "Practice session"
}
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "d3e4f5g6-7890-12ab-cdef-34567890abcd",
    "user_id": "a3f2c8d1-4b5e-6789-a012-3456789abcde",
    "start_time": "2023-10-30T10:00:00.000Z",
    "end_time": "2023-10-30T11:00:00.000Z",
    "status": "confirmed",
    "payment_status": "pending",
    "court_assignment": {
      "id": 1,
      "name": "Center Court"
    },
    "notes": "Practice session"
  }
}
```

**Notes**:
- `user_id` automatically set to `$CURRENT_USER` (preset in RBAC)
- `status` defaults to `confirmed`
- `payment_status` defaults to `pending`
- Cal.com-specific fields (`cal_booking_id`, `cal_uid`) can be null

---

### PATCH /items/bookings/:id

Update booking (limited fields based on RBAC).

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request**:
```json
{
  "notes": "Bring extra balls"
}
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "b1c2d3e4-5678-90ab-cdef-1234567890ab",
    "notes": "Bring extra balls"
  }
}
```

**Forbidden Fields** (403):
- Users **cannot** update: `user_id`, `start_time`, `end_time`, `payment_status`, `cal_booking_id`, `status`
- Users **can** update: `notes` only

---

## Media Items

### GET /items/media_items

List media items (recommendations).

**Headers**:
```
Authorization: Bearer <access_token>
```

**Query Parameters**:
```
filter[difficulty_level][_eq]=Beginner
filter[status][_eq]=published
filter[tags][tags_id][name][_in]=Serve,Forehand
fields=*,tags.tags_id.name,tags.tags_id.category,thumbnail.filename_disk
limit=12
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "e4f5g6h7-8901-23ab-cdef-4567890abcde",
      "title": "Beginner Serve Technique",
      "description": "Learn the fundamentals of serving in tennis",
      "video_url": "https://www.youtube.com/watch?v=abcdefg",
      "video_file": null,
      "thumbnail": {
        "filename_disk": "thumbnail-123.jpg"
      },
      "difficulty_level": "Beginner",
      "duration": 480,
      "status": "published",
      "tags": [
        {
          "tags_id": {
            "name": "Serve",
            "category": "Technique"
          }
        },
        {
          "tags_id": {
            "name": "Fundamentals",
            "category": "Technique"
          }
        }
      ]
    },
    {
      "id": "f5g6h7i8-9012-34ab-cdef-567890abcdef",
      "title": "Forehand Basics",
      "description": "Master the forehand groundstroke",
      "video_url": "https://www.youtube.com/watch?v=hijklmn",
      "video_file": null,
      "thumbnail": {
        "filename_disk": "thumbnail-456.jpg"
      },
      "difficulty_level": "Beginner",
      "duration": 600,
      "status": "published",
      "tags": [
        {
          "tags_id": {
            "name": "Forehand",
            "category": "Technique"
          }
        }
      ]
    }
  ]
}
```

**Notes**:
- Users only see `published` media (enforced by RBAC)
- Deep filtering on M2M tags: `filter[tags][tags_id][name][_in]=Serve,Forehand`
- Thumbnail path needs to be constructed: `https://api.tennisportal.com/assets/{filename_disk}`

---

### GET /items/media_items/:id

Get single media item.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "e4f5g6h7-8901-23ab-cdef-4567890abcde",
    "title": "Beginner Serve Technique",
    "description": "Learn the fundamentals of serving in tennis. This video covers grip, stance, ball toss, and follow-through.",
    "video_url": "https://www.youtube.com/watch?v=abcdefg",
    "thumbnail": {
      "id": "thumb-id",
      "filename_disk": "thumbnail-123.jpg",
      "filename_download": "serve-thumbnail.jpg",
      "type": "image/jpeg"
    },
    "difficulty_level": "Beginner",
    "duration": 480,
    "status": "published",
    "tags": [
      {
        "tags_id": {
          "id": 1,
          "name": "Serve",
          "slug": "serve",
          "category": "Technique"
        }
      },
      {
        "tags_id": {
          "id": 5,
          "name": "Fundamentals",
          "slug": "fundamentals",
          "category": "Technique"
        }
      }
    ],
    "created_at": "2023-09-15T12:00:00.000Z",
    "published_date": "2023-09-20T10:00:00.000Z"
  }
}
```

---

## Courts

### GET /items/courts

List all courts (public read).

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "name": "Center Court",
      "surface": "Hard",
      "image": {
        "id": "img-id-1",
        "filename_disk": "center-court.jpg"
      },
      "status": "active"
    },
    {
      "id": 2,
      "name": "Court 1",
      "surface": "Clay",
      "image": {
        "id": "img-id-2",
        "filename_disk": "court-1.jpg"
      },
      "status": "active"
    },
    {
      "id": 3,
      "name": "Court 2",
      "surface": "Grass",
      "image": null,
      "status": "maintenance"
    }
  ]
}
```

**Notes**:
- All users can read courts (no filter applied)
- `maintenance_schedule` (JSON field) hidden from Tennis Player role

---

## Tags

### GET /items/tags

List all tags (public read).

**Headers**:
```
Authorization: Bearer <access_token>
```

**Query Parameters**:
```
filter[category][_eq]=Technique
sort=name
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "name": "Serve",
      "slug": "serve",
      "category": "Technique",
      "description": "Serving techniques and strategies"
    },
    {
      "id": 2,
      "name": "Forehand",
      "slug": "forehand",
      "category": "Technique",
      "description": "Forehand groundstroke techniques"
    },
    {
      "id": 3,
      "name": "Volley",
      "slug": "volley",
      "category": "Technique",
      "description": "Net play and volleys"
    }
  ]
}
```

---

## Filtering & Querying

### Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `_eq` | Equals | `filter[status][_eq]=confirmed` |
| `_neq` | Not equals | `filter[status][_neq]=cancelled` |
| `_contains` | Contains (string) | `filter[title][_contains]=Serve` |
| `_in` | In array | `filter[difficulty_level][_in]=Beginner,Intermediate` |
| `_nin` | Not in array | `filter[status][_nin]=cancelled,pending` |
| `_gt` | Greater than | `filter[duration][_gt]=300` |
| `_gte` | Greater than or equal | `filter[start_time][_gte]=$NOW` |
| `_lt` | Less than | `filter[duration][_lt]=600` |
| `_lte` | Less than or equal | `filter[end_time][_lte]=2023-12-31T23:59:59Z` |
| `_null` | Is null | `filter[notes][_null]=true` |
| `_nnull` | Is not null | `filter[notes][_nnull]=true` |

### Logical Operators

**AND** (default):
```
filter[status][_eq]=confirmed&filter[payment_status][_eq]=paid
```

**OR**:
```
filter[_or][0][status][_eq]=confirmed&filter[_or][1][status][_eq]=rescheduled
```

### Deep Filtering (Relationships)

**M2O (Many-to-One)**:
```
filter[court_assignment][name][_eq]=Center Court
```

**M2M (Many-to-Many)**:
```
filter[tags][tags_id][name][_eq]=Serve
```

### Field Selection

**Basic**:
```
fields=id,title,duration
```

**Deep (Relationships)**:
```
fields=*,court_assignment.name,tags.tags_id.name
```

**All fields + relationship**:
```
fields=*,court_assignment.*
```

### Sorting

**Ascending**:
```
sort=start_time
```

**Descending**:
```
sort=-start_time
```

**Multiple**:
```
sort=-start_time,status
```

### Pagination

**Limit**:
```
limit=20
```

**Offset**:
```
offset=20
```

**Page-based** (Directus calculates offset):
```
limit=20&page=2
```

---

## Error Responses

### 400 Bad Request

Invalid query parameters or request body.

```json
{
  "errors": [
    {
      "message": "Invalid payload. \"email\" is required.",
      "extensions": {
        "code": "INVALID_PAYLOAD"
      }
    }
  ]
}
```

---

### 401 Unauthorized

Authentication failed or token expired.

```json
{
  "errors": [
    {
      "message": "Token expired.",
      "extensions": {
        "code": "TOKEN_EXPIRED"
      }
    }
  ]
}
```

**Solution**: Use `/auth/refresh` to get a new access token.

---

### 403 Forbidden

User lacks permissions for the requested operation.

```json
{
  "errors": [
    {
      "message": "You don't have permission to access this.",
      "extensions": {
        "code": "FORBIDDEN"
      }
    }
  ]
}
```

---

### 404 Not Found

Resource not found.

```json
{
  "errors": [
    {
      "message": "Item not found.",
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ]
}
```

---

### 422 Unprocessable Entity

Validation error.

```json
{
  "errors": [
    {
      "message": "Value for field \"email\" must be unique.",
      "extensions": {
        "code": "RECORD_NOT_UNIQUE",
        "field": "email"
      }
    }
  ]
}
```

---

### 500 Internal Server Error

Server-side error.

```json
{
  "errors": [
    {
      "message": "An unexpected error occurred.",
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR"
      }
    }
  ]
}
```

**Action**: Check Directus logs for details.

---

## Rate Limiting

**Limits** (configurable in `.env`):
- 25 requests per second per IP (default)
- Rate limiter disabled in development
- Enabled in production

**Response** (429 Too Many Requests):
```json
{
  "errors": [
    {
      "message": "Too many requests, please try again later.",
      "extensions": {
        "code": "RATE_LIMIT_EXCEEDED"
      }
    }
  ]
}
```

**Headers**:
```
X-RateLimit-Limit: 25
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1698412800
```

---

## CORS Configuration

**Allowed Origin** (Production):
```
https://tennisportal.com
```

**Allowed Methods**:
```
GET, POST, PATCH, DELETE, OPTIONS
```

**Allowed Headers**:
```
Content-Type, Authorization
```

**Credentials**:
```
true (cookies allowed)
```

---

## Common Query Examples

### Get Upcoming Bookings

```
GET /items/bookings?filter[user_id][_eq]=$CURRENT_USER&filter[start_time][_gte]=$NOW&fields=*,court_assignment.name&sort=start_time&limit=10
```

---

### Get Beginner Videos Tagged "Serve"

```
GET /items/media_items?filter[difficulty_level][_eq]=Beginner&filter[status][_eq]=published&filter[tags][tags_id][name][_eq]=Serve&fields=*,tags.tags_id.name,thumbnail.filename_disk
```

---

### Get Bookings for Specific Date Range

```
GET /items/bookings?filter[start_time][_gte]=2023-10-01T00:00:00Z&filter[start_time][_lte]=2023-10-31T23:59:59Z&fields=*,court_assignment.name
```

---

### Search Media by Title

```
GET /items/media_items?filter[title][_contains]=Serve&filter[status][_eq]=published&fields=id,title,difficulty_level
```

---

## SDK Usage (JavaScript)

### Install

```bash
npm install @directus/sdk
```

### Initialize Client

```javascript
import { createDirectus, authentication, rest, readMe, readItems, updateItem } from '@directus/sdk';

const client = createDirectus('https://api.tennisportal.com')
  .with(rest())
  .with(authentication('cookie', { autoRefresh: true }));
```

### Login

```javascript
await client.login('user@example.com', 'password123');
```

### Get Current User

```javascript
const currentUser = await client.request(readMe({
  fields: ['*', 'role.name']
}));
```

### Get Bookings

```javascript
const bookings = await client.request(readItems('bookings', {
  filter: {
    user_id: { _eq: '$CURRENT_USER' },
    start_time: { _gte: '$NOW' }
  },
  fields: ['*', 'court_assignment.name'],
  sort: ['start_time'],
  limit: 20
}));
```

### Get Media Recommendations

```javascript
const recommendedVideos = await client.request(readItems('media_items', {
  filter: {
    _and: [
      { difficulty_level: { _eq: user.skill_level } },
      { status: { _eq: 'published' } },
      {
        tags: {
          tags_id: {
            name: { _in: ['Serve', 'Forehand'] }
          }
        }
      }
    ]
  },
  fields: ['*', 'tags.tags_id.name', 'thumbnail.filename_disk'],
  limit: 12
}));
```

### Update Profile

```javascript
await client.request(updateItem('directus_users', 'me', {
  first_name: 'Jonathan',
  preferred_court_surface: 'Grass'
}));
```

---

## Appendix: Special Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `$CURRENT_USER` | Authenticated user's ID (UUID) | `filter[user_id][_eq]=$CURRENT_USER` |
| `$NOW` | Current timestamp (ISO 8601) | `filter[start_time][_gte]=$NOW` |
| `$CURRENT_ROLE` | Authenticated user's role ID | `filter[role][_eq]=$CURRENT_ROLE` |

---

**Document Version**: 1.0
**Last Updated**: 2025-11-17
**API Specification**: OpenAPI 3.0 (available at `/server/specs/oas`)
**Maintained By**: Claude Code Agent
