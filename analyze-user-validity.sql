-- Analyze user validity metrics
-- Run this in Supabase SQL Editor

WITH UserStats AS (
    SELECT 
        count(*) as total_users,
        
        -- Check email confirmation (Real users usually confirm email)
        count(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_emails,
        
        -- Check login activity (Real users usually log in at least once)
        count(CASE WHEN last_sign_in_at IS NOT NULL THEN 1 END) as has_signed_in,
        
        -- Check for missing profiles (The 493 orphan users)
        count(CASE WHEN up.id IS NULL THEN 1 END) as missing_profile,
        
        -- Check for suspicious email domains (common temp mail domains)
        count(CASE WHEN email LIKE '%@asciibinder.net' 
                     OR email LIKE '%@yopmail.com' 
                     OR email LIKE '%@tempmail.com' 
                     OR email LIKE '%@test.com'
                     THEN 1 END) as suspicious_domains
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.user_id
)
SELECT 
    total_users,
    confirmed_emails,
    (confirmed_emails::float / total_users * 100)::numeric(5,2) as confirmed_pct,
    has_signed_in,
    (has_signed_in::float / total_users * 100)::numeric(5,2) as active_pct,
    missing_profile,
    suspicious_domains
FROM UserStats;

-- List the most recent "Orphan" users (likely bots) to inspect manually
SELECT 
    au.email, 
    au.created_at, 
    au.last_sign_in_at,
    au.raw_user_meta_data
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.id IS NULL
ORDER BY au.created_at DESC
LIMIT 20;



