-- Delete invalid bot/orphan users
-- WARNING: This will permanently delete 493 users from auth.users

DELETE FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.user_id = au.id
);

-- Verify deletion (Should be 0 remaining)
SELECT count(*) as remaining_orphans
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.id IS NULL;






