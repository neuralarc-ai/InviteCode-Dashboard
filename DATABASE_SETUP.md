# Database Setup Instructions

This project has been updated to use real-time data from your existing Supabase database instead of dummy data. Your database schema is already properly set up!

## 1. Database Tables

Your existing database already has the correct tables:

- `waitlist` - Stores user information and notification status
- `invite_codes` - Stores generated invite codes and their usage status

## 2. Environment Variables

Make sure your `.env` file contains the correct Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Public environment variables for client-side access
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Database Permissions

Run the SQL script in `database-setup.sql` in your Supabase SQL editor to:

- Enable Row Level Security (RLS)
- Create access policies for your tables
- Enable real-time subscriptions for live updates

## 4. Real-time Features

The application now includes:

- **Real-time data updates**: Changes in the database are automatically reflected in the UI
- **Live statistics**: Dashboard stats update automatically when data changes
- **Real-time user table**: Waitlist table updates in real-time when users are added/modified

## 5. Database Schema

### waitlist table:
- `id` (UUID, Primary Key)
- `full_name` (VARCHAR)
- `email` (VARCHAR, Unique)
- `company` (VARCHAR, Nullable)
- `phone_number` (VARCHAR)
- `country_code` (VARCHAR)
- `reference` (VARCHAR, Nullable)
- `referral_source` (VARCHAR, Nullable)
- `referral_source_other` (VARCHAR, Nullable)
- `user_agent` (TEXT, Nullable)
- `ip_address` (INET, Nullable)
- `joined_at` (TIMESTAMP)
- `notified_at` (TIMESTAMP, Nullable)
- `is_notified` (BOOLEAN)

### invite_codes table:
- `id` (UUID, Primary Key)
- `code` (VARCHAR, Unique)
- `is_used` (BOOLEAN)
- `used_by` (UUID, Nullable, Foreign Key to auth.users)
- `used_at` (TIMESTAMP, Nullable)
- `created_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP, Nullable)
- `max_uses` (INTEGER)
- `current_uses` (INTEGER)
- `email_sent_to` (JSONB Array)

## 6. Features Implemented

✅ **Removed all dummy data**
✅ **Real-time database queries using your existing schema**
✅ **Live statistics dashboard**
✅ **Real-time user table updates**
✅ **Database operations for invite code generation**
✅ **Email sending with database updates**
✅ **Real-time subscriptions for live updates**
✅ **Proper handling of your database fields**

## 7. Running the Application

1. Install dependencies: `npm install`
2. Run the SQL script in `database-setup.sql` to set up permissions and real-time
3. Configure your environment variables
4. Run the development server: `npm run dev`

The application will now fetch real-time data from your existing Supabase database and update automatically when changes occur.
