-- Revert the changes made by fix-missing-user-profiles.sql
-- This deletes the profiles that were auto-generated/recovered by the previous script.

DELETE FROM public.user_profiles
WHERE referral_source = 'System Recovery'
  AND metadata @> '{"is_recovered": true}';

-- Verify that they are gone (count should be 0 for these specific profiles)
SELECT count(*) as remaining_recovered_profiles
FROM public.user_profiles
WHERE referral_source = 'System Recovery'
  AND metadata @> '{"is_recovered": true}';

-- Verify the orphans are back (should match your original number of missing profiles)
SELECT count(*) as orphans_restored
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.id IS NULL;

