-- Simple and Safe Auto-Cleanup for Expired Invite Codes
-- This approach uses application-level cleanup instead of database triggers

-- Option 1: Simple cleanup function (Recommended)
CREATE OR REPLACE FUNCTION cleanup_expired_invite_codes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired invite codes
  DELETE FROM invite_codes 
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND is_used = false;
  
  -- Get the count of deleted rows
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up % expired invite codes at %', deleted_count, NOW();
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Option 2: Function that returns details about what was deleted
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

-- Test the functions
-- SELECT cleanup_expired_invite_codes();
-- SELECT * FROM get_and_cleanup_expired_codes();

-- Option 3: Create a view to easily see expired codes (without deleting them)
CREATE OR REPLACE VIEW expired_invite_codes AS
SELECT 
  id,
  code,
  expires_at,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - expires_at))/86400 as days_expired
FROM invite_codes 
WHERE expires_at IS NOT NULL 
  AND expires_at < NOW() 
  AND is_used = false
ORDER BY expires_at ASC;

-- Query expired codes: SELECT * FROM expired_invite_codes;
