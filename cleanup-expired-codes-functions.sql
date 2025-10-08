-- Alternative approach: Application-level cleanup
-- This creates a function that can be called from the frontend/API

-- Create a function to get and delete expired invite codes
CREATE OR REPLACE FUNCTION get_and_cleanup_expired_codes()
RETURNS TABLE(
  deleted_count INTEGER,
  deleted_codes TEXT[]
) AS $$
DECLARE
  expired_codes TEXT[];
  count_result INTEGER;
BEGIN
  -- Get expired codes before deletion
  SELECT ARRAY_AGG(code), COUNT(*)
  INTO expired_codes, count_result
  FROM invite_codes 
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND is_used = false;
  
  -- Delete expired codes
  DELETE FROM invite_codes 
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND is_used = false;
  
  -- Return results
  RETURN QUERY SELECT 
    COALESCE(count_result, 0)::INTEGER as deleted_count,
    COALESCE(expired_codes, ARRAY[]::TEXT[]) as deleted_codes;
END;
$$ LANGUAGE plpgsql;

-- Create a simpler cleanup function that just returns the count
CREATE OR REPLACE FUNCTION cleanup_expired_invite_codes_simple()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM invite_codes 
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND is_used = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Test the functions
-- SELECT * FROM get_and_cleanup_expired_codes();
-- SELECT cleanup_expired_invite_codes_simple();
