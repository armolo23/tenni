---
description: Create PostgreSQL database backup
---

# Database Backup Tool

Create timestamped PostgreSQL database backups for the Tennis Portal.

## Backup Strategy

### Types of Backups

1. **Full Backup**: Complete database dump (default)
2. **Schema Only**: Structure without data
3. **Data Only**: Data without structure

## Workflow

### 1. Pre-Backup Checks

Verify environment:

```bash
# Check Docker containers are running
docker-compose ps

# Verify postgres container is healthy
docker-compose exec postgres pg_isready -U directus
```

### 2. Create Backup Directory

```bash
# Ensure backups directory exists
mkdir -p backend/backups

# Check available disk space
df -h backend/backups
```

### 3. Execute Backup

Create timestamped backup with compression:

```bash
cd backend

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="backups/tenni-backup-$TIMESTAMP.sql"

# Full database dump
docker-compose exec -T postgres pg_dump \
  -U directus \
  -d tenni \
  --verbose \
  --no-owner \
  --no-acl \
  > "$BACKUP_FILE"

# Compress backup to save space
gzip "$BACKUP_FILE"

# Verify backup created
ls -lh "backups/tenni-backup-$TIMESTAMP.sql.gz"
```

### 4. Verify Backup Integrity

Test that the backup is valid:

```bash
# Check file is not empty
if [ ! -s "$BACKUP_FILE.gz" ]; then
  echo "ERROR: Backup file is empty!"
  exit 1
fi

# Verify gzip integrity
gunzip -t "$BACKUP_FILE.gz"

# Check SQL syntax (optional)
# gunzip -c "$BACKUP_FILE.gz" | head -n 50
```

## Backup Types

### Full Backup (Default)

```bash
docker-compose exec -T postgres pg_dump -U directus tenni > backup-full.sql
```

### Schema Only

```bash
docker-compose exec -T postgres pg_dump \
  -U directus \
  -d tenni \
  --schema-only \
  > backup-schema-only.sql
```

### Data Only

```bash
docker-compose exec -T postgres pg_dump \
  -U directus \
  -d tenni \
  --data-only \
  > backup-data-only.sql
```

### Specific Tables

```bash
# Backup only bookings table
docker-compose exec -T postgres pg_dump \
  -U directus \
  -d tenni \
  -t bookings \
  > backup-bookings-only.sql
```

## Restore Procedure

Document how to restore from backup:

```bash
cd backend

# Stop Directus (to prevent conflicts)
docker-compose stop directus

# Drop and recreate database (DANGEROUS)
docker-compose exec postgres psql -U directus -c "DROP DATABASE IF EXISTS tenni;"
docker-compose exec postgres psql -U directus -c "CREATE DATABASE tenni;"

# Restore from backup
gunzip -c backups/tenni-backup-TIMESTAMP.sql.gz | \
  docker-compose exec -T postgres psql -U directus -d tenni

# Restart Directus
docker-compose start directus

# Verify restoration
docker-compose exec directus npx directus database migrate:latest
```

## Automated Backup Schedule

Suggest setting up automated backups via cron:

```bash
# Add to crontab (daily backup at 2 AM)
0 2 * * * cd /path/to/tenni/backend && docker-compose exec -T postgres pg_dump -U directus tenni | gzip > backups/auto-backup-$(date +\%Y\%m\%d).sql.gz
```

## Backup Retention Policy

Suggest retention strategy:

- **Daily backups**: Keep for 7 days
- **Weekly backups**: Keep for 4 weeks
- **Monthly backups**: Keep for 12 months

```bash
# Cleanup old backups (keep last 7 days)
find backend/backups -name "tenni-backup-*.sql.gz" -mtime +7 -delete
```

## Remote Backup Storage

Recommend uploading backups to remote storage:

```bash
# AWS S3 example
aws s3 cp "$BACKUP_FILE.gz" s3://tenni-backups/$(date +%Y/%m)/

# Google Cloud Storage
gsutil cp "$BACKUP_FILE.gz" gs://tenni-backups/

# SCP to remote server
scp "$BACKUP_FILE.gz" user@backup-server:/backups/tenni/
```

## Security Considerations

- **Encryption**: Consider encrypting backups before uploading:
  ```bash
  gpg --encrypt --recipient admin@tennisportal.com backup.sql.gz
  ```
- **Access Control**: Restrict backup file permissions
  ```bash
  chmod 600 backup.sql.gz
  ```
- **Testing**: Regularly test restoration to verify backups are valid

## Example Usage

```bash
/db-backup
# Creates: backend/backups/tenni-backup-20251117-160000.sql.gz
```

## Output

```
═══════════════════════════════════════
  DATABASE BACKUP COMPLETE
═══════════════════════════════════════

Database: tenni
Backup File: backend/backups/tenni-backup-20251117-160000.sql.gz
File Size: 2.4 MB (compressed)
Timestamp: 2025-11-17 16:00:00 UTC

✓ Backup created successfully
✓ Integrity verified
✓ Compression: 87% reduction

Restore Command:
  gunzip -c backend/backups/tenni-backup-20251117-160000.sql.gz | \\
    docker-compose exec -T postgres psql -U directus -d tenni

═══════════════════════════════════════

Recommendations:
- Upload to remote storage for disaster recovery
- Test restoration periodically
- Set up automated daily backups
═══════════════════════════════════════
```

## Error Handling

- If postgres container not running: "ERROR: PostgreSQL container not running. Start with 'docker-compose up -d'"
- If disk space low: "WARNING: Low disk space. Backup may fail."
- If backup fails: Display error and suggest checking Docker logs

## Implementation

Use the Bash tool to execute Docker commands. Create compressed, timestamped backups. Verify integrity and provide clear success/error messages.
