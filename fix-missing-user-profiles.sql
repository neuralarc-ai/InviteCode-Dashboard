-- Fix for 493 users missing profiles
-- Run this in your Supabase SQL Editor

INSERT INTO public.user_profiles (
    user_id,
    full_name,
    preferred_name,
    work_description,
    personal_references,
    avatar_url,
    referral_source,
    consent_given,
    consent_date,
    plan_type,
    account_type,
    metadata,
    created_at,
    updated_at
)
SELECT
    au.id,
    -- Try to get name from metadata, fallback to email prefix
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'preferred_name', au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    'Recovered Profile', -- Default work description for these users
    NULL, -- personal_references
    NULL, -- avatar_url
    'System Recovery', -- referral_source
    NULL, -- consent_given
    NULL, -- consent_date
    'seed', -- Default plan_type
    'individual', -- Default account_type
    '{"is_recovered": true}'::jsonb, -- Mark as recovered in metadata
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.id IS NULL;

-- Verify the fix
SELECT count(*) as remaining_orphans 
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.id IS NULL;

