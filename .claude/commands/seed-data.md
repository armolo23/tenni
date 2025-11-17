---
description: Populate database with sample/test data
---

# Database Seeding Tool

Populate the Tennis Portal database with sample data for development, testing, or demo purposes.

## Arguments

- `$1`: Dataset type (`minimal`, `demo`, or `test`)

## Dataset Types

### 1. Minimal (Core Data Only)

Essential data to make the application functional:

- **Courts**: 3-4 tennis courts with different surfaces
- **Tags**: Content categorization tags (Technique, Strategy, Fitness)
- **Admin User**: Single admin account

**Use Case**: Initial setup, production baseline

### 2. Demo (Full Demo Dataset)

Complete dataset for demonstration purposes:

- **Courts**: 6 courts (2 clay, 2 grass, 2 hard)
- **Users**: 10 demo users (8 players, 2 coaches)
- **Bookings**: 20 sample bookings (past and future)
- **Media Items**: 15 training videos with proper tagging
- **Tags**: 20+ tags across all categories

**Use Case**: Client demos, presentations, documentation screenshots

### 3. Test (Testing Fixtures)

Controlled dataset for automated testing:

- **Courts**: 3 courts with predictable IDs
- **Users**: Test users with known credentials
- **Bookings**: Edge cases (overlapping times, cancellations, etc.)
- **Media Items**: Minimal set for permission testing
- **Tags**: Specific tags for filter testing

**Use Case**: Automated tests, CI/CD pipelines

## Implementation

### Seeding via Directus API

Use Directus REST API to insert data:

```javascript
// Pseudo-code structure
const seedMinimal = async () => {
  // Create courts
  await createCourts([
    { name: "Center Court", surface: "Hard" },
    { name: "Court 1", surface: "Clay" },
    { name: "Court 2", surface: "Grass" }
  ]);

  // Create tags
  await createTags([
    { name: "Serve", category: "Technique" },
    { name: "Volley", category: "Technique" },
    { name: "Footwork", category: "Fitness" }
  ]);

  // Create admin
  await createUser({
    email: "admin@tennisportal.com",
    password: "admin123",
    role: "Administrator"
  });
};
```

### Seeding via SQL Script

Alternatively, use direct SQL inserts for performance:

```sql
-- Insert courts
INSERT INTO courts (name, surface, status) VALUES
  ('Center Court', 'Hard', 'active'),
  ('Court 1', 'Clay', 'active'),
  ('Court 2', 'Grass', 'active');

-- Insert tags
INSERT INTO tags (name, slug, category) VALUES
  ('Serve', 'serve', 'Technique'),
  ('Volley', 'volley', 'Technique'),
  ('Footwork', 'footwork', 'Fitness');
```

## Workflow

### 1. Safety Check

Before seeding, verify this is not production:

```bash
# Check PUBLIC_URL in .env
if grep -q "tennisportal.com" backend/.env && ! grep -q "staging\|dev\|local" backend/.env; then
  echo "ERROR: Refusing to seed production database!"
  exit 1
fi

# Ask for confirmation
read -p "This will insert sample data. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  exit 0
fi
```

### 2. Execute Seeding

Based on dataset type:

```bash
case "$1" in
  minimal)
    echo "Seeding minimal dataset..."
    # Execute minimal seed script
    ;;
  demo)
    echo "Seeding demo dataset..."
    # Execute demo seed script
    ;;
  test)
    echo "Seeding test dataset..."
    # Execute test seed script
    ;;
  *)
    echo "Usage: /seed-data [minimal|demo|test]"
    exit 1
    ;;
esac
```

### 3. Create Seed Scripts

Store seed scripts in `backend/seeds/`:

```
backend/seeds/
├── minimal.sql
├── demo.sql
├── test.sql
└── README.md
```

Execute via:

```bash
docker-compose exec -T postgres psql -U directus -d tenni < backend/seeds/$1.sql
```

### 4. Verify Seeding

After seeding, verify data was inserted:

```bash
# Count records in each collection
docker-compose exec postgres psql -U directus -d tenni -c "
  SELECT
    (SELECT COUNT(*) FROM courts) as courts_count,
    (SELECT COUNT(*) FROM directus_users) as users_count,
    (SELECT COUNT(*) FROM bookings) as bookings_count,
    (SELECT COUNT(*) FROM media_items) as media_count,
    (SELECT COUNT(*) FROM tags) as tags_count;
"
```

## Sample Data Specifications

### Minimal Dataset

**Courts** (3):
```json
[
  { "id": 1, "name": "Center Court", "surface": "Hard" },
  { "id": 2, "name": "Court 1", "surface": "Clay" },
  { "id": 3, "name": "Court 2", "surface": "Grass" }
]
```

**Tags** (6):
```json
[
  { "name": "Serve", "category": "Technique" },
  { "name": "Forehand", "category": "Technique" },
  { "name": "Backhand", "category": "Technique" },
  { "name": "Volley", "category": "Technique" },
  { "name": "Footwork", "category": "Fitness" },
  { "name": "Mental Game", "category": "Mental" }
]
```

**Admin User** (1):
```json
{
  "email": "admin@tennisportal.com",
  "password": "admin123",
  "first_name": "Admin",
  "last_name": "User",
  "role": "Administrator"
}
```

### Demo Dataset

Add to minimal:

**Users** (10):
- 2 Coaches (John, Sarah)
- 8 Players (varying skill levels)

**Bookings** (20):
- 10 past bookings (completed)
- 5 upcoming bookings (confirmed)
- 3 future bookings (pending)
- 2 cancelled bookings

**Media Items** (15):
- 5 Beginner videos
- 5 Intermediate videos
- 5 Advanced videos
- Properly tagged with M2M relationships

### Test Dataset

Add to minimal:

**Test Users** (5):
- test-player@example.com (Tennis Player role)
- test-coach@example.com (Coach role)
- test-admin@example.com (Administrator)

**Edge Case Bookings**:
- Overlapping time slots (to test collision detection)
- Bookings at midnight (timezone testing)
- Cancelled with refund status
- Rescheduled bookings

## Idempotency

Make seeding idempotent (can run multiple times):

```sql
-- Use INSERT ... ON CONFLICT for PostgreSQL
INSERT INTO courts (id, name, surface)
VALUES (1, 'Center Court', 'Hard')
ON CONFLICT (id) DO NOTHING;

-- Or use UPSERT logic
INSERT INTO tags (name, slug, category)
VALUES ('Serve', 'serve', 'Technique')
ON CONFLICT (slug) DO UPDATE SET category = EXCLUDED.category;
```

## Clean Before Seed (Optional)

Optionally clear existing data first:

```bash
# WARNING: This deletes all data
docker-compose exec postgres psql -U directus -d tenni -c "
  TRUNCATE bookings CASCADE;
  TRUNCATE courts CASCADE;
  TRUNCATE media_items CASCADE;
  TRUNCATE tags CASCADE;
  DELETE FROM directus_users WHERE email != 'admin@tennisportal.com';
"
```

## Example Usage

```bash
# Seed minimal data
/seed-data minimal

# Seed full demo
/seed-data demo

# Seed test fixtures
/seed-data test
```

## Output

```
═══════════════════════════════════════
  DATABASE SEEDING COMPLETE
═══════════════════════════════════════

Dataset: Demo
Environment: Development

Data Created:
✓ Courts: 6
✓ Users: 10 (8 players, 2 coaches)
✓ Bookings: 20
✓ Media Items: 15
✓ Tags: 22

Sample Credentials:
- Admin: admin@tennisportal.com / admin123
- Player: john.doe@example.com / player123
- Coach: coach.sarah@example.com / coach123

═══════════════════════════════════════

You can now:
1. Login to Directus: http://localhost:8055
2. Test the React app: http://localhost:5173
3. View sample bookings in the calendar
4. Browse the media library

═══════════════════════════════════════
```

## Error Handling

- If production environment detected: STOP and refuse to seed
- If database connection fails: Display error and suggest checking Docker
- If foreign key constraints fail: Display specific constraint error
- If seeding partially fails: Display which records succeeded/failed

## Implementation

1. Create SQL seed files in `backend/seeds/`
2. Use Bash tool to execute appropriate SQL file based on dataset type
3. Verify data insertion with count queries
4. Provide summary of what was created

## Security Notes

- **NEVER** seed production databases
- Use weak passwords only for development
- Document all test credentials
- Add warning comments to seed files
