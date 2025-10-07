-- Credit Usage Table RLS Policy Fix
-- Run these commands in your Supabase SQL Editor

-- 1. First, check current RLS policies on credit_usage table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'credit_usage';

-- 2. Check if RLS is enabled on the table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'credit_usage';

-- 3. CURRENT ISSUE: The policy "Users can view their own credit usage" is too restrictive
-- It only allows users to see their own records, but your dashboard needs to see ALL records

-- 4. SOLUTION: Drop the restrictive policy and create a permissive one
DROP POLICY IF EXISTS "Users can view their own credit usage" ON public.credit_usage;

-- 5. Create a new policy that allows authenticated users to read ALL credit usage records
CREATE POLICY "Allow authenticated users to read all credit usage" ON public.credit_usage
    FOR SELECT TO authenticated
    USING (true);

-- 6. Alternative: If you want to allow anonymous users too (for testing)
-- CREATE POLICY "Allow all users to read credit usage" ON public.credit_usage
--     FOR SELECT TO public
--     USING (true);

-- 7. If you want to be more restrictive and only allow specific admin users:
-- CREATE POLICY "Allow admin users to read all credit usage" ON public.credit_usage
--     FOR SELECT TO authenticated
--     USING (auth.jwt() ->> 'role' = 'admin');

-- 8. To re-enable RLS after testing (if you disabled it):
-- ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;

-- 9. To check the new policies:
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'credit_usage';
