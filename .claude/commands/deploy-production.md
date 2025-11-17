---
description: Deploy to production with safety checks and confirmation
---

# Deploy to Production

**CRITICAL**: Production deployment with mandatory safety checks, user confirmation, and automatic backup.

## ⚠️ PRE-FLIGHT SAFETY CHECKS

### 1. Mandatory Tests

All tests MUST pass before deployment:

```bash
cd frontend

# Run all tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint

# Build verification
npm run build
```

**STOP DEPLOYMENT if any test fails.**

### 2. Git Status Verification

```bash
# Verify on main branch
git branch --show-current
# Expected: main (or production branch)

# Verify clean working tree
git status
# Expected: nothing to commit, working tree clean

# Verify latest commits are pushed
git log origin/main..HEAD
# Expected: empty (no unpushed commits)
```

### 3. Environment Verification

Verify production environment variables are correctly set:

**Backend**
- `PUBLIC_URL`: Production API URL (HTTPS required)
- `AUTH_COOKIE_SECURE`: Must be `true`
- `CORS_ORIGIN`: Production frontend URL only (no wildcards)
- `SECRET` & `KEY`: Strong, unique values (never use staging secrets)

**Frontend**
- `VITE_DIRECTUS_URL`: Production API URL (HTTPS)

### 4. Database Backup

**MANDATORY**: Create full database backup before any changes:

```bash
cd backend

# Create timestamped backup
BACKUP_FILE="backups/production-backup-$(date +%Y%m%d-%H%M%S).sql"
docker-compose exec postgres pg_dump -U directus tenni > "$BACKUP_FILE"

# Verify backup file exists and is non-empty
ls -lh "$BACKUP_FILE"

# STOP if backup fails
if [ ! -s "$BACKUP_FILE" ]; then
  echo "ERROR: Backup failed or is empty. STOPPING deployment."
  exit 1
fi
```

## ⚠️ USER CONFIRMATION

Before proceeding, **ASK THE USER** explicitly:

```
═══════════════════════════════════════
  PRODUCTION DEPLOYMENT CONFIRMATION
═══════════════════════════════════════

You are about to deploy to PRODUCTION.

Pre-flight checks:
✓ All tests passed
✓ Git status clean
✓ Database backed up: <filename>
✓ Environment variables verified

This will:
- Deploy frontend to production
- Update Directus backend
- Apply schema migrations (if any)
- Restart production services

⚠️  This affects LIVE USERS.

Do you want to proceed? (yes/no)
═══════════════════════════════════════
```

**WAIT for explicit "yes" response. Cancel on any other input.**

## DEPLOYMENT PROCEDURE

### 1. Frontend Deployment

```bash
cd frontend

# Clean previous builds
rm -rf dist/

# Build for production
npm run build

# Verify build output
ls -lh dist/

# Deploy to production hosting
# Example for AWS S3 + CloudFront:
# aws s3 sync dist/ s3://tenni-production/ --delete --cache-control max-age=31536000
# aws cloudfront create-invalidation --distribution-id <id> --paths "/*"

# Example for Vercel:
# vercel --prod

# Example for Netlify:
# netlify deploy --prod --dir=dist
```

### 2. Backend Deployment

```bash
cd backend

# Tag current state for rollback
DEPLOY_TAG="deploy-$(date +%Y%m%d-%H%M%S)"
git tag "$DEPLOY_TAG"

# Pull latest Directus image
docker-compose pull directus

# Apply schema migrations (if any)
if [ -f migrations/production-migration.yaml ]; then
  docker-compose exec directus npx directus schema apply ./migrations/production-migration.yaml
fi

# Rolling restart (zero-downtime if using orchestrator like Docker Swarm/K8s)
docker-compose up -d --no-deps --build directus

# Wait for health check
echo "Waiting for Directus to be healthy..."
for i in {1..30}; do
  if curl -f http://localhost:8055/server/health > /dev/null 2>&1; then
    echo "✓ Directus healthy"
    break
  fi
  sleep 2
done
```

### 3. Verification Tests

Run production smoke tests:

```bash
# Health check
curl -f https://api.tennisportal.com/server/health || exit 1

# Authentication test (use test account)
curl -X POST https://api.tennisportal.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test"}' | jq .

# Verify webhook endpoint is accessible
curl -f https://api.tennisportal.com/flows/trigger/sync-booking || echo "WARNING: Webhook endpoint check failed"
```

### 4. Post-Deployment Monitoring

Monitor for 5 minutes after deployment:

```bash
# Watch Directus logs
docker-compose logs -f --tail=100 directus

# Check for errors (Ctrl+C to stop)
```

**Manual Checks:**
- [ ] Login to production admin panel
- [ ] Create a test booking (if safe)
- [ ] Verify Cal.com embed loads
- [ ] Check calendar displays correctly
- [ ] Test media library

## ROLLBACK PROCEDURE

If deployment fails or critical issues detected:

```bash
cd backend

echo "⚠️  INITIATING ROLLBACK"

# Stop current services
docker-compose down

# Restore database from backup
LATEST_BACKUP=$(ls -t backups/production-backup-*.sql | head -1)
docker-compose up -d postgres
docker-compose exec -T postgres psql -U directus tenni < "$LATEST_BACKUP"

# Revert to previous Docker image (using git tag)
git checkout <previous-tag>
docker-compose up -d

# Verify rollback
curl -f https://api.tennisportal.com/server/health

echo "✓ Rollback completed"
```

## SECURITY CHECKS

Before deploying, verify:

- [ ] No secrets in code (check with `git grep -i 'password\|secret\|api_key'`)
- [ ] HTTPS enforced on all endpoints
- [ ] CORS configured to specific domain (not wildcard)
- [ ] Database credentials are strong and unique
- [ ] Cal.com webhook secret is validated in Flows
- [ ] Rate limiting is enabled in production

## DEPLOYMENT RECORD

After successful deployment, create a deployment record:

```bash
# Create deployment log
cat > deployments/deployment-$(date +%Y%m%d-%H%M%S).md <<EOF
# Production Deployment - $(date)

## Deployed By
Claude Code Agent (User: <username>)

## Git Commit
$(git log -1 --oneline)

## Changes Deployed
- Frontend: <describe changes>
- Backend: <describe changes>
- Database: <migrations applied>

## Verification
✓ All tests passed
✓ Health checks passed
✓ Manual testing completed

## Backup
Database backup: $BACKUP_FILE

## Rollback Tag
Git tag: $DEPLOY_TAG
EOF
```

## OUTPUT

Display deployment summary:

```
═══════════════════════════════════════
  PRODUCTION DEPLOYMENT COMPLETE
═══════════════════════════════════════

✓ Pre-flight checks passed
✓ Database backed up
✓ Frontend deployed
✓ Backend updated
✓ Health checks passed
✓ Smoke tests passed

Deployment Time: 2025-11-17 16:00:00 UTC
Git Tag: deploy-20251117-160000
Backup: production-backup-20251117-160000.sql

Production URL: https://tennisportal.com
API URL: https://api.tennisportal.com

═══════════════════════════════════════

Next Steps:
1. Monitor application logs for 30 minutes
2. Check error tracking (Sentry, etc.)
3. Notify team of successful deployment
4. Update documentation if needed

Rollback command (if needed):
  /rollback-production deploy-20251117-160000
═══════════════════════════════════════
```

## CRITICAL RULES

1. **NEVER deploy to production without user confirmation**
2. **NEVER skip database backup**
3. **NEVER proceed if tests fail**
4. **ALWAYS verify environment variables**
5. **ALWAYS create git tag for rollback**
6. **STOP immediately on any error**

## Implementation

Execute each step using the Bash tool. Implement error handling that STOPS on first failure. Require explicit user confirmation before proceeding with deployment.
