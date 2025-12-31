-- Enable Realtime via RPC Functions
-- Run this ONCE in Supabase SQL Editor to create helper functions
-- After this, you can enable realtime programmatically from your app

-- ============================================
-- Function to enable realtime for a single table
-- ============================================
CREATE OR REPLACE FUNCTION enable_realtime_table(table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = enable_realtime_table.table_name
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Table ' || enable_realtime_table.table_name || ' does not exist'
    );
  END IF;

  -- Check if already enabled
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND tablename = enable_realtime_table.table_name
  ) THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Realtime already enabled for ' || enable_realtime_table.table_name,
      'table', enable_realtime_table.table_name
    );
  END IF;

  -- Enable realtime
  BEGIN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', enable_realtime_table.table_name);
    
    RETURN json_build_object(
      'success', true,
      'message', 'Realtime enabled for ' || enable_realtime_table.table_name,
      'table', enable_realtime_table.table_name
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'table', enable_realtime_table.table_name
    );
  END;
END;
$$;

-- ============================================
-- Function to enable realtime for multiple tables
-- ============================================
CREATE OR REPLACE FUNCTION enable_realtime_tables(table_names text[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_name text;
  results json[] := ARRAY[]::json[];
  result json;
  all_success boolean := true;
BEGIN
  FOREACH table_name IN ARRAY table_names
  LOOP
    result := enable_realtime_table(table_name);
    results := array_append(results, result);
    
    IF (result->>'success')::boolean = false THEN
      all_success := false;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', all_success,
    'results', results,
    'enabled_count', (
      SELECT COUNT(*) 
      FROM json_array_elements(results::json) AS r 
      WHERE (r->>'success')::boolean = true
    ),
    'total_count', array_length(table_names, 1)
  );
END;
$$;

-- ============================================
-- Function to check realtime status
-- ============================================
CREATE OR REPLACE FUNCTION check_realtime_status(table_names text[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  enabled_tables text[];
  status_records json[] := ARRAY[]::json[];
  table_name text;
  is_enabled boolean;
BEGIN
  -- Get enabled tables
  SELECT ARRAY_AGG(tablename)
  INTO enabled_tables
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND tablename = ANY(table_names);
  
  enabled_tables := COALESCE(enabled_tables, ARRAY[]::text[]);

  -- Build status for each table
  FOREACH table_name IN ARRAY table_names
  LOOP
    is_enabled := table_name = ANY(enabled_tables);
    
    status_records := array_append(
      status_records,
      json_build_object(
        'table', table_name,
        'enabled', is_enabled
      )
    );
  END LOOP;

  RETURN json_build_object(
    'enabled_tables', enabled_tables,
    'status', status_records,
    'enabled_count', array_length(enabled_tables, 1),
    'total_count', array_length(table_names, 1)
  );
END;
$$;

-- ============================================
-- Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION enable_realtime_table(text) TO authenticated;
GRANT EXECUTE ON FUNCTION enable_realtime_table(text) TO anon;
GRANT EXECUTE ON FUNCTION enable_realtime_tables(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION enable_realtime_tables(text[]) TO anon;
GRANT EXECUTE ON FUNCTION check_realtime_status(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION check_realtime_status(text[]) TO anon;

-- ============================================
-- Auto-enable realtime for required tables
-- ============================================
-- This will automatically enable realtime for the tables that exist
DO $$
DECLARE
  tables_to_enable text[] := ARRAY['user_profiles', 'user_profile', 'subscriptions', 'credit_purchases', 'credit_purchase', 'usage_logs'];
  table_name text;
  existing_tables text[] := ARRAY[]::text[];
BEGIN
  -- Find which tables exist
  FOREACH table_name IN ARRAY tables_to_enable
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = table_name
    ) THEN
      existing_tables := array_append(existing_tables, table_name);
    END IF;
  END LOOP;

  -- Enable realtime for existing tables
  IF array_length(existing_tables, 1) > 0 THEN
    PERFORM enable_realtime_tables(existing_tables);
    RAISE NOTICE 'Realtime enabled for: %', array_to_string(existing_tables, ', ');
  END IF;
END;
$$;


