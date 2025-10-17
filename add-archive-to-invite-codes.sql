-- Add archive functionality to invite_codes table
-- This script adds a column to track archived invite codes

-- Add is_archived column to track archived codes
ALTER TABLE invite_codes 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comment to describe the column
COMMENT ON COLUMN invite_codes.is_archived IS 'Flag to indicate if this invite code has been archived';

-- Create an index for querying archived codes
CREATE INDEX IF NOT EXISTS idx_invite_codes_is_archived ON invite_codes(is_archived);

-- Create an index for querying non-archived codes (most common query)
CREATE INDEX IF NOT EXISTS idx_invite_codes_not_archived ON invite_codes(is_archived) 
WHERE is_archived = FALSE;

