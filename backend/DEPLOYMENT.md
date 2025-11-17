# Backend Deployment Guide

## Prerequisites

Before you begin, ensure you have installed on your local machine:

- **Docker Desktop** (includes docker-compose)
  - Mac: https://docs.docker.com/desktop/install/mac-install/
  - Windows: https://docs.docker.com/desktop/install/windows-install/
  - Linux: https://docs.docker.com/desktop/install/linux-install/

## Step-by-Step Deployment

### 1. Verify Docker Installation

Open your terminal and run:

```bash
docker --version
docker-compose --version
```

You should see version numbers (e.g., Docker version 24.0.0).

---

### 2. Clone Repository (if not already done)

```bash
git clone <your-repo-url>
cd tenni/backend
```

---

### 3. Verify Environment Configuration

The `.env` file has been configured with secure values:

```bash
cat .env
```

**Important Credentials** (already set):
- Admin Email: `admin@tennisportal.com`
- Admin Password: `TennisAdmin2025!Secure`
- Database: `tenni`
- Database User: `directus`

⚠️ **For production**, change these values to unique, secure credentials.

---

### 4. Start Docker Containers

From the `backend/` directory, run:

```bash
docker-compose up -d
```

**Expected output**:
```
Creating network "backend_tenni-network" ... done
Creating tenni-postgres ... done
Creating tenni-directus ... done
```

**Wait 30-60 seconds** for services to initialize.

---

### 5. Verify Containers Are Running

```bash
docker-compose ps
```

**Expected output**:
```
NAME                COMMAND                  STATUS              PORTS
tenni-directus      "docker-entrypoint.s…"   Up 30 seconds       0.0.0.0:8055->8055/tcp
tenni-postgres      "docker-entrypoint.s…"   Up 31 seconds       5432/tcp
```

Both containers should show `Up` status.

---

### 6. Check Logs (if issues occur)

```bash
# Directus logs
docker-compose logs -f directus

# PostgreSQL logs
docker-compose logs -f postgres
```

Press `Ctrl+C` to exit logs.

---

### 7. Access Directus Admin UI

Open your browser and navigate to:

```
http://localhost:8055
```

**Login with**:
- Email: `admin@tennisportal.com`
- Password: `TennisAdmin2025!Secure`

You should see the Directus Admin Dashboard.

---

### 8. Verify Database Connection

In Directus Admin UI:
1. Click **Settings** (⚙️) in the sidebar
2. Click **Data Model**
3. You should see system collections (directus_users, directus_files, etc.)

✅ **Success!** Your backend is running.

---

## Next Steps

After successful deployment, proceed to:

1. **Extend directus_users schema** (Task 1.2)
2. **Create custom collections** (Task 1.3)
3. **Configure RBAC roles** (Task 1.4)

See the Implementation Roadmap for detailed steps.

---

## Common Issues & Solutions

### Issue: Port 8055 already in use

**Solution**:
```bash
# Stop other processes using port 8055
lsof -ti:8055 | xargs kill -9

# Or change port in docker-compose.yml
ports:
  - "8056:8055"  # Use 8056 instead
```

---

### Issue: Database connection failed

**Symptoms**: Directus logs show `Database connection failed`

**Solutions**:

1. **Verify PostgreSQL is running**:
   ```bash
   docker-compose ps postgres
   ```

2. **Check database credentials in .env**:
   ```bash
   grep DB_ .env
   ```

3. **Restart containers**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

4. **Check PostgreSQL logs**:
   ```bash
   docker-compose logs postgres
   ```

---

### Issue: Containers keep restarting

**Solution**:

1. **Check logs for errors**:
   ```bash
   docker-compose logs --tail=50
   ```

2. **Verify .env file has no syntax errors**:
   ```bash
   cat .env | grep -v '^#' | grep -v '^$'
   ```

3. **Rebuild containers**:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

---

### Issue: Cannot login to Directus

**Symptoms**: "Invalid credentials" error

**Solution**:

1. **Reset admin user via CLI**:
   ```bash
   docker-compose exec directus npx directus users create \
     --email admin@tennisportal.com \
     --password NewPassword123! \
     --role administrator
   ```

2. **Verify admin account exists**:
   ```bash
   docker-compose exec postgres psql -U directus -d tenni \
     -c "SELECT email, status FROM directus_users WHERE email = 'admin@tennisportal.com';"
   ```

---

## Stopping the Backend

To stop the services (without removing data):

```bash
docker-compose stop
```

To restart:

```bash
docker-compose start
```

---

## Removing Everything (Clean Slate)

⚠️ **Warning**: This deletes all data including the database!

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (database data)
docker-compose down -v

# Remove postgres_data folder
rm -rf postgres_data

# Start fresh
docker-compose up -d
```

---

## Health Check Commands

```bash
# Server health (via API)
curl http://localhost:8055/server/health

# Database health
docker-compose exec postgres pg_isready -U directus

# Directus version
curl http://localhost:8055/server/info | jq .project
```

---

## Environment Variables Reference

| Variable | Value | Purpose |
|----------|-------|---------|
| `DB_DATABASE` | `tenni` | PostgreSQL database name |
| `DB_USER` | `directus` | PostgreSQL username |
| `DB_PASSWORD` | `TennisPortal2025!SecureDB` | PostgreSQL password |
| `SECRET` | `<generated>` | JWT signing secret |
| `KEY` | `<generated>` | Encryption key |
| `ADMIN_EMAIL` | `admin@tennisportal.com` | Admin login email |
| `ADMIN_PASSWORD` | `TennisAdmin2025!Secure` | Admin login password |
| `PUBLIC_URL` | `http://localhost:8055` | API base URL |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend URL |

---

## Production Deployment Notes

For production deployment:

1. **Change all default passwords** in `.env`
2. **Set `AUTH_COOKIE_SECURE=true`**
3. **Use a proper SMTP server** (not sendmail)
4. **Enable SSL/TLS** (use nginx reverse proxy)
5. **Set up automated backups** (see `/db-backup` command)
6. **Configure firewall** (only expose necessary ports)
7. **Use environment-specific .env files** (production.env, staging.env)

---

## Backup & Restore

### Create Backup

```bash
# Using our slash command (from project root)
/db-backup

# Or manually
docker-compose exec postgres pg_dump -U directus tenni > backup-$(date +%Y%m%d).sql
```

### Restore Backup

```bash
# Stop Directus (prevent conflicts)
docker-compose stop directus

# Restore database
cat backup-20251117.sql | docker-compose exec -T postgres psql -U directus -d tenni

# Restart Directus
docker-compose start directus
```

---

## Support & Troubleshooting

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify environment variables: `cat .env`
3. Check Docker status: `docker-compose ps`
4. Review Directus docs: https://docs.directus.io
5. Check database connection: `docker-compose exec postgres pg_isready`

---

**Deployment Guide Version**: 1.0
**Last Updated**: 2025-11-17
**Maintained By**: Tennis Portal Team
