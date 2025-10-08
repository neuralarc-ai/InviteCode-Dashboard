# How to Apply Database Indexes (Fixed Version)

## 🚨 **Important: CONCURRENTLY Limitation**

PostgreSQL's `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block. You need to run each command **individually**.

## 📋 **Step-by-Step Instructions**

### **Method 1: Individual Commands (Recommended)**

Run each command one by one in your database client:

```sql
-- 1. Primary activity index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_logs_user_activity 
ON usage_logs(user_id, created_at DESC);

-- 2. Recent activity index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_logs_recent_activity 
ON usage_logs(created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

-- 3. Token aggregation index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_logs_user_tokens 
ON usage_logs(user_id, total_tokens DESC);

-- 4. Cost calculation index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_logs_user_cost 
ON usage_logs(user_id, estimated_cost DESC);

-- 5. Payment status index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_purchases_user_status 
ON credit_purchases(user_id, status);

-- 6. Payment date index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_purchases_payment_date 
ON credit_purchases(completed_at DESC) 
WHERE completed_at IS NOT NULL;

-- 7. Invite code lookup index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invite_codes_code 
ON invite_codes(code);

-- 8. Invite code user index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invite_codes_user 
ON invite_codes(user_id);
```

### **Method 2: Non-Concurrent Version (Faster but with Locking)**

If you can afford brief table locks, use this version:

```sql
-- Run all at once (will lock tables briefly)
BEGIN;

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_activity 
ON usage_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_logs_recent_activity 
ON usage_logs(created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_tokens 
ON usage_logs(user_id, total_tokens DESC);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_cost 
ON usage_logs(user_id, estimated_cost DESC);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_status 
ON credit_purchases(user_id, status);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_payment_date 
ON credit_purchases(completed_at DESC) 
WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invite_codes_code 
ON invite_codes(code);

CREATE INDEX IF NOT EXISTS idx_invite_codes_user 
ON invite_codes(user_id);

COMMIT;
```

## 🔧 **Using Different Database Clients**

### **Supabase Dashboard**
1. Go to SQL Editor
2. Run each `CREATE INDEX` command individually
3. Wait for each to complete before running the next

### **psql Command Line**
```bash
psql -h your-host -U your-username -d your-database

# Then run each command:
\echo 'Creating index 1...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_logs_user_activity ON usage_logs(user_id, created_at DESC);

\echo 'Creating index 2...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_logs_recent_activity ON usage_logs(created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';

# Continue with remaining commands...
```

### **pgAdmin**
1. Open Query Tool
2. Run each command separately
3. Execute each one individually

## ⏱️ **Expected Timing**

- **CONCURRENTLY**: 30 seconds to 5 minutes per index (no downtime)
- **Non-concurrent**: 5-30 seconds per index (brief table locks)

## ✅ **Verification Commands**

After creating indexes, run these to verify:

```sql
-- Check if indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('usage_logs', 'credit_purchases', 'invite_codes')
ORDER BY tablename, indexname;

-- Check index sizes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE tablename IN ('usage_logs', 'credit_purchases', 'invite_codes')
ORDER BY pg_relation_size(indexrelid) DESC;
```

## 🚨 **Troubleshooting**

### **If you get "relation does not exist" error:**
- Check table names are correct
- Ensure tables exist in your database

### **If you get "permission denied" error:**
- Make sure you have CREATE privileges
- Run as database owner or superuser

### **If indexes take too long:**
- Check table sizes with `\dt+` in psql
- Consider running during low-traffic periods
- Monitor with `SELECT * FROM pg_stat_progress_create_index;`

## 🎯 **Recommended Approach**

1. **Start with Method 1** (individual CONCURRENTLY commands)
2. **Run during low-traffic periods** if possible
3. **Monitor progress** with verification commands
4. **Test performance** after completion

The caching system is already working, so you'll see immediate benefits even before applying the indexes! 🚀
