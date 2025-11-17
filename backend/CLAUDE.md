# Backend - Directus + PostgreSQL

## Overview

Directus serves as the **Backend-as-a-Service (BaaS)** and **Headless CMS**, providing:

- **Data Persistence**: PostgreSQL with 1:1 schema reflection
- **Authentication**: JWT-based auth with refresh tokens
- **Authorization**: Role-Based Access Control (RBAC)
- **API Layer**: Auto-generated REST API
- **Automation**: Directus Flows for webhook processing

## Architecture

```
┌─────────────────┐
│   React App     │
└────────┬────────┘
         │ HTTPS (Cookie Auth)
         ↓
┌─────────────────┐      ┌──────────────┐
│    Directus     │◄────►│  PostgreSQL  │
│   (Node.js)     │      │   Database   │
└────────┬────────┘      └──────────────┘
         │
         │ Webhook Receiver
         ↓
┌─────────────────┐
│  Directus Flows │
│  (Automation)   │
└─────────────────┘
         ↑
         │ POST /flows/trigger/sync-booking
         │
┌─────────────────┐
│    Cal.com      │
└─────────────────┘
```

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Directus 10+
- **Database**: PostgreSQL 15+
- **Deployment**: Docker + Docker Compose
- **Environment**: Docker `.env` file

## Project Structure

```
backend/
├── docker-compose.yml        # Service orchestration
├── .env                      # Environment variables (gitignored)
├── .env.example              # Template
├── extensions/               # Custom Directus extensions
│   ├── hooks/               # Lifecycle hooks (code)
│   ├── endpoints/           # Custom API routes
│   └── interfaces/          # Custom field types
├── flows/                    # Exported Flow configurations (JSON)
│   ├── sync-booking.json
│   └── send-confirmation.json
├── migrations/               # Schema snapshots
│   └── schema-snapshot.yaml
└── uploads/                  # File storage (gitignored)
```

## Environment Configuration

### Required Variables

**File**: `.env`

```bash
####################################
# General
####################################
PORT=8055
PUBLIC_URL=https://api.tennisportal.com

####################################
# Database
####################################
DB_CLIENT=pg
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=tenni
DB_USER=directus
DB_PASSWORD=<strong-password>

####################################
# Security
####################################
SECRET=<random-32-char-string>
KEY=<random-32-char-string>
ADMIN_EMAIL=admin@tennisportal.com
ADMIN_PASSWORD=<strong-password>

####################################
# Authentication
####################################
AUTH_PROVIDERS=
REFRESH_TOKEN_TTL=7d
ACCESS_TOKEN_TTL=15m

# Cookie-based auth settings
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=lax
AUTH_COOKIE_NAME=directus_refresh_token

####################################
# CORS (for React frontend)
####################################
CORS_ENABLED=true
CORS_ORIGIN=https://tennisportal.com
CORS_CREDENTIALS=true

####################################
# Email (for registration verification)
####################################
EMAIL_FROM=noreply@tennisportal.com
EMAIL_TRANSPORT=smtp
EMAIL_SMTP_HOST=smtp.sendgrid.net
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=apikey
EMAIL_SMTP_PASSWORD=<sendgrid-api-key>

####################################
# Storage (File Uploads)
####################################
STORAGE_LOCATIONS=local
STORAGE_LOCAL_ROOT=./uploads

####################################
# Extensions
####################################
EXTENSIONS_PATH=./extensions
```

### Security Best Practices

1. **SECRET & KEY**: Must be 32+ random characters
   ```bash
   # Generate secure random strings
   openssl rand -base64 32
   ```

2. **Database Password**: Strong, unique password
3. **Admin Credentials**: Change immediately after first login
4. **CORS**: Restrict to specific frontend domain (not wildcard `*`)

## Data Model Conventions

### Naming Standards

**CRITICAL**: All collections and fields MUST use `snake_case`

```sql
-- ✅ CORRECT
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES directus_users(id),
  start_time TIMESTAMPTZ,
  cal_booking_id INTEGER
);

-- ❌ WRONG (will cause issues in Directus)
CREATE TABLE Bookings (
  id UUID,
  userId UUID,
  startTime TIMESTAMP
);
```

### Collection Design Patterns

#### System Collection Extension (directus_users)

**Extend, don't duplicate**. Add custom fields directly to `directus_users`:

```yaml
# Fields to add via Directus Admin UI
- skill_level (Dropdown: Beginner, Intermediate, Advanced, Pro)
- preferred_court_surface (Dropdown: Clay, Grass, Hard)
- stripe_customer_id (String, nullable)
- phone_number (String, nullable, E.164 format)
- membership_tier (Dropdown: Standard, Gold, Platinum)
```

**Why extend?**
- Single source of truth for identity
- Available immediately in `$CURRENT_USER` context
- No JOIN complexity for profile data

#### Custom Collections

**Bookings** (`bookings`)

```yaml
Collection: bookings
Primary Key: id (UUID, auto-generated)
Fields:
  - user_id (M2O → directus_users, Restrict on delete)
  - cal_booking_id (Integer, nullable)
  - cal_uid (String, unique, required)
  - event_type_id (Integer)
  - start_time (Timestamp, required)
  - end_time (Timestamp, required)
  - status (Dropdown: confirmed, cancelled, rescheduled, completed)
  - payment_status (Dropdown: paid, pending, refunded)
  - court_assignment (M2O → courts, nullable)
  - notes (Text, nullable)
  - created_at (Timestamp, auto-generated)
```

**Courts** (`courts`)

```yaml
Collection: courts
Primary Key: id (Integer, auto-increment)
Fields:
  - name (String, required, unique)
  - surface (Dropdown: Clay, Grass, Hard)
  - image (Image → directus_files)
  - maintenance_schedule (JSON, nullable)
  - cal_resource_id (String, nullable)
  - status (Dropdown: active, maintenance, closed)
```

**Media Items** (`media_items`)

```yaml
Collection: media_items
Primary Key: id (UUID, auto-generated)
Fields:
  - title (String, required)
  - description (Text)
  - video_url (String, nullable)
  - video_file (File → directus_files, nullable)
  - thumbnail (Image → directus_files)
  - difficulty_level (Dropdown: Beginner, Intermediate, Advanced, Pro)
  - duration (Integer, seconds)
  - status (Dropdown: draft, published, archived)
  - tags (M2M → media_items_tags → tags)
  - created_at (Timestamp)
  - published_date (Timestamp, nullable)
```

**Tags** (`tags`)

```yaml
Collection: tags
Primary Key: id (Integer, auto-increment)
Fields:
  - name (String, required, unique)
  - slug (String, required, unique)
  - category (Dropdown: Technique, Strategy, Fitness, Mental)
  - description (Text, nullable)
```

**Junction Table** (`media_items_tags`)

Auto-created by Directus when configuring M2M relationship. No manual intervention needed.

### Relationship Configuration

**Many-to-One (M2O)**

Example: `bookings.user_id` → `directus_users.id`

Settings:
- **On Delete**: Restrict (preserve booking history even if user deleted)
- **On Deselect**: Nullify (optional)

**Many-to-Many (M2M)**

Example: `media_items` ↔ `tags`

Configuration:
1. Create junction collection: `media_items_tags`
2. In `media_items`: Add M2M field pointing to `tags` via junction
3. In `tags`: Add M2M field pointing to `media_items` via junction

## Role-Based Access Control (RBAC)

### Custom Roles

#### Role: Tennis Player

**Configuration:**

```yaml
Role Name: Tennis Player
Admin Access: Disabled
App Access: Disabled (API-only access)

Permissions:
  directus_users:
    - Action: Read
      Filter: { "id": { "_eq": "$CURRENT_USER" } }
      Fields: [id, first_name, last_name, email, avatar, skill_level, membership_tier]
    - Action: Update
      Filter: { "id": { "_eq": "$CURRENT_USER" } }
      Fields: [first_name, last_name, avatar, phone_number, preferred_court_surface]
      Deny: [role, status, membership_tier, stripe_customer_id]

  bookings:
    - Action: Read
      Filter: { "user_id": { "_eq": "$CURRENT_USER" } }
      Fields: [*, court_assignment.name, court_assignment.surface]
    - Action: Create
      Preset: { "user_id": "$CURRENT_USER" }
      Fields: [start_time, end_time, notes]
    - Action: Update
      Filter: { "user_id": { "_eq": "$CURRENT_USER" } }
      Fields: [notes]
      Deny: [user_id, start_time, end_time, payment_status, cal_booking_id]

  media_items:
    - Action: Read
      Filter: { "status": { "_eq": "published" } }
      Fields: [*, tags.tags_id.name, tags.tags_id.category]

  courts:
    - Action: Read
      Filter: null (all)
      Fields: [id, name, surface, image]

  tags:
    - Action: Read
      Filter: null (all)
      Fields: [*]
```

#### Role: Coach/Admin

**Configuration:**

```yaml
Role Name: Coach
Admin Access: Enabled
App Access: Enabled

Permissions:
  ALL COLLECTIONS:
    - Full CRUD access
```

### Permission Best Practices

1. **Additive Permissions**: If user matches multiple policies, they get the union
2. **$CURRENT_USER**: Always use for user-scoped data (not hardcoded IDs)
3. **Field Presets**: Use for `Create` actions to auto-set fields (e.g., `user_id`)
4. **Field Deny**: Explicitly deny sensitive fields from user updates
5. **Deep Permissions**: Configure relationship field access separately

## Directus Flows (Automation)

### Flow: Sync Cal.com Booking

**Purpose**: Ingest Cal.com webhook and create booking record

**Trigger**: Webhook
- Method: POST
- Path: `sync-booking`
- URL: `https://api.tennisportal.com/flows/trigger/sync-booking`
- Authentication: Custom header `X-Cal-Secret-Key`

**Operations:**

```yaml
1. Log Payload (Audit)
   Type: Log to Console
   Data: "{{$trigger.body}}"

2. Validate Secret
   Type: Condition
   Rule: "{{$trigger.headers.x-cal-secret-key}}" == "<SECRET_VALUE>"
   If False: Stop flow (security)

3. Validate Event Type
   Type: Condition
   Rule: "{{$trigger.body.triggerEvent}}" in ["BOOKING_CREATED", "BOOKING_PAID"]
   If False: Stop flow

4. Resolve User
   Type: Read Data
   Collection: directus_users
   Filter: { "email": { "_eq": "{{$trigger.body.payload.attendees[0].email}}" } }
   Limit: 1
   Output Variable: resolved_user

5. Check User Exists
   Type: Condition
   Rule: "{{resolved_user.length}}" > 0
   If False: Send admin alert & stop

6. Upsert Booking
   Type: Run Script (JavaScript)
   Script:
     const calUid = $trigger.body.payload.uid;

     // Try to find existing booking
     const existing = await $items('bookings').readByQuery({
       filter: { cal_uid: { _eq: calUid } }
     });

     const bookingData = {
       user_id: $resolved_user[0].id,
       cal_booking_id: $trigger.body.payload.id,
       cal_uid: calUid,
       event_type_id: $trigger.body.payload.eventTypeId,
       start_time: $trigger.body.payload.startTime,
       end_time: $trigger.body.payload.endTime,
       status: 'confirmed',
       payment_status: $trigger.body.payload.payment?.[0]?.success ? 'paid' : 'pending'
     };

     if (existing.length > 0) {
       // Update
       await $items('bookings').updateOne(existing[0].id, bookingData);
     } else {
       // Create
       await $items('bookings').createOne(bookingData);
     }

     return { success: true, booking_id: existing[0]?.id || 'new' };

7. Send Confirmation Email (Optional)
   Type: Send Email
   To: "{{$trigger.body.payload.attendees[0].email}}"
   Subject: "Booking Confirmed - Tennis Portal"
   Body: "Your booking for {{$trigger.body.payload.startTime}} is confirmed!"
```

### Exporting/Importing Flows

```bash
# Export Flow as JSON (via Directus UI)
# Settings > Flows > [Flow Name] > Export

# Save to: backend/flows/sync-booking.json

# Import: Upload via Flows UI
```

## Database Migrations

### Schema Snapshots

Directus supports schema version control via snapshots:

```bash
# Create snapshot (run in Directus container)
npx directus schema snapshot ./migrations/schema-snapshot.yaml

# Apply snapshot to new instance
npx directus schema apply ./migrations/schema-snapshot.yaml
```

**Best Practice**: Commit snapshots to git after major schema changes.

## Docker Deployment

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: tenni
      POSTGRES_USER: directus
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - tenni-network
    restart: unless-stopped

  directus:
    image: directus/directus:10-latest
    ports:
      - "8055:8055"
    environment:
      SECRET: ${SECRET}
      KEY: ${KEY}
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      DB_CLIENT: pg
      DB_HOST: postgres
      DB_PORT: 5432
      DB_DATABASE: tenni
      DB_USER: directus
      DB_PASSWORD: ${DB_PASSWORD}
      PUBLIC_URL: ${PUBLIC_URL}
      CORS_ENABLED: true
      CORS_ORIGIN: ${CORS_ORIGIN}
      CORS_CREDENTIALS: true
      AUTH_PROVIDERS: ""
      REFRESH_TOKEN_TTL: 7d
      ACCESS_TOKEN_TTL: 15m
    volumes:
      - ./uploads:/directus/uploads
      - ./extensions:/directus/extensions
    networks:
      - tenni-network
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  tenni-network:
```

### Deployment Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f directus

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build

# Access Directus shell
docker-compose exec directus sh

# Database backup
docker-compose exec postgres pg_dump -U directus tenni > backup.sql
```

## API Reference

### Authentication Endpoints

```bash
# Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Logout
POST /auth/logout

# Refresh Token
POST /auth/refresh

# Get Current User
GET /users/me
```

### Collection Endpoints (Auto-generated)

```bash
# Get bookings (with filter)
GET /items/bookings?filter[user_id][_eq]=$CURRENT_USER

# Create booking
POST /items/bookings
{
  "user_id": "uuid",
  "start_time": "2023-10-27T10:00:00Z",
  "end_time": "2023-10-27T11:00:00Z"
}

# Get media (with deep filter on tags)
GET /items/media_items?filter[tags][tags_id][name][_eq]=Serve&fields=*,tags.tags_id.name
```

## Monitoring & Debugging

### Logs

```bash
# Directus logs
docker-compose logs -f directus

# PostgreSQL logs
docker-compose logs -f postgres
```

### Health Check

```bash
# Server status
curl https://api.tennisportal.com/server/health

# Database connection
docker-compose exec directus npx directus database migrate:latest
```

### Common Issues

**Issue**: "Database connection failed"
- Check `.env` DB credentials
- Ensure postgres container is running
- Verify network connectivity

**Issue**: "CORS error from frontend"
- Set `CORS_ORIGIN` to frontend URL
- Enable `CORS_CREDENTIALS=true`
- Check `AUTH_COOKIE_SECURE` matches protocol (https)

**Issue**: "Flow not triggering"
- Verify webhook URL is publicly accessible
- Check Flow is enabled (not draft)
- Validate secret header matches

## Quick Reference

```bash
# Access Directus Admin
https://api.tennisportal.com

# API Documentation
https://api.tennisportal.com/server/specs/oas

# Create admin user (CLI)
docker-compose exec directus npx directus users create \
  --email admin@example.com \
  --password <password> \
  --role administrator
```

---

**Last Updated**: 2025-11-17
**Directus Version**: 10+
**PostgreSQL Version**: 15+
