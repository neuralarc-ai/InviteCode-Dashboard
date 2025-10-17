-- Add reminder tracking to invite_codes table
-- This script adds a column to track when reminder emails are sent

-- Add reminder_sent_at column to track when the last reminder was sent
ALTER TABLE invite_codes 
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE NULL;

-- Add comment to describe the column
COMMENT ON COLUMN invite_codes.reminder_sent_at IS 'Timestamp of when the last reminder email was sent for this invite code';

-- Create an index for querying codes by reminder status
CREATE INDEX IF NOT EXISTS idx_invite_codes_reminder_sent_at ON invite_codes(reminder_sent_at) 
WHERE reminder_sent_at IS NOT NULL;

