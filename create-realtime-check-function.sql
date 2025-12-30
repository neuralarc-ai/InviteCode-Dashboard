-- Create a function to check realtime status for tables
-- This function can be called from the API to check which tables have realtime enabled
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION check_realtime_tables(table_names text[])
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  enabled_tables text[];
BEGIN
  SELECT ARRAY_AGG(tablename)
  INTO enabled_tables
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND tablename = ANY(table_names);
  
  RETURN COALESCE(enabled_tables, ARRAY[]::text[]);
END;
$$;

-- Grant execute permission to authenticated users (or anon if needed)
GRANT EXECUTE ON FUNCTION check_realtime_tables(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION check_realtime_tables(text[]) TO anon;

-- Test the function
-- SELECT check_realtime_tables(ARRAY['user_profiles', 'subscriptions', 'credit_purchases', 'usage_logs']);

