---
description: Create or apply Directus schema snapshots
---

# Schema Migration Tool

You are tasked with managing Directus database schema migrations using schema snapshots.

## Arguments

- `$1`: Action (`create` or `apply`)
- `$2`: Snapshot filename (required for `apply`, optional for `create`)

## Actions

### Create Snapshot

When the user runs `/schema-migrate create`:

1. Generate a timestamp-based filename: `schema-snapshot-YYYY-MM-DD-HHMMSS.yaml`
2. Execute the command to create the snapshot:
   ```bash
   docker-compose exec directus npx directus schema snapshot ./migrations/<filename>
   ```
3. Verify the file was created
4. Display success message with the filename

### Apply Snapshot

When the user runs `/schema-migrate apply <filename>`:

1. Verify the snapshot file exists in `backend/migrations/`
2. Execute the command to apply the snapshot:
   ```bash
   docker-compose exec directus npx directus schema apply ./migrations/<filename>
   ```
3. Verify success and display confirmation

## Safety Checks

- For `apply`: Always warn the user that this will modify the database
- Check that Docker containers are running
- Validate file paths

## Example Usage

```bash
/schema-migrate create
# Output: Created schema-snapshot-2025-11-17-160000.yaml

/schema-migrate apply schema-snapshot-2025-11-17-160000.yaml
# Output: Applied schema successfully
```

## Error Handling

- If Docker is not running: "Error: Docker containers not running. Run 'docker-compose up -d' first"
- If file not found for apply: "Error: Snapshot file not found in backend/migrations/"
- If snapshot fails: Display the error and suggest checking Directus logs

## Implementation

Execute the appropriate action based on the first argument. Use the Bash tool to run Docker commands from the `backend/` directory.
