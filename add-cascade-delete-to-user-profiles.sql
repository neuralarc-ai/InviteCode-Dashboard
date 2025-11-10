-- Add CASCADE DELETE to user_profiles foreign key constraint
-- This ensures that when a user is deleted from auth.users, their profile is automatically deleted
-- This is safe and will not harm existing users - it only affects future deletions

-- First, check if the foreign key constraint exists and get its name
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the foreign key constraint on user_profiles.user_id
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.user_profiles'::regclass
      AND confrelid = 'auth.users'::regclass
      AND contype = 'f'
    LIMIT 1;

    -- If constraint exists, drop it first
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped existing foreign key constraint: %', constraint_name;
    END IF;

    -- Add the foreign key constraint with CASCADE
    ALTER TABLE public.user_profiles
    ADD CONSTRAINT fk_user_profiles_user_id
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

    RAISE NOTICE 'Added foreign key constraint with ON DELETE CASCADE';
END $$;

-- Verify the constraint was created
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_profiles'::regclass
  AND contype = 'f'
  AND confrelid = 'auth.users'::regclass;

-- Note: This CASCADE only works when deleting from auth.users
-- When deleting from user_profiles, you still need to manually delete from auth.users
-- The CASCADE helps in cases where:
-- 1. User is deleted directly from Supabase Auth dashboard
-- 2. User is deleted via Supabase Admin API
-- 3. Any other direct deletion from auth.users

-- This is safe because:
-- 1. It only affects deletions from auth.users (not from user_profiles)
-- 2. It doesn't change any existing data
-- 3. It only affects future deletion operations
-- 4. Existing users are not affected at all

