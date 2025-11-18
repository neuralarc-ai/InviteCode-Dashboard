-- Auto-delete expired invite codes
-- This script sets up automatic deletion of expired invite codes

-- Option 1: Database Trigger (Recommended)
-- This will automatically delete expired codes when they are accessed or updated

-- Create a function to clean up expired invite codes
CREATE OR REPLACE FUNCTION cleanup_expired_invite_codes()
RETURNS void AS $$
BEGIN
  -- Delete expired invite codes
  DELETE FROM invite_codes 
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND is_used = false;
    
  -- Log the cleanup (optional)
  RAISE NOTICE 'Cleaned up expired invite codes at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that runs cleanup on any invite_codes table access
-- This ensures expired codes are removed when the table is queried
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_codes()
RETURNS trigger AS $$
BEGIN
  -- Run cleanup function
  PERFORM cleanup_expired_invite_codes();
  
  -- Return the original row (for INSERT/UPDATE triggers)
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for different operations
-- Note: PostgreSQL doesn't support BEFORE SELECT triggers
-- We'll use INSERT and UPDATE triggers instead

DROP TRIGGER IF EXISTS cleanup_expired_codes_on_insert ON invite_codes;
CREATE TRIGGER cleanup_expired_codes_on_insert
  BEFORE INSERT ON invite_codes
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_cleanup_expired_codes();

DROP TRIGGER IF EXISTS cleanup_expired_codes_on_update ON invite_codes;
CREATE TRIGGER cleanup_expired_codes_on_update
  BEFORE UPDATE ON invite_codes
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_cleanup_expired_codes();

-- Option 2: Manual cleanup function (for testing or manual runs)
-- You can call this function manually: SELECT cleanup_expired_invite_codes();

-- Option 3: Scheduled cleanup (if you have pg_cron extension)
-- Uncomment the following lines if pg_cron is available in your Supabase instance
-- SELECT cron.schedule('cleanup-expired-codes', '0 2 * * *', 'SELECT cleanup_expired_invite_codes();');

-- Test the cleanup function
-- SELECT cleanup_expired_invite_codes();

-- Verify the triggers are working
-- SELECT * FROM invite_codes LIMIT 1;
