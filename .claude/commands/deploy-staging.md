---
description: Deploy application to staging environment
---

# Deploy to Staging

Automates deployment of the Tennis Portal to the staging environment with safety checks and rollback capability.

## Pre-Deployment Checks

Before deploying, verify:

1. **Tests Pass**: Run frontend tests
   ```bash
   cd frontend && npm test
   ```

2. **Build Succeeds**: Verify frontend builds without errors
   ```bash
   cd frontend && npm run build
   ```

3. **Lint Passes**: Check code quality
   ```bash
   cd frontend && npm run lint
   ```

4. **Git Status**: Ensure all changes are committed
   ```bash
   git status
   ```

## Deployment Steps

### 1. Frontend Deployment

```bash
# Build frontend for production
cd frontend
npm run build

# Verify dist/ directory created
ls -lh dist/

# TODO: Upload to staging server (S3, Netlify, Vercel, etc.)
# Example for S3:
# aws s3 sync dist/ s3://tenni-staging/ --delete
```

### 2. Backend Deployment

```bash
# Navigate to backend
cd backend

# Create database backup first (safety)
docker-compose exec postgres pg_dump -U directus tenni > backups/pre-deploy-$(date +%Y%m%d-%H%M%S).sql

# Pull latest Directus image
docker-compose pull

# Apply any pending schema migrations
docker-compose exec directus npx directus schema apply ./migrations/latest-snapshot.yaml

# Restart services with new configuration
docker-compose down
docker-compose up -d

# Wait for services to be healthy
sleep 10

# Verify health
curl http://localhost:8055/server/health
```

### 3. Verification Tests

Run smoke tests to verify deployment:

```bash
# Test API health
curl http://localhost:8055/server/health

# Test authentication endpoint
curl -X POST http://localhost:8055/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@tennisportal.com", "password": "test"}'

# Test frontend is accessible
curl -I http://localhost:5173 || echo "Frontend not running locally (expected if deployed)"
```

### 4. Post-Deployment Validation

Check critical functionality:
- [ ] Can login as admin
- [ ] Can view bookings
- [ ] Can access media library
- [ ] Webhook endpoint is accessible (for Cal.com)

## Rollback Procedure

If deployment fails:

```bash
# Restore database from backup
cd backend
docker-compose exec -T postgres psql -U directus tenni < backups/pre-deploy-<timestamp>.sql

# Revert to previous Docker image
docker-compose down
docker-compose up -d <previous-image-tag>

# Clear frontend cache/rebuild
cd frontend
rm -rf dist/
npm run build
```

## Environment-Specific Configuration

Ensure staging environment variables are set correctly:

**Backend (.env)**
```bash
PUBLIC_URL=https://staging-api.tennisportal.com
CORS_ORIGIN=https://staging.tennisportal.com
AUTH_COOKIE_SECURE=true
```

**Frontend (.env)**
```bash
VITE_DIRECTUS_URL=https://staging-api.tennisportal.com
```

## Notification

After deployment, optionally notify team:

```bash
# Example: Send Slack notification
# curl -X POST https://hooks.slack.com/... \
#   -d '{"text": "✓ Tennis Portal deployed to staging"}'

# Or GitHub deployment status
# gh api repos/owner/repo/deployments/... --method POST
```

## Output

Display deployment summary:

```
═══════════════════════════════════════
  STAGING DEPLOYMENT SUMMARY
═══════════════════════════════════════

✓ Pre-deployment checks passed
✓ Frontend built successfully
✓ Database backed up: backups/pre-deploy-20251117-160000.sql
✓ Schema migrations applied
✓ Docker containers restarted
✓ Health checks passed

Deployment completed at: 2025-11-17 16:00:00 UTC
Staging URL: https://staging.tennisportal.com
API URL: https://staging-api.tennisportal.com

═══════════════════════════════════════
```

## Error Handling

- If tests fail: STOP deployment and display errors
- If build fails: STOP and show build errors
- If database backup fails: STOP (critical safety measure)
- If health check fails: Display logs and suggest rollback

## Implementation

Execute each step sequentially using the Bash tool. Stop on first error and provide clear rollback instructions.
