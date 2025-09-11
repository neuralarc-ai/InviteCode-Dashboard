-- Alternative: Insert credit balance data using existing user IDs
-- First, check what users exist in your auth.users table

-- Check existing users
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- If you have users, you can insert credit balance data for them like this:
-- (Replace the user_id values with actual user IDs from the query above)

/*
INSERT INTO public.credit_balance (
  user_id,
  balance_dollars,
  total_purchased,
  total_used,
  last_updated,
  metadata
) VALUES 
  (
    'REPLACE_WITH_ACTUAL_USER_ID_1',
    1500.50,
    2000.00,
    499.50,
    NOW(),
    '{"source": "signup_bonus", "tier": "premium"}'
  ),
  (
    'REPLACE_WITH_ACTUAL_USER_ID_2',
    750.25,
    1000.00,
    249.75,
    NOW() - INTERVAL '1 day',
    '{"source": "referral", "tier": "standard"}'
  );
*/
