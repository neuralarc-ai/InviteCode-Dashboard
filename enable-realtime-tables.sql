-- Enable Realtime for Required Tables
-- This script enables Supabase Realtime subscriptions for:
-- - user_profile / user_profiles
-- - subscriptions
-- - credit_purchase / credit_purchases
-- - usage_logs

-- Note: Realtime requires the tables to be added to the supabase_realtime publication
-- Make sure RLS policies are set up correctly for these tables

-- ============================================
-- 1. Enable Realtime for user_profiles table
-- ============================================
-- Check if table exists (handles both singular and plural)
DO $$
BEGIN
    -- Try user_profiles (plural) first
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
        -- Add to realtime publication
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
            RAISE NOTICE 'Realtime enabled for user_profiles table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'user_profiles already in realtime publication or error: %', SQLERRM;
        END;
    END IF;
    
    -- Try user_profile (singular) if plural doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'user_profile') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE user_profile;
            RAISE NOTICE 'Realtime enabled for user_profile table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'user_profile already in realtime publication or error: %', SQLERRM;
        END;
    END IF;
END $$;

-- ============================================
-- 2. Enable Realtime for subscriptions table
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
            RAISE NOTICE 'Realtime enabled for subscriptions table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'subscriptions already in realtime publication or error: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'subscriptions table does not exist';
    END IF;
END $$;

-- ============================================
-- 3. Enable Realtime for credit_purchases table
-- ============================================
DO $$
BEGIN
    -- Try credit_purchases (plural) first
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'credit_purchases') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE credit_purchases;
            RAISE NOTICE 'Realtime enabled for credit_purchases table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'credit_purchases already in realtime publication or error: %', SQLERRM;
        END;
    END IF;
    
    -- Try credit_purchase (singular) if plural doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'credit_purchase') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE credit_purchase;
            RAISE NOTICE 'Realtime enabled for credit_purchase table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'credit_purchase already in realtime publication or error: %', SQLERRM;
        END;
    END IF;
END $$;

-- ============================================
-- 4. Enable Realtime for usage_logs table
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'usage_logs') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE usage_logs;
            RAISE NOTICE 'Realtime enabled for usage_logs table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'usage_logs already in realtime publication or error: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'usage_logs table does not exist';
    END IF;
END $$;

-- ============================================
-- Verify Realtime Configuration
-- ============================================
-- Check which tables are currently in the realtime publication
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
    AND tablename IN ('user_profiles', 'user_profile', 'subscriptions', 'credit_purchases', 'credit_purchase', 'usage_logs')
ORDER BY tablename;

-- ============================================
-- Notes:
-- ============================================
-- 1. Make sure RLS (Row Level Security) is enabled and policies are set up
-- 2. Realtime subscriptions require proper authentication
-- 3. The supabase_realtime publication must exist (created automatically by Supabase)
-- 4. If you get errors about the publication not existing, run:
--    CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
--    (Note: This is usually done automatically by Supabase)



