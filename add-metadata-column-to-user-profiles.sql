-- Add metadata column to user_profiles table
-- This column will store JSONB data including credits_email_sent_at and credits_assigned flags

-- Add metadata column if it doesn't exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create an index on metadata for better query performance (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_user_profiles_metadata ON user_profiles USING gin (metadata);

-- Update existing rows to have empty metadata object if they are NULL
UPDATE user_profiles 
SET metadata = '{}'::jsonb 
WHERE metadata IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles' 
AND column_name = 'metadata';



