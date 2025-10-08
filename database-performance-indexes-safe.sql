-- Database Performance Indexes for Activity Functionality (SAFE VERSION)
-- These indexes will dramatically improve query performance for usage logs and activity calculations
-- 
-- IMPORTANT: Run each CREATE INDEX command individually, not as a transaction block
-- Each command should be executed separately in your database client

-- ==============================================
-- USAGE LOGS TABLE INDEXES
-- ==============================================

-- Primary activity index: user_id + created_at (most important)
-- This will speed up user activity lookups and date range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_logs_user_activity 
ON usage_logs(user_id, created_at DESC);

-- Simple recent activity index: No WHERE clause to avoid IMMUTABLE issues
-- This will be fast for recent activity queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_logs_created_at 
ON usage_logs(created_at DESC);

-- Token aggregation index: For calculating total tokens per user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_logs_user_tokens 
ON usage_logs(user_id, total_tokens DESC);

-- Cost calculation index: For estimated cost aggregations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_logs_user_cost 
ON usage_logs(user_id, estimated_cost DESC);

-- ==============================================
-- CREDIT PURCHASES TABLE INDEXES
-- ==============================================

-- Payment status lookup index: user_id + status
-- This will speed up payment status checks for activity levels
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_purchases_user_status 
ON credit_purchases(user_id, status);

-- Payment date index: For payment history queries
-- Simple index without WHERE clause to avoid IMMUTABLE issues
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_purchases_completed_at 
ON credit_purchases(completed_at DESC);

-- ==============================================
-- INVITE CODES TABLE INDEXES (if needed)
-- ==============================================

-- Invite code lookup index: For faster code searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invite_codes_code 
ON invite_codes(code);

-- Invite code user index: For user-specific code lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invite_codes_used_by 
ON invite_codes(used_by);

-- Invite code usage status index: For filtering by usage status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invite_codes_is_used 
ON invite_codes(is_used);

-- Invite code creation date index: For date-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invite_codes_created_at 
ON invite_codes(created_at DESC);

-- ==============================================
-- PERFORMANCE MONITORING QUERIES
-- ==============================================

-- Query to check index usage statistics
-- Run this after creating indexes to verify they're being used
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
WHERE tablename IN ('usage_logs', 'credit_purchases', 'invite_codes')
ORDER BY idx_tup_read DESC;

-- Query to check index sizes
-- Monitor disk usage of indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE tablename IN ('usage_logs', 'credit_purchases', 'invite_codes')
ORDER BY pg_relation_size(indexrelid) DESC;

-- Query to analyze query performance
-- Use this to see which queries are slow and need optimization
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%usage_logs%' OR query LIKE '%credit_purchases%'
ORDER BY mean_time DESC
LIMIT 10;

-- ==============================================
-- INDEX MAINTENANCE
-- ==============================================

-- Update table statistics after creating indexes
-- This helps the query planner make better decisions
ANALYZE usage_logs;
ANALYZE credit_purchases;
ANALYZE invite_codes;

-- ==============================================
-- NOTES
-- ==============================================

-- CONCURRENTLY: Creates indexes without locking tables (safe for production)
-- IF NOT EXISTS: Prevents errors if indexes already exist
-- No WHERE clauses: Avoids IMMUTABLE function issues
-- Composite indexes: Order matters - most selective column first

-- Expected Performance Improvements:
-- - User activity queries: 10-100x faster
-- - Payment status lookups: 5-20x faster
-- - Recent activity queries: 50-200x faster
-- - Token aggregations: 10-50x faster

-- Monitoring:
-- - Check index usage with pg_stat_user_indexes
-- - Monitor query performance with pg_stat_statements
-- - Watch disk usage with pg_size_pretty
