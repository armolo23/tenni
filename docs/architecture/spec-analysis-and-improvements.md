# Technical Specification Analysis & Improvements

## Document Purpose

This document analyzes the complete Technical Functional Specification against the current implementation planning, identifying gaps, clarifications needed, and architectural improvements to integrate before Phase 4 implementation begins.

**Analysis Date**: 2025-11-17
**Reviewed By**: Claude Code Agent
**Status**: Pre-Implementation Review

---

## 1. Missing Collection: user_progress

### Discovery

The ERD diagram in Section 3.3 references a `USER_PROGRESS` collection that is **not detailed** in the collections specification (Section 3.2).

```
DIRECTUS_USERS |--|--o{ USER_PROGRESS : "tracks"
```

### Analysis

This appears to be an **optional/future enhancement** for tracking user engagement with training videos. While not critical for Phase 1-3 (Foundation, Booking, Content), it adds significant value by:

1. Tracking which videos users have watched
2. Storing completion percentage (for resume functionality)
3. Enabling user ratings/feedback on content
4. Providing data for improved recommendations

### Recommendation

**Design now, implement in Phase 4 or post-launch.**

### Proposed Schema: user_progress Collection

```yaml
Collection: user_progress
Primary Key: id (UUID, auto-generated)

Fields:
  - user_id (M2O → directus_users, NOT NULL)
    - On Delete: CASCADE (remove progress if user deleted)

  - media_item_id (M2O → media_items, NOT NULL)
    - On Delete: CASCADE (remove progress if video deleted)

  - completed_at (Timestamp, NULLABLE)
    - When user finished the video

  - progress_percentage (Integer, DEFAULT 0)
    - Playback progress (0-100)
    - Check constraint: >= 0 AND <= 100

  - last_watched_at (Timestamp, DEFAULT NOW())
    - Auto-updated on each view

  - rating (Integer, NULLABLE)
    - User rating (1-5 stars)
    - Check constraint: >= 1 AND <= 5

  - notes (Text, NULLABLE)
    - User's personal notes on the video

Unique Constraint: (user_id, media_item_id)
  - One progress record per user per video

Indexes:
  - idx_user_progress_user_id ON user_id
  - idx_user_progress_media_item_id ON media_item_id
  - idx_user_progress_completed ON completed_at WHERE completed_at IS NOT NULL
    (partial index for completed videos)

Permissions (Tennis Player):
  - Read: { "user_id": { "_eq": "$CURRENT_USER" } }
  - Create: Preset user_id to $CURRENT_USER
  - Update: Own records only
  - Delete: Own records only
```

**SQL Migration**:

```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES directus_users(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, media_item_id)
);

-- Indexes
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_media_item_id ON user_progress(media_item_id);
CREATE INDEX idx_user_progress_completed ON user_progress(completed_at) WHERE completed_at IS NOT NULL;

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Frontend Integration**:

```javascript
// Track video progress
const trackProgress = async (mediaItemId, percentage) => {
  await client.request(updateItem('user_progress', progressId, {
    progress_percentage: percentage,
    last_watched_at: new Date().toISOString(),
    completed_at: percentage === 100 ? new Date().toISOString() : null
  }));
};

// Get user's progress on a specific video
const getVideoProgress = async (mediaItemId) => {
  const progress = await client.request(readItems('user_progress', {
    filter: {
      _and: [
        { user_id: { _eq: '$CURRENT_USER' } },
        { media_item_id: { _eq: mediaItemId } }
      ]
    },
    limit: 1
  }));
  return progress[0];
};
```

**Priority**: Low (post-Phase 3)
**Action**: Document for future implementation

---

## 2. Membership Tier RBAC Business Logic

### Discovery

Section 3.1.1 mentions:

> "Used for RBAC policies (e.g., Gold members can book 14 days out; Standard only 7)."

### Analysis

This is **date-based authorization** that requires custom logic. Directus RBAC does not natively support dynamic date filtering based on user attributes.

### Implementation Options

#### Option A: Client-Side Enforcement (Recommended for MVP)

**Location**: React booking component
**Logic**: Check `user.membership_tier` and disable dates beyond allowed window

```javascript
// In BookingEmbed component
const getMaxBookingDate = (membershipTier) => {
  const daysAhead = {
    'Standard': 7,
    'Gold': 14,
    'Platinum': 30
  };
  return addDays(new Date(), daysAhead[membershipTier] || 7);
};

// Pass to Cal.com embed config
cal("ui", {
  maxDate: getMaxBookingDate(user.membership_tier)
});
```

**Pros**: Simple, fast to implement
**Cons**: Can be bypassed by tech-savvy users (mitigated by server-side validation)

#### Option B: Cal.com Availability Rules

**Location**: Cal.com event type configuration
**Logic**: Configure different event types per membership tier

```
Event: "Private Lesson (Standard)" - 7 days ahead
Event: "Private Lesson (Gold)" - 14 days ahead
Event: "Private Lesson (Platinum)" - 30 days ahead
```

**Pros**: Server-side enforcement, no bypass
**Cons**: Requires multiple Cal.com event types, more complex setup

#### Option C: Directus Custom Endpoint

**Location**: Custom Directus endpoint
**Logic**: Validate booking date before allowing creation

```javascript
// extensions/endpoints/validate-booking/index.js
export default (router) => {
  router.post('/validate-booking', async (req, res) => {
    const { user_id, start_time } = req.body;
    const user = await req.accountability.user;

    const maxDays = {
      'Standard': 7,
      'Gold': 14,
      'Platinum': 30
    }[user.membership_tier] || 7;

    const maxDate = addDays(new Date(), maxDays);

    if (new Date(start_time) > maxDate) {
      return res.status(403).json({
        error: 'Booking date exceeds membership tier limit'
      });
    }

    res.json({ valid: true });
  });
};
```

**Pros**: Server-side enforcement, flexible
**Cons**: Requires custom code, adds complexity

### Recommendation

**Phase 1-2**: Use **Option A** (client-side) for MVP
**Phase 3+**: Add **Option C** (custom endpoint) for security

**Priority**: Medium (implement in Phase 2)
**Action**: Add to booking component implementation

---

## 3. Cal.com API Version Compatibility

### Discovery

Section 5.3 explicitly states:

> "It is vital to note that Cal.com has two API versions (v1 and v2) and the webhook payloads differ. This specification assumes API v2."

### Analysis

This is a **critical configuration point** that can cause integration failures if not properly set.

### Required Actions

1. **Verify Cal.com Version**: Check which API version the Cal.com instance uses
2. **Webhook Payload Validation**: Ensure Flow expects v2 structure
3. **Documentation**: Clearly document version dependency

### Cal.com v1 vs v2 Payload Differences

**v1 Payload** (Legacy):
```json
{
  "event": "booking.created",
  "booking": {
    "id": 12345,
    "uid": "abc123",
    // Different structure
  }
}
```

**v2 Payload** (Current):
```json
{
  "triggerEvent": "BOOKING_CREATED",
  "createdAt": "2023-10-27T10:00:00Z",
  "payload": {
    "uid": "abc123",
    "id": 12345,
    // Spec structure
  }
}
```

### Directus Flow Adjustments

Ensure Flow operations reference v2 structure:

```yaml
# CORRECT (v2)
{{$trigger.body.triggerEvent}}
{{$trigger.body.payload.uid}}
{{$trigger.body.payload.attendees[0].email}}

# WRONG (v1)
{{$trigger.body.event}}
{{$trigger.body.booking.uid}}
```

### Recommendation

**Add to Backend Setup Checklist**:

```markdown
## Cal.com Configuration Checklist

- [ ] Verify Cal.com API version: **v2 required**
- [ ] Configure webhook with v2 payload format
- [ ] Test webhook payload structure matches spec
- [ ] Document API version in .env or README
```

**Priority**: High (critical for Phase 2)
**Action**: Add to deployment documentation

---

## 4. Guest User Handling in Webhook Flow

### Discovery

Section 6.1 mentions:

> "If the user is not found (e.g., they booked as a guest but didn't register), the Flow logic must branch. Ideally, it should create a 'Guest User' or flag the booking for manual review."

### Analysis

This is an **edge case** that needs explicit handling to prevent webhook failures and data loss.

### Current Flow Gap

My current Flow design **stops execution** if user not found. This is safe but loses the booking data.

### Improved Flow Logic

```yaml
Operation 3: Resolve User (Read Data)
  Collection: directus_users
  Filter: { "email": { "_eq": "{{$trigger.body.payload.attendees[0].email}}" } }
  Output: $resolved_user

Operation 4: Check User Exists (Condition)
  Rule: {{ $resolved_user.length }} > 0

  If TRUE: Continue to Upsert Booking

  If FALSE: Branch to Guest User Handling
    4a. Create Guest User (Create Data)
      Collection: directus_users
      Data:
        email: {{ $trigger.body.payload.attendees[0].email }}
        first_name: {{ $trigger.body.payload.attendees[0].name.split(' ')[0] }}
        last_name: {{ $trigger.body.payload.attendees[0].name.split(' ').slice(1).join(' ') }}
        role: <guest-role-id>
        status: "unverified"
        skill_level: "Beginner" (default)
        membership_tier: "Standard" (default)
      Output: $created_guest_user

    4b. Send Admin Alert (Send Email)
      To: admin@tennisportal.com
      Subject: "Guest Booking Alert"
      Body: |
        A booking was made by an unregistered user:
        Email: {{ $trigger.body.payload.attendees[0].email }}
        Booking: {{ $trigger.body.payload.title }}
        Time: {{ $trigger.body.payload.startTime }}

        A guest account has been created. Please follow up.

    4c. Set User ID for Booking
      Use: {{ $created_guest_user.id }}

Operation 5: Upsert Booking
  user_id: {{ $resolved_user[0].id || $created_guest_user.id }}
  [rest of booking data...]
```

### Guest User Role Configuration

**Create new role**: "Guest"

**Permissions**:
- Same as "Tennis Player" but more restricted
- Can only read their own bookings
- Cannot create new bookings manually (only via Cal.com)
- Cannot access media library (until verified)

### Alternative: Flagging System

Instead of creating user, create booking with `user_id: null` and `guest_email` field:

```yaml
bookings Collection Addition:
  - guest_email (String, NULLABLE)
    - Stores email if user_id is null
    - Used for guest bookings pending account creation
```

**Pros**: Simpler, no auto-user creation
**Cons**: Requires manual admin follow-up for every guest booking

### Recommendation

**Implement auto-guest-user creation** with admin notification.

**Priority**: Medium (implement in Phase 2)
**Action**: Update Flow design, create Guest role

---

## 5. Enhanced Webhook Security

### Discovery

Section 9.3 lists three security measures:

1. Secret Signature (X-Cal-Secret-Key) ✓ Already planned
2. Replay Attack Prevention ✓ Already planned (via upsert)
3. **IP Whitelisting** - Not yet documented

### IP Whitelisting Implementation

**Method 1: Nginx/Firewall Level**

```nginx
# /etc/nginx/sites-available/directus
location /flows/trigger/sync-booking {
    # Cal.com IP ranges (example - verify actual IPs)
    allow 35.192.0.0/16;
    allow 35.193.0.0/16;
    deny all;

    proxy_pass http://localhost:8055;
}
```

**Method 2: Directus Flow Condition**

```yaml
Operation 1.5: Validate Source IP (Condition)
  Rule: {{ $trigger.headers['x-forwarded-for'] }} in ['35.192.1.1', '35.193.1.1']
  If FALSE: Stop with 403
```

**Method 3: Docker Network Isolation**

```yaml
# docker-compose.yml
services:
  directus:
    # Only expose webhook endpoint to specific IPs
    # Requires reverse proxy configuration
```

### Cal.com IP Addresses

**Action Required**: Contact Cal.com or check documentation for:
- Current webhook source IPs
- IP change notification process

### Recommendation

**Phase 2**: Implement secret validation only
**Phase 3/Production**: Add IP whitelisting at nginx level

**Priority**: Medium (production hardening)
**Action**: Document in security checklist

---

## 6. Email Verification Flow

### Discovery

Section 4.2 mentions:

> "For higher security, email verification should be enabled. The user is created with a status of invited or unverified and must click a link sent by Directus."

### Analysis

This is **partially documented** but needs complete flow specification.

### Complete Email Verification Flow

**Step 1: Enable in Directus**

```bash
# backend/.env
EMAIL_VERIFICATION_ENABLED=true
EMAIL_FROM=noreply@tennisportal.com
EMAIL_TRANSPORT=smtp
```

**Step 2: Configure Email Templates**

Navigate to: Directus Admin > Settings > Email Templates

**Template: User Invitation**
```
Subject: Verify your Tennis Portal account

Hi {{user.first_name}},

Welcome to Tennis Portal! Please verify your email address:

{{verification_url}}

This link expires in 24 hours.
```

**Step 3: User Registration Flow**

```javascript
// React Register Component
const handleRegister = async (data) => {
  try {
    // User created with status: "unverified"
    await client.request(createUser({
      email: data.email,
      password: data.password,
      first_name: data.first_name,
      last_name: data.last_name,
      role: 'tennis-player-role-id',
      status: 'unverified'
    }));

    // Show message to check email
    toast.success('Registration successful! Please check your email to verify your account.');

    // Redirect to login (cannot login until verified)
    navigate('/login');

  } catch (error) {
    toast.error('Registration failed: ' + error.message);
  }
};
```

**Step 4: Login Restriction**

```javascript
// React Login Component
const handleLogin = async (email, password) => {
  try {
    await client.login(email, password);

  } catch (error) {
    if (error.code === 'UNVERIFIED_USER') {
      toast.error('Please verify your email before logging in. Check your inbox.');
    } else {
      toast.error('Login failed: ' + error.message);
    }
  }
};
```

**Step 5: Verification Endpoint**

User clicks link in email:
```
https://api.tennisportal.com/users/verify-email?token=abc123
```

Directus automatically verifies and updates status to "active".

**Step 6: Post-Verification**

```javascript
// After successful verification, redirect to:
https://tennisportal.com/login?verified=true

// Show success message
if (searchParams.get('verified') === 'true') {
  toast.success('Email verified! You can now log in.');
}
```

### Recommendation

**Enable email verification for production**, optional for development.

**Priority**: Medium (Phase 1, optional initially)
**Action**: Add to auth implementation

---

## 7. Database Index Optimization

### Discovery

Section 8.3 mentions:

> "Creating database indexes on the foreign keys in the media_items_tags junction table is recommended in PostgreSQL to maintain sub-100ms response times."

### Analysis

PostgreSQL **automatically creates indexes on primary keys**, but foreign keys need **manual indexing**.

### Required Indexes

```sql
-- Junction table indexes (for M2M deep filtering)
CREATE INDEX idx_media_items_tags_media_item_id
  ON media_items_tags(media_item_id);

CREATE INDEX idx_media_items_tags_tags_id
  ON media_items_tags(tags_id);

-- Composite index for common query pattern
CREATE INDEX idx_media_items_tags_composite
  ON media_items_tags(media_item_id, tags_id);
```

```sql
-- Bookings indexes (for date range queries)
CREATE INDEX idx_bookings_user_id
  ON bookings(user_id);

CREATE INDEX idx_bookings_start_time
  ON bookings(start_time);

CREATE INDEX idx_bookings_end_time
  ON bookings(end_time);

-- Composite index for calendar queries
CREATE INDEX idx_bookings_user_time
  ON bookings(user_id, start_time, end_time);

-- Unique index for webhook deduplication
CREATE UNIQUE INDEX idx_bookings_cal_uid
  ON bookings(cal_uid);
```

```sql
-- Media items indexes
CREATE INDEX idx_media_items_difficulty_level
  ON media_items(difficulty_level);

CREATE INDEX idx_media_items_status
  ON media_items(status);

-- Composite index for recommendation query
CREATE INDEX idx_media_items_difficulty_status
  ON media_items(difficulty_level, status);
```

### Add to Schema Migration

Update `backend/migrations/indexes.sql`:

```sql
-- All indexes for Tennis Portal
-- Run after initial schema creation

-- Media M2M Junction
CREATE INDEX IF NOT EXISTS idx_media_items_tags_media_item_id
  ON media_items_tags(media_item_id);
CREATE INDEX IF NOT EXISTS idx_media_items_tags_tags_id
  ON media_items_tags(tags_id);

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_user_time ON bookings(user_id, start_time);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_cal_uid ON bookings(cal_uid);

-- Media Items
CREATE INDEX IF NOT EXISTS idx_media_items_difficulty_status
  ON media_items(difficulty_level, status);
```

### Recommendation

**Create indexes during Phase 1** (schema setup).

**Priority**: High (performance critical)
**Action**: Add to schema migration script

---

## 8. PostgreSQL Row Level Security (Optional Enhancement)

### Discovery

Section 9.1 mentions:

> "The underlying PostgreSQL database should ideally be configured with Row Level Security (RLS) if direct database access is ever granted to other services."

### Analysis

This is **defense in depth** - Directus RBAC is primary security, RLS is backup.

### RLS Implementation Example

```sql
-- Enable RLS on bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own bookings
CREATE POLICY bookings_user_isolation ON bookings
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- Policy: Admins can see all bookings
CREATE POLICY bookings_admin_access ON bookings
  FOR ALL
  USING (
    current_setting('app.current_user_role') = 'administrator'
  );
```

**Directus Integration**:

Directus would need to set session variables:
```sql
SET app.current_user_id = '<user-uuid>';
SET app.current_user_role = '<role-name>';
```

### Challenges

- Directus does not natively support RLS session variable setting
- Requires custom Directus hooks or database triggers
- Adds complexity

### Recommendation

**Skip RLS for MVP**. Directus RBAC is sufficient for this architecture.

**Priority**: Low (optional security enhancement)
**Action**: Document for future consideration

---

## 9. Clarifications & Best Practices

### 9.1 Webhook Payload Array Access

**Spec shows**:
```javascript
{{$trigger.body.payload.attendees.email}}
```

**Should be** (attendees is array):
```javascript
{{$trigger.body.payload.attendees[0].email}}
```

**Action**: Ensure Flow uses array notation

---

### 9.2 FullCalendar Timezone Configuration

**Spec mentions two approaches**:

1. **Local Timezone** (user's browser):
   ```javascript
   timeZone: 'local'
   ```

2. **Club Timezone** (fixed location):
   ```javascript
   timeZone: 'America/New_York' // Example for NYC tennis club
   ```

**Decision Point**: Which approach to use?

**Recommendation**:
- **Single Location Club**: Use club timezone (e.g., `'Europe/London'`)
- **Multi-Location**: Use `'local'`

**Action**: Clarify business requirement during Phase 3

---

### 9.3 Cal.com Namespace

**Spec mentions**:
```javascript
{ namespace: "tennisBooking" }
```

**Purpose**: Prevents conflicts when multiple Cal.com embeds on same page.

**Example Use Case**: Booking page with multiple coaches listed, each with their own embed.

```javascript
<BookingEmbed calLink="coach-john/lesson" namespace="coach-john" />
<BookingEmbed calLink="coach-sarah/lesson" namespace="coach-sarah" />
```

**Action**: Use unique namespace per embed instance

---

## 10. Summary of Required Actions

### Critical (Must implement before Phase 2)

1. ✅ **Cal.com API v2 Verification** - Confirm version and payload structure
2. ✅ **Database Indexes** - Create all indexes during schema setup
3. ✅ **Webhook Array Notation** - Use `attendees[0]` in Flow
4. ✅ **Guest User Handling** - Implement Flow branch for unregistered users

### Important (Implement during Phase 2-3)

5. ✅ **Membership Tier Logic** - Client-side date restrictions
6. ✅ **Email Verification** - Enable for production
7. ✅ **IP Whitelisting** - Document Cal.com IPs for production
8. ✅ **user_progress Collection** - Design for Phase 3/4

### Optional (Post-Launch)

9. ⚪ **PostgreSQL RLS** - Enhanced security layer
10. ⚪ **Server-Side Membership Validation** - Custom Directus endpoint

---

## 11. Updated Implementation Priority Matrix

| Priority | Item | Phase | Effort | Impact |
|----------|------|-------|--------|--------|
| P0 | Database indexes | 1 | Low | High |
| P0 | Cal.com v2 verification | 2 | Low | High |
| P0 | Webhook array notation | 2 | Low | High |
| P1 | Guest user handling | 2 | Medium | High |
| P1 | Membership tier UI logic | 2 | Low | Medium |
| P2 | Email verification | 1 | Low | Medium |
| P2 | IP whitelisting docs | 3 | Low | Medium |
| P3 | user_progress collection | 3/4 | Medium | High |
| P4 | PostgreSQL RLS | Post | High | Low |

---

## 12. Conclusion

The existing planning is **comprehensive and aligned** with the spec. Key improvements identified:

1. **Missing Collection**: `user_progress` designed
2. **Security Enhancements**: Guest user handling, IP whitelisting
3. **Performance**: Database indexes specified
4. **Business Logic**: Membership tier enforcement
5. **Clarifications**: Cal.com v2, timezone handling, array notation

All critical gaps have been identified and documented. The project is **ready for Phase 4 implementation** with enhanced confidence in architectural completeness.

---

**Next Step**: Integrate these improvements into implementation roadmap and begin Phase 4: Implementation.

**Reviewed By**: Claude Code Agent
**Approval Status**: ✅ Ready for Implementation
**Document Version**: 1.0
