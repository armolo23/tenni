# Tenni - Tennis Client Portal

## Project Overview

Tenni is a **Composable Web Architecture** Tennis Client Portal enabling seamless court reservations, lesson scheduling, user management, and personalized media content delivery.

## Core Architecture

### Technology Stack

- **Frontend**: React.js SPA (Single Page Application)
- **Backend/CMS**: Directus (Node.js) + PostgreSQL
- **Booking Engine**: Cal.com (Platform/Atom integration)
- **Calendar UI**: FullCalendar.io
- **Payments**: Stripe (via Cal.com)
- **Automation**: Directus Flows (webhook bridge)

### Architectural Principles

1. **Separation of Concerns**: Frontend orchestrates; Directus owns data; Cal.com handles scheduling logic
2. **Event-Driven Synchronization**: Webhooks bridge Cal.com transactions to Directus persistence
3. **Single Source of Truth**: Directus/PostgreSQL is the system of record for all user and booking data
4. **Security-First**: Cookie-based auth, RBAC, PCI-DSS compliant (payments offloaded)
5. **Composability**: Best-in-class tools for distinct functional domains

## Data Flow Architecture

```
User → React App → Authentication (Directus JWT)
                ↓
        ┌───────┴────────┐
        ↓                ↓
    Directus API    Cal.com Embed
    (Profile/Media)  (Booking/Payment)
        ↓                ↓
    PostgreSQL      Stripe → Webhook
        ↑                ↓
        └────── Directus Flows ──┘
                (Sync Layer)
```

### Key Integration Points

1. **Authentication**: Directus issues JWT tokens; React SDK manages sessions
2. **Booking Creation**: Cal.com Embed → Stripe Payment → Webhook to Directus Flow
3. **Data Persistence**: Directus Flow parses webhook → Creates booking record in PostgreSQL
4. **Visualization**: React fetches bookings from Directus → Renders in FullCalendar.io

## Core Data Model

### Collections (PostgreSQL Tables)

- **directus_users** (extended): User profiles with tennis-specific fields
- **bookings**: Court/lesson reservations (mirrors Cal.com transactions)
- **courts**: Physical assets (courts/facilities)
- **media_items**: Training videos/content
- **tags**: Content taxonomy (M2M with media_items)

### Critical Relationships

- `bookings.user_id` → `directus_users.id` (M2O)
- `bookings.court_assignment` → `courts.id` (M2O)
- `media_items` ←→ `tags` (M2M via `media_items_tags` junction)

## Naming Conventions

### Database/Collections
- **MUST use snake_case** for all collection and field names (PostgreSQL compatibility)
- ❌ BAD: `UserBookings`, `firstName`
- ✅ GOOD: `user_bookings`, `first_name`

### Code
- **React Components**: PascalCase (`BookingForm.jsx`)
- **Functions/Variables**: camelCase (`fetchUserBookings`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Files**: kebab-case for utilities (`date-utils.js`)

## Security Standards

### Authentication
- Cookie-based auth (HttpOnly, Secure, SameSite)
- JWT access tokens (short-lived) + refresh tokens
- No sensitive tokens in LocalStorage (XSS mitigation)

### Authorization (RBAC)
- **Tennis Player**: Read own bookings/profile; Read published media
- **Coach/Admin**: Full access to all collections

### Data Protection
- All timestamps stored in UTC (PostgreSQL default)
- No credit card data in Directus (PCI-DSS compliance)
- Webhook validation via secret headers (`X-Cal-Secret-Key`)

## Environment Configuration

### Required Variables

**Backend (Directus)**
```bash
DB_CLIENT=pg
DB_HOST=postgres
DB_DATABASE=tenni
DB_USER=directus
DB_PASSWORD=<strong-password>
SECRET=<32-char-secret>
ADMIN_EMAIL=admin@tennisportal.com
PUBLIC_URL=https://api.tennisportal.com
```

**Frontend (React)**
```bash
VITE_DIRECTUS_URL=https://api.tennisportal.com
VITE_CAL_NAMESPACE=tennisBooking
```

**Cal.com**
```bash
STRIPE_CLIENT_ID=<stripe-client-id>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
WEBHOOK_URL=https://api.tennisportal.com/flows/trigger/sync-booking
```

## Development Workflow

### Branch Strategy
- Main branch: `main`
- Feature branches: `claude/<feature-name>-<session-id>`
- All development occurs on feature branches
- Push with `git push -u origin <branch-name>`

### Common Commands

```bash
# Frontend development
cd frontend && npm run dev

# Backend (Directus) via Docker
cd backend && docker-compose up -d

# Database migrations
# (Managed via Directus Admin UI or schema snapshots)

# Run tests
npm test

# Type checking
npm run type-check
```

## Project Structure

```
tenni/
├── .claude/                 # Claude Code automation
│   ├── commands/           # Slash commands (manual triggers)
│   ├── subagents/          # Specialized AI agents
│   └── settings.json       # Hooks (auto triggers)
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── lib/           # Directus SDK client
│   │   ├── hooks/         # React hooks
│   │   └── pages/         # Route components
│   └── package.json
├── backend/                # Directus configuration
│   ├── docker-compose.yml
│   ├── extensions/        # Custom Directus extensions
│   ├── flows/             # Directus Flow exports (JSON)
│   └── migrations/        # Schema snapshots
├── docs/                   # Documentation
│   ├── architecture/      # Technical specs
│   ├── api/               # API documentation
│   └── diagrams/          # Architecture diagrams
└── CLAUDE.md              # This file
```

## Implementation Phases

### Phase 1: Foundation & Identity
- Deploy Directus + PostgreSQL
- Extend directus_users schema
- Configure RBAC roles
- Set up React with Directus SDK

### Phase 2: Booking & Synchronization
- Configure Cal.com event types
- Implement React booking embed
- Build Directus Flow for webhook sync
- Test end-to-end booking flow

### Phase 3: Visualization & Content
- Implement FullCalendar.io
- Populate media library (M2M tags)
- Build recommendation engine
- Create user dashboard

## Key Technical Decisions

### Why M2M for Tags (not JSON)?
- **Referential Integrity**: Prevents tag duplication ("Serve" vs "serve")
- **Deep Filtering**: Cleaner SDK queries on relationships
- **Performance**: Proper indexing on junction table vs GIN indexes on JSONB
- **Consistency**: Works reliably across Directus versions

### Why Cookie Auth (not LocalStorage)?
- **XSS Protection**: HttpOnly cookies inaccessible to JavaScript
- **Security**: Secure, SameSite attributes prevent CSRF
- **Auto-Refresh**: SDK handles token refresh transparently

### Why Directus Flows (not custom middleware)?
- **No Extra Infrastructure**: Runs within Directus instance
- **Low-Code**: Visual flow builder for webhook logic
- **Audit Trail**: Built-in logging and error handling
- **Maintainability**: No separate Node.js server to deploy

## Quick Reference

### Directus SDK Patterns

```javascript
// Initialize client
import { createDirectus, authentication, rest } from '@directus/sdk';
const client = createDirectus(process.env.VITE_DIRECTUS_URL)
  .with(rest())
  .with(authentication('cookie', { autoRefresh: true }));

// Fetch with filters
const bookings = await client.request(readItems('bookings', {
  filter: { user_id: { _eq: '$CURRENT_USER' } },
  fields: ['*', 'court_assignment.name']
}));
```

### Cal.com Embed Pattern

```javascript
import Cal, { getCalApi } from '@calcom/embed-react';

useEffect(() => {
  (async function () {
    const cal = await getCalApi({ namespace: "tennisBooking" });
    cal("preload", {
      calLink: "coach-steve/private-lesson",
      name: currentUser.first_name + " " + currentUser.last_name,
      email: currentUser.email
    });
  })();
}, [currentUser]);
```

## Support & Resources

- **Directus Docs**: https://docs.directus.io
- **Cal.com Embed Docs**: https://cal.com/docs/integrations/embed
- **FullCalendar Docs**: https://fullcalendar.io/docs
- **Technical Spec**: `docs/architecture/technical-spec.md`

---

**Last Updated**: 2025-11-17
**Architecture Version**: 1.0
**Maintainer**: Claude Code Agent
