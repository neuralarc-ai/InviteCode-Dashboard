-- Your existing database schema is already set up correctly!
-- The tables 'invite_codes' and 'waitlist' are already created with the proper structure.

-- Enable Row Level Security (RLS) if not already enabled
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your security requirements)
-- These policies allow the application to read and write data

-- Waitlist table policies
CREATE POLICY "Allow public read access to waitlist" ON waitlist
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to waitlist" ON waitlist
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to waitlist" ON waitlist
    FOR UPDATE USING (true);

-- Invite codes table policies
CREATE POLICY "Allow public read access to invite_codes" ON invite_codes
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to invite_codes" ON invite_codes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to invite_codes" ON invite_codes
    FOR UPDATE USING (true);

-- Enable real-time subscriptions for live updates
-- This allows the frontend to receive real-time updates when data changes

-- Enable real-time for waitlist table
ALTER PUBLICATION supabase_realtime ADD TABLE waitlist;

-- Enable real-time for invite_codes table  
ALTER PUBLICATION supabase_realtime ADD TABLE invite_codes;

-- Create credit_balance table if it doesn't exist
CREATE TABLE IF NOT EXISTS credit_balance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  current_balance INTEGER DEFAULT 0,
  total_credits INTEGER DEFAULT 0,
  used_credits INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for credit_balance table
ALTER TABLE credit_balance ENABLE ROW LEVEL SECURITY;

-- Create policies for credit_balance table
CREATE POLICY "Allow public read access to credit_balance" ON credit_balance
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to credit_balance" ON credit_balance
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to credit_balance" ON credit_balance
    FOR UPDATE USING (true);

-- Enable real-time for credit_balance table
ALTER PUBLICATION supabase_realtime ADD TABLE credit_balance;

-- Note: If you get an error about the publication not existing, you may need to create it first:
-- CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
