-- Add is_archived column to waitlist table
-- This script adds the archive functionality to the waitlist

-- Add the is_archived column with default value false
ALTER TABLE waitlist 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Create an index for better performance when filtering archived users
CREATE INDEX IF NOT EXISTS idx_waitlist_is_archived 
ON waitlist(is_archived);

-- Create a composite index for common queries
CREATE INDEX IF NOT EXISTS idx_waitlist_archived_notified 
ON waitlist(is_archived, is_notified);

-- Optional: Add a comment to document the column
COMMENT ON COLUMN waitlist.is_archived IS 'Indicates if the waitlist user has been archived (typically after receiving an invite code)';

-- Test the column exists
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'waitlist' 
AND column_name = 'is_archived';
