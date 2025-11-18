/**
 * Direct database update script - doesn't require the Next.js server to be running
 * Run with: node update-users-status-direct.js
 * 
 * Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file
 * or set them as environment variables
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { createClient } = require('@supabase/supabase-js');

const emails = [
  'neelmptl.07@gmail.com',
  'cholayilfaisalhyder@gmail.com'
];

async function updateUsersStatus() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing environment variables:');
      console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌ Missing');
      console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌ Missing');
      console.error('\n💡 Make sure these are set in your .env or .env.local file');
      process.exit(1);
    }

    console.log('🔄 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Step 1: Get user IDs from email addresses
    console.log('📧 Looking up user IDs for emails...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching users:', authError.message);
      process.exit(1);
    }

    const emailToUserId = new Map();
    if (authUsers?.users) {
      authUsers.users.forEach(user => {
        if (user.email) {
          emailToUserId.set(user.email.toLowerCase(), user.id);
        }
      });
    }

    const userIds = [];
    const notFoundEmails = [];
    
    emails.forEach(email => {
      const userId = emailToUserId.get(email.toLowerCase());
      if (userId) {
        userIds.push(userId);
        console.log(`✅ Found: ${email} -> ${userId}`);
      } else {
        notFoundEmails.push(email);
        console.log(`⚠️  Not found: ${email}`);
      }
    });

    if (userIds.length === 0) {
      console.error('❌ No users found for the provided emails');
      process.exit(1);
    }

    // Step 2: Fetch existing profiles
    console.log('\n📋 Fetching user profiles...');
    const { data: profiles, error: fetchError } = await supabase
      .from('user_profiles')
      .select('user_id, metadata')
      .in('user_id', userIds);

    if (fetchError) {
      console.error('❌ Error fetching profiles:', fetchError.message);
      if (fetchError.message.includes('metadata')) {
        console.error('\n📝 The metadata column might not exist. Run this SQL in Supabase:');
        console.error(`
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_user_profiles_metadata ON user_profiles USING gin (metadata);
UPDATE user_profiles SET metadata = '{}'::jsonb WHERE metadata IS NULL;
        `);
      }
      process.exit(1);
    }

    if (!profiles || profiles.length === 0) {
      console.error('❌ No user profiles found');
      process.exit(1);
    }

    // Step 3: Update profiles
    console.log(`\n🔄 Updating ${profiles.length} user profile(s)...`);
    const now = new Date().toISOString();
    
    const updatePromises = profiles.map(async (profile) => {
      const updatedMetadata = {
        ...(profile.metadata || {}),
        credits_email_sent_at: now,
        credits_assigned: true
      };

      const { error } = await supabase
        .from('user_profiles')
        .update({
          metadata: updatedMetadata,
          updated_at: now
        })
        .eq('user_id', profile.user_id);

      if (error) {
        console.error(`❌ Failed to update user ${profile.user_id}:`, error.message);
        return { success: false, userId: profile.user_id, error };
      }
      
      console.log(`✅ Updated user ${profile.user_id}`);
      return { success: true, userId: profile.user_id };
    });

    const results = await Promise.all(updatePromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully updated: ${successful.length} user(s)`);
    if (failed.length > 0) {
      console.log(`❌ Failed: ${failed.length} user(s)`);
    }
    if (notFoundEmails.length > 0) {
      console.log(`⚠️  Emails not found: ${notFoundEmails.join(', ')}`);
    }

    if (successful.length > 0) {
      console.log('\n✅ Status updated successfully!');
      console.log('   - credits_email_sent_at: set to current timestamp');
      console.log('   - credits_assigned: set to true');
      console.log('\n💡 The status badges in the users table will update automatically via real-time subscription.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

updateUsersStatus();

