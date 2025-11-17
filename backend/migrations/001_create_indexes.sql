-- ============================================================================
-- Tennis Portal - Database Index Migration
-- Version: 001
-- Created: 2025-11-17
-- Purpose: Create performance indexes for collections after schema creation
-- ============================================================================

-- Run this migration AFTER creating all collections in Directus Admin UI
-- Command: docker-compose exec postgres psql -U directus -d tenni -f /directus/migrations/001_create_indexes.sql

-- ============================================================================
-- M2M Junction Table Indexes (media_items_tags)
-- Purpose: Optimize deep filtering queries for media recommendations
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_media_items_tags_media_item_id
  ON media_items_tags(media_item_id);

CREATE INDEX IF NOT EXISTS idx_media_items_tags_tags_id
  ON media_items_tags(tags_id);

-- Composite index for bi-directional M2M queries
CREATE INDEX IF NOT EXISTS idx_media_items_tags_composite
  ON media_items_tags(media_item_id, tags_id);

COMMENT ON INDEX idx_media_items_tags_media_item_id IS 'Optimize queries filtering by media item';
COMMENT ON INDEX idx_media_items_tags_tags_id IS 'Optimize queries filtering by tag';
COMMENT ON INDEX idx_media_items_tags_composite IS 'Optimize bi-directional M2M lookups';

-- ============================================================================
-- Bookings Table Indexes
-- Purpose: Optimize calendar queries and user booking history
-- ============================================================================

-- User-based queries (e.g., "Show my bookings")
CREATE INDEX IF NOT EXISTS idx_bookings_user_id
  ON bookings(user_id);

-- Date range queries (e.g., "Bookings this month")
CREATE INDEX IF NOT EXISTS idx_bookings_start_time
  ON bookings(start_time);

CREATE INDEX IF NOT EXISTS idx_bookings_end_time
  ON bookings(end_time);

-- Composite index for user + date range queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_bookings_user_time
  ON bookings(user_id, start_time, end_time);

-- Status filtering (e.g., "Show only confirmed bookings")
CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON bookings(status);

-- Payment status filtering
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
  ON bookings(payment_status);

-- UNIQUE index on cal_uid for webhook deduplication (CRITICAL!)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_cal_uid
  ON bookings(cal_uid);

COMMENT ON INDEX idx_bookings_user_id IS 'Optimize user booking history queries';
COMMENT ON INDEX idx_bookings_start_time IS 'Optimize date range filtering';
COMMENT ON INDEX idx_bookings_user_time IS 'Optimize calendar queries (user + date range)';
COMMENT ON INDEX idx_bookings_cal_uid IS 'Ensure webhook deduplication and fast Cal.com lookup';

-- ============================================================================
-- Media Items Table Indexes
-- Purpose: Optimize recommendation engine queries
-- ============================================================================

-- Difficulty level filtering (e.g., "Beginner videos")
CREATE INDEX IF NOT EXISTS idx_media_items_difficulty_level
  ON media_items(difficulty_level);

-- Status filtering (e.g., "Published only")
CREATE INDEX IF NOT EXISTS idx_media_items_status
  ON media_items(status);

-- Composite index for recommendation queries (difficulty + status)
CREATE INDEX IF NOT EXISTS idx_media_items_difficulty_status
  ON media_items(difficulty_level, status);

-- Published date ordering (e.g., "Latest videos")
CREATE INDEX IF NOT EXISTS idx_media_items_published_date
  ON media_items(published_date) WHERE status = 'published';

COMMENT ON INDEX idx_media_items_difficulty_status IS 'Optimize recommendation engine queries';
COMMENT ON INDEX idx_media_items_published_date IS 'Partial index for latest published content';

-- ============================================================================
-- Tags Table Indexes
-- Purpose: Optimize tag filtering and search
-- ============================================================================

-- Slug for URL-safe tag lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_slug
  ON tags(slug);

-- Category filtering (e.g., "Show only Technique tags")
CREATE INDEX IF NOT EXISTS idx_tags_category
  ON tags(category);

-- Name search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_tags_name_lower
  ON tags(LOWER(name));

COMMENT ON INDEX idx_tags_slug IS 'Unique slug for URL routing';
COMMENT ON INDEX idx_tags_name_lower IS 'Case-insensitive tag name search';

-- ============================================================================
-- Courts Table Indexes
-- Purpose: Optimize court availability and filtering
-- ============================================================================

-- Surface filtering (e.g., "Show only Clay courts")
CREATE INDEX IF NOT EXISTS idx_courts_surface
  ON courts(surface);

-- Status filtering (e.g., "Show only active courts")
CREATE INDEX IF NOT EXISTS idx_courts_status
  ON courts(status);

-- Cal.com resource ID lookup
CREATE INDEX IF NOT EXISTS idx_courts_cal_resource_id
  ON courts(cal_resource_id)
  WHERE cal_resource_id IS NOT NULL;

COMMENT ON INDEX idx_courts_surface IS 'Filter courts by surface type';
COMMENT ON INDEX idx_courts_status IS 'Filter active courts';
COMMENT ON INDEX idx_courts_cal_resource_id IS 'Map to Cal.com resources';

-- ============================================================================
-- Directus Users Extensions Indexes
-- Purpose: Optimize user filtering by tennis-specific attributes
-- ============================================================================

-- Skill level filtering (for admin reporting)
CREATE INDEX IF NOT EXISTS idx_directus_users_skill_level
  ON directus_users(skill_level);

-- Membership tier filtering (for admin/reporting)
CREATE INDEX IF NOT EXISTS idx_directus_users_membership_tier
  ON directus_users(membership_tier);

-- Stripe customer ID lookup (for payment reconciliation)
CREATE INDEX IF NOT EXISTS idx_directus_users_stripe_customer_id
  ON directus_users(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON INDEX idx_directus_users_skill_level IS 'Filter users by skill level';
COMMENT ON INDEX idx_directus_users_membership_tier IS 'Filter users by membership tier';
COMMENT ON INDEX idx_directus_users_stripe_customer_id IS 'Stripe payment reconciliation';

-- ============================================================================
-- Optional: user_progress Table Indexes (Phase 3/4)
-- Purpose: Track video watching progress
-- Note: Run this section only after creating user_progress collection
-- ============================================================================

-- Uncomment when user_progress collection is created:

/*
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id
  ON user_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_user_progress_media_item_id
  ON user_progress(media_item_id);

-- Partial index for completed videos only
CREATE INDEX IF NOT EXISTS idx_user_progress_completed
  ON user_progress(completed_at)
  WHERE completed_at IS NOT NULL;

-- Last watched ordering
CREATE INDEX IF NOT EXISTS idx_user_progress_last_watched
  ON user_progress(user_id, last_watched_at DESC);

COMMENT ON INDEX idx_user_progress_completed IS 'Optimize completed videos queries';
COMMENT ON INDEX idx_user_progress_last_watched IS 'Continue watching feature';
*/

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Run these queries after migration to verify indexes were created:

-- List all custom indexes
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;

-- Check index sizes
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
--   AND indexrelname LIKE 'idx_%'
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- Performance Notes
-- ============================================================================

-- Target Query Performance:
-- - Calendar queries (user + date range): < 50ms
-- - Recommendation engine (M2M deep filter): < 100ms
-- - Webhook lookup (cal_uid): < 10ms (unique index)
-- - Media search by tags: < 100ms

-- Maintenance:
-- - Rebuild indexes monthly: REINDEX TABLE bookings;
-- - Analyze statistics weekly: ANALYZE bookings;
-- - Monitor slow queries: pg_stat_statements extension

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '✅ Index migration complete!';
  RAISE NOTICE 'Run verification queries to confirm index creation.';
END $$;
