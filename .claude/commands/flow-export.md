---
description: Export Directus Flow configurations as JSON
---

# Export Directus Flows

Export Directus Flow configurations as JSON files for version control and deployment automation.

## Arguments

- `$1`: Flow name (optional - if not provided, lists available flows)

## Workflow

### 1. List Available Flows

If no flow name is provided, list all flows configured in Directus:

```bash
# Query Directus API for flows
curl -X GET "http://localhost:8055/flows" \
  -H "Authorization: Bearer <admin-token>" | jq '.data[] | {id, name, status}'
```

Display flow names to the user and prompt for selection.

### 2. Export Specific Flow

When a flow name is provided:

```bash
# Get flow by name/id
FLOW_ID=$(curl -X GET "http://localhost:8055/flows?filter[name][_eq]=$1" \
  -H "Authorization: Bearer <admin-token>" | jq -r '.data[0].id')

# Export flow with all operations
curl -X GET "http://localhost:8055/flows/$FLOW_ID?fields=*,operations.*" \
  -H "Authorization: Bearer <admin-token>" | jq '.' > backend/flows/$1.json
```

### 3. Verify Export

- Check that the JSON file was created in `backend/flows/`
- Validate JSON structure
- Display file size and location

### 4. Format Output

Pretty-print the JSON with proper indentation for version control:

```bash
# Format JSON
jq '.' backend/flows/$1.json > backend/flows/$1.formatted.json
mv backend/flows/$1.formatted.json backend/flows/$1.json
```

## Alternative: Manual Export via UI

If API export is complex, provide instructions for manual export:

```
To export a Flow manually:

1. Access Directus Admin UI: http://localhost:8055
2. Navigate to: Settings > Flows
3. Click on the flow you want to export
4. Click the "..." menu > Export
5. Save the JSON file to: backend/flows/<flow-name>.json

Exported file should be committed to git for version control.
```

## Flow Import (Reverse Operation)

Document how to import a flow (for deployment):

```bash
# Import flow from JSON
curl -X POST "http://localhost:8055/flows" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d @backend/flows/$1.json
```

## Common Flows to Export

The Tennis Portal uses these critical flows:

1. **sync-booking**: Cal.com webhook handler
2. **send-confirmation**: Email confirmation after booking
3. **update-user-stats**: User progress tracking (if implemented)

## Example Usage

```bash
# List all flows
/flow-export

# Export specific flow
/flow-export sync-booking
# Output: Exported to backend/flows/sync-booking.json

# Export all critical flows
/flow-export sync-booking
/flow-export send-confirmation
```

## Version Control Best Practices

After exporting:

1. Review the JSON for sensitive data (remove secrets if any)
2. Commit to git with descriptive message:
   ```bash
   git add backend/flows/
   git commit -m "Export Directus Flow: <flow-name>"
   ```
3. Document any environment-specific variables that need to be updated during import

## Security Notes

- Exported flows may contain webhook URLs or API endpoints
- Do NOT export flows with hardcoded secrets (use environment variables in Directus)
- Review each export before committing to public repositories

## Output

```
═══════════════════════════════════════
  FLOW EXPORT COMPLETE
═══════════════════════════════════════

Flow Name: sync-booking
Exported To: backend/flows/sync-booking.json
File Size: 2.3 KB
Operations: 6

✓ JSON validated
✓ Ready for version control

Next Steps:
1. Review the exported JSON
2. Commit to git: git add backend/flows/sync-booking.json
3. Document any environment variables needed for import

═══════════════════════════════════════
```

## Implementation

Use the Bash tool to execute curl commands against the Directus API. Handle authentication by either:
1. Using a static admin token (generate in Directus UI)
2. Logging in first to get a temporary token
3. Using the Directus CLI if available

Provide clear error messages if the flow doesn't exist or API is unavailable.
