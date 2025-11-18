-- Setup RLS policies for usage_logs table
-- This assumes the usage_logs table already exists as provided by the user

-- Enable Row Level Security on usage_logs table
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your security requirements)
-- These policies allow the application to read and write data

-- Usage logs table policies
CREATE POLICY "Allow public read access to usage_logs" ON usage_logs
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to usage_logs" ON usage_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to usage_logs" ON usage_logs
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to usage_logs" ON usage_logs
    FOR DELETE USING (true);

-- Enable real-time subscriptions for live updates
-- This allows the frontend to receive real-time updates when data changes
ALTER PUBLICATION supabase_realtime ADD TABLE usage_logs;

-- Verify the table structure (this will show the current table structure)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'usage_logs' AND table_schema = 'public'
ORDER BY ordinal_position;
