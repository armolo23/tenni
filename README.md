# Tenni - Tennis Client Portal

A composable web architecture for tennis club court reservations, lesson scheduling, and personalized training content delivery.

## Architecture

- **Frontend**: React.js SPA with FullCalendar.io
- **Backend**: Directus (Headless CMS) + PostgreSQL
- **Booking**: Cal.com integration with Stripe payments
- **Automation**: Directus Flows for webhook synchronization

## Project Structure

```
tenni/
├── frontend/          # React application
├── backend/           # Directus + PostgreSQL (Docker)
├── docs/              # Technical documentation
└── .claude/           # Development automation (Claude Code)
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

### 1. Clone & Install

```bash
git clone <repository-url>
cd tenni

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Backend Setup (Directus + PostgreSQL)

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# IMPORTANT: Set strong values for SECRET, KEY, and passwords

# Start services
docker-compose up -d

# Access Directus Admin UI
# http://localhost:8055
```

### 3. Frontend Setup

```bash
cd frontend

# Copy environment template
cp .env.example .env

# Edit .env
# Set VITE_DIRECTUS_URL to your Directus instance

# Start development server
npm run dev

# Access app at http://localhost:5173
```

## Development Workflow

### Running Locally

```bash
# Terminal 1: Backend
cd backend && docker-compose up

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Database Migrations

```bash
# Create schema snapshot
docker-compose exec directus npx directus schema snapshot ./migrations/schema-snapshot.yaml

# Apply snapshot
docker-compose exec directus npx directus schema apply ./migrations/schema-snapshot.yaml
```

### Database Backup

```bash
cd backend
docker-compose exec postgres pg_dump -U directus tenni > backups/backup-$(date +%Y%m%d).sql
```

## Configuration

### Backend Environment Variables

Required variables in `backend/.env`:

```bash
# Database
DB_PASSWORD=<strong-password>

# Security (generate with: openssl rand -base64 32)
SECRET=<32-char-secret>
KEY=<32-char-secret>

# Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<strong-password>

# CORS
CORS_ORIGIN=http://localhost:5173

# Public URL
PUBLIC_URL=http://localhost:8055
```

### Frontend Environment Variables

Required variables in `frontend/.env`:

```bash
VITE_DIRECTUS_URL=http://localhost:8055
VITE_CAL_NAMESPACE=tennisBooking
```

## Key Features

### Authentication & Authorization

- Cookie-based JWT authentication
- Role-based access control (RBAC)
- Tennis Player vs Coach/Admin roles

### Booking Flow

1. User selects time in Cal.com embed
2. Payment processed via Stripe
3. Webhook fires to Directus Flow
4. Booking record created in PostgreSQL
5. Calendar updated in real-time

### Media Recommendations

- Content tagged with Many-to-Many relationship
- Filtered by user skill level
- Deep query support via Directus SDK

## Documentation

- **Architecture**: `docs/architecture/technical-spec.md`
- **Frontend Guide**: `frontend/CLAUDE.md`
- **Backend Guide**: `backend/CLAUDE.md`
- **Automation**: `.claude/CLAUDE.md`

## Claude Code Integration

This project includes **Claude Code automation**:

### Slash Commands

```bash
/schema-migrate      # Create/apply database migrations
/api-test           # Test Directus API endpoints
/deploy-staging     # Deploy to staging
/flow-export        # Export Directus Flows
/db-backup          # Create database backup
/seed-data          # Populate sample data
```

### Automated Hooks

- **Auto-lint**: ESLint runs after JavaScript edits
- **Type-check**: TypeScript validation after changes
- **Pre-commit**: Test validation before commits

### Subagents

- `schema-designer`: Database schema design expert
- `security-reviewer`: Security vulnerability analysis
- `api-integrator`: Cal.com/Directus integration
- `flow-builder`: Directus Flow configuration

## Tech Stack Details

### Frontend

- React 18+ (Vite)
- TailwindCSS
- React Router v6
- Directus JavaScript SDK
- @calcom/embed-react
- FullCalendar.io
- React Hook Form + Zod

### Backend

- Directus 10+
- PostgreSQL 15+
- Node.js 20+
- Docker & Docker Compose

### External Services

- Cal.com (booking engine)
- Stripe (payments)
- SendGrid (email - optional)

## Deployment

### Staging

```bash
/deploy-staging
```

### Production

```bash
/deploy-production
# Includes safety checks and automatic backup
```

## Security Considerations

- **PCI-DSS**: No credit card data stored (handled by Stripe via Cal.com)
- **Authentication**: HttpOnly, Secure, SameSite cookies
- **RBAC**: Granular permissions per collection
- **Webhook Security**: Secret validation on Cal.com webhooks
- **Environment**: All secrets in .env (never committed)

## Troubleshooting

### Backend won't start

```bash
# Check Docker logs
cd backend
docker-compose logs -f

# Common issues:
# - Database password mismatch
# - Port 8055 already in use
# - Missing environment variables
```

### Frontend can't connect to Directus

```bash
# Verify CORS settings in backend/.env
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true

# Check Directus is running
curl http://localhost:8055/server/health
```

### Webhook not triggering

```bash
# Verify Flow is enabled in Directus Admin
# Check webhook URL is publicly accessible
# Validate secret header matches Cal.com configuration
```

## Testing

```bash
# Frontend tests
cd frontend
npm run test

# Type checking
npm run type-check

# Linting
npm run lint
```

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes with clear commit messages
3. Ensure tests pass
4. Push and create pull request

## License

[Your License Here]

## Support

For issues or questions:
- Technical Spec: `docs/architecture/technical-spec.md`
- GitHub Issues: [Your repo issues URL]

---

**Built with Claude Code** - AI-assisted development automation
