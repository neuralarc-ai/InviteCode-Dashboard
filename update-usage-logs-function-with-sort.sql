-- Update function to support sorting
-- This allows sorting by activity_score, usage_count, total_cost, etc.

DROP FUNCTION IF EXISTS get_aggregated_usage_logs(text, text, integer, integer, text, text);

CREATE OR REPLACE FUNCTION get_aggregated_usage_logs(
  search_query text DEFAULT '',
  activity_level_filter text DEFAULT '',
  page_number integer DEFAULT 1,
  page_size integer DEFAULT 10,
  user_type_filter text DEFAULT 'external',
  sort_by text DEFAULT 'latest_activity'  -- 'latest_activity', 'activity_score', 'usage_count', 'total_cost'
)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_email text,
  total_prompt_tokens bigint,
  total_completion_tokens bigint,
  total_tokens bigint,
  total_estimated_cost numeric,
  usage_count bigint,
  earliest_activity timestamp with time zone,
  latest_activity timestamp with time zone,
  has_completed_payment boolean,
  activity_level text,
  days_since_last_activity integer,
  activity_score integer,
  total_count bigint,
  grand_total_tokens bigint,
  grand_total_cost numeric,
  user_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  offset_val integer;
  now_timestamp timestamp with time zone := now();
BEGIN
  offset_val := (page_number - 1) * page_size;
  
  RETURN QUERY
  WITH user_aggregates AS (
    SELECT 
      ul.user_id,
      SUM(ul.total_prompt_tokens) AS total_prompt_tokens,
      SUM(ul.total_completion_tokens) AS total_completion_tokens,
      SUM(ul.total_tokens) AS total_tokens,
      SUM(ul.estimated_cost) AS total_estimated_cost,
      COUNT(*) AS usage_count,
      MIN(ul.created_at) AS earliest_activity,
      MAX(ul.created_at) AS latest_activity
    FROM usage_logs ul
    GROUP BY ul.user_id
  ),
  user_payments AS (
    SELECT DISTINCT
      cp.user_id,
      true AS has_payment
    FROM credit_purchases cp
    WHERE cp.status = 'completed'
  ),
  user_with_details AS (
    SELECT 
      ua.*,
      COALESCE(up.has_payment, false) AS has_completed_payment,
      -- Get user name from user_profiles first, then auth.users metadata, then fallback
      COALESCE(
        (SELECT full_name FROM user_profiles WHERE user_id = ua.user_id LIMIT 1),
        (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = ua.user_id),
        (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = ua.user_id),
        'User ' || SUBSTRING(ua.user_id::text, 1, 8)
      )::text AS user_name,
      COALESCE(
        (SELECT email::text FROM auth.users WHERE id = ua.user_id),
        'user-' || SUBSTRING(ua.user_id::text, 1, 8) || '@unknown.com'
      )::text AS user_email,
      -- Determine user type based on email domain
      CASE 
        WHEN LOWER(COALESCE(
          (SELECT email::text FROM auth.users WHERE id = ua.user_id),
          'user-' || SUBSTRING(ua.user_id::text, 1, 8) || '@unknown.com'
        )) LIKE '%@he2.ai' 
        OR LOWER(COALESCE(
          (SELECT email::text FROM auth.users WHERE id = ua.user_id),
          'user-' || SUBSTRING(ua.user_id::text, 1, 8) || '@unknown.com'
        )) LIKE '%@neuralarc.ai' 
        THEN 'internal'
        ELSE 'external'
      END AS user_type
    FROM user_aggregates ua
    LEFT JOIN user_payments up ON ua.user_id = up.user_id
  ),
  user_activity AS (
    SELECT 
      uwd.*,
      EXTRACT(DAY FROM (now_timestamp - uwd.latest_activity))::integer AS days_since_last_activity,
      GREATEST(0, 100 - (EXTRACT(DAY FROM (now_timestamp - uwd.latest_activity))::integer * 2))::integer AS recency_score,
      LEAST(100, uwd.usage_count * 5)::integer AS frequency_score,
      LEAST(100, uwd.total_tokens / 1000000)::integer AS volume_score
    FROM user_with_details uwd
    -- Filter by user type (internal/external/all)
    WHERE 
      CASE
        WHEN user_type_filter = 'internal' THEN uwd.user_type = 'internal'
        WHEN user_type_filter = 'external' THEN uwd.user_type = 'external'
        ELSE true  -- 'all' shows both
      END
  ),
  user_activity_with_level AS (
    SELECT 
      ua.*,
      (ua.recency_score * 0.5 + ua.frequency_score * 0.3 + ua.volume_score * 0.2)::integer AS activity_score,
      CASE 
        WHEN ua.days_since_last_activity <= 2 THEN 'high'          -- Active within the last 2 days
        WHEN ua.days_since_last_activity = 3 THEN 'medium'        -- No activity for exactly 3 days
        WHEN ua.days_since_last_activity > 3 THEN 'low'           -- More than 3 days since last activity
        ELSE 'inactive'
      END AS activity_level
    FROM user_activity ua
  ),
  -- Calculate grand totals AFTER user type filtering
  grand_totals AS (
    SELECT
      COALESCE(SUM(uawl.total_tokens), 0)::bigint AS grand_total_tokens,
      COALESCE(SUM(uawl.total_estimated_cost), 0)::numeric AS grand_total_cost
    FROM user_activity_with_level uawl
    WHERE 
      (activity_level_filter = '' OR uawl.activity_level = activity_level_filter)
      AND (
        search_query = '' 
        OR LOWER(uawl.user_name) LIKE '%' || LOWER(search_query) || '%'
        OR LOWER(uawl.user_email) LIKE '%' || LOWER(search_query) || '%'
        OR uawl.user_id::text LIKE '%' || LOWER(search_query) || '%'
      )
  ),
  filtered_users AS (
    SELECT 
      uawl.user_id,
      uawl.user_name,
      uawl.user_email,
      uawl.total_prompt_tokens,
      uawl.total_completion_tokens,
      uawl.total_tokens,
      uawl.total_estimated_cost,
      uawl.usage_count,
      uawl.earliest_activity,
      uawl.latest_activity,
      uawl.has_completed_payment,
      uawl.activity_level,
      uawl.days_since_last_activity,
      uawl.activity_score,
      uawl.user_type,
      COUNT(*) OVER() AS total_count
    FROM user_activity_with_level uawl
    WHERE 
      (activity_level_filter = '' OR uawl.activity_level = activity_level_filter)
      AND (
        search_query = '' 
        OR LOWER(uawl.user_name) LIKE '%' || LOWER(search_query) || '%'
        OR LOWER(uawl.user_email) LIKE '%' || LOWER(search_query) || '%'
        OR uawl.user_id::text LIKE '%' || LOWER(search_query) || '%'
      )
    ORDER BY 
      CASE WHEN sort_by = 'latest_activity' THEN uawl.latest_activity END DESC NULLS LAST,
      CASE WHEN sort_by = 'activity_score' THEN uawl.activity_score END DESC NULLS LAST,
      CASE WHEN sort_by = 'usage_count' THEN uawl.usage_count END DESC NULLS LAST,
      CASE WHEN sort_by = 'total_cost' THEN uawl.total_estimated_cost END DESC NULLS LAST,
      uawl.latest_activity DESC -- Default tie breaker
    LIMIT page_size
    OFFSET offset_val
  )
  SELECT 
    fu.user_id,
    fu.user_name,
    fu.user_email,
    fu.total_prompt_tokens,
    fu.total_completion_tokens,
    fu.total_tokens,
    fu.total_estimated_cost,
    fu.usage_count,
    fu.earliest_activity,
    fu.latest_activity,
    fu.has_completed_payment,
    fu.activity_level,
    fu.days_since_last_activity,
    fu.activity_score,
    fu.total_count,
    gt.grand_total_tokens,
    gt.grand_total_cost,
    fu.user_type
  FROM filtered_users fu
  CROSS JOIN grand_totals gt;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_aggregated_usage_logs(text, text, integer, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_aggregated_usage_logs(text, text, integer, integer, text, text) TO anon;
GRANT EXECUTE ON FUNCTION get_aggregated_usage_logs(text, text, integer, integer, text, text) TO service_role;

COMMENT ON FUNCTION get_aggregated_usage_logs IS 'Aggregates usage logs with sorting support - checks user_profiles, then auth.users metadata for names';
