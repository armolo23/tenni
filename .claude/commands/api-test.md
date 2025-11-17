---
description: Test Directus API endpoints with sample requests
---

# API Testing Tool

Test Directus REST API endpoints with authenticated requests to verify collections, permissions, and data flow.

## Arguments

- `$1`: Collection name (e.g., `bookings`, `media_items`, `directus_users`)
- `$2`: HTTP method (GET, POST, PUT, DELETE)
- `$3`: Optional JSON data for POST/PUT requests

## Workflow

### 1. Environment Check

First, verify that:
- Directus is running (check `http://localhost:8055/server/health`)
- `.env` file exists in `backend/` with valid credentials

### 2. Authentication

For testing, you'll need to obtain an access token. Use one of these methods:

**Option A: Admin Token (Temporary Testing)**
```bash
# Login as admin and get token
curl -X POST http://localhost:8055/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@tennisportal.com", "password": "<from .env>"}'
```

**Option B: Use Directus Static Token**
- Generate a static token in Directus Admin UI: Settings > Access Tokens
- Use for automated testing

### 3. Execute Test Request

Based on the HTTP method:

**GET Request**
```bash
curl -X GET "http://localhost:8055/items/$1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**POST Request**
```bash
curl -X POST "http://localhost:8055/items/$1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '$3'
```

**PUT Request**
```bash
curl -X PUT "http://localhost:8055/items/$1/<id>" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '$3'
```

**DELETE Request**
```bash
curl -X DELETE "http://localhost:8055/items/$1/<id>" \
  -H "Authorization: Bearer <token>"
```

### 4. Display Results

Format and display the JSON response with:
- HTTP status code
- Response body (pretty-printed)
- Any errors or warnings

## Common Test Scenarios

### Test 1: List Bookings
```bash
/api-test bookings GET
```

### Test 2: Create Booking (simulate webhook)
```bash
/api-test bookings POST '{"user_id": "uuid-here", "start_time": "2023-10-27T10:00:00Z", "end_time": "2023-10-27T11:00:00Z", "status": "confirmed"}'
```

### Test 3: Get Published Media
```bash
/api-test media_items GET
# With filter: Add ?filter[status][_eq]=published to URL
```

### Test 4: Get Current User
```bash
/api-test users/me GET
```

## Permission Testing

When testing with different roles:

1. Create a test user with "Tennis Player" role in Directus Admin
2. Login as that user to get their token
3. Run the same tests to verify RBAC restrictions

Expected behaviors:
- Tennis Player should only see their own bookings
- Tennis Player cannot see other users
- Tennis Player can only read published media

## Error Handling

- **401 Unauthorized**: Token expired or invalid
- **403 Forbidden**: Permission denied (check RBAC settings)
- **404 Not Found**: Collection or item doesn't exist
- **422 Unprocessable**: Validation error (check required fields)

## Implementation

1. Use the Bash tool to execute curl commands
2. Parse JSON responses with `jq` if available (or display raw)
3. Provide clear error messages and debugging hints
4. Suggest checking Directus logs if unexpected errors occur

## Example Output

```
✓ Directus health check passed
✓ Testing GET /items/bookings

HTTP/1.1 200 OK
Response:
{
  "data": [
    {
      "id": "uuid-123",
      "user_id": "uuid-456",
      "start_time": "2023-10-27T10:00:00Z",
      "status": "confirmed"
    }
  ]
}

✓ Test completed successfully
```
