-- Insert sample data into credit_balance table
-- You can run this in your Supabase SQL editor

-- First, let's check if there are any existing users in auth.users
-- If you have users, you can use their actual user_ids
-- For this example, I'll create some sample UUIDs

INSERT INTO public.credit_balance (
  user_id,
  balance_dollars,
  total_purchased,
  total_used,
  last_updated,
  metadata
) VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440001',
    1500.50,
    2000.00,
    499.50,
    NOW(),
    '{"source": "signup_bonus", "tier": "premium"}'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002',
    750.25,
    1000.00,
    249.75,
    NOW() - INTERVAL '1 day',
    '{"source": "referral", "tier": "standard"}'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    0.00,
    500.00,
    500.00,
    NOW() - INTERVAL '2 days',
    '{"source": "trial", "tier": "basic", "expired": true}'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440004',
    2000.00,
    2000.00,
    0.00,
    NOW() - INTERVAL '3 hours',
    '{"source": "purchase", "tier": "premium", "payment_method": "stripe"}'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440005',
    300.75,
    800.00,
    499.25,
    NOW() - INTERVAL '1 week',
    '{"source": "gift", "tier": "standard", "gift_from": "admin"}'
  );

-- Verify the data was inserted
SELECT 
  user_id,
  balance_dollars,
  total_purchased,
  total_used,
  last_updated,
  metadata
FROM public.credit_balance
ORDER BY last_updated DESC;
