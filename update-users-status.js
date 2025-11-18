/**
 * Script to update user status for credits assigned but email not sent
 * 
 * Option 1: Run this script (make sure your Next.js server is running)
 *   node update-users-status.js
 * 
 * Option 2: Use curl command (replace localhost:3000 with your server URL)
 *   curl -X POST http://localhost:3000/api/mark-users-sent-by-email \
 *     -H "Content-Type: application/json" \
 *     -d '{"emails":["neelmptl.07@gmail.com","cholayilfaisalhyder@gmail.com"]}'
 */

const emails = [
  'neelmptl.07@gmail.com',
  'cholayilfaisalhyder@gmail.com'
];

// Update this URL if your server is not on localhost:3000
const API_URL = process.env.API_URL || 'http://localhost:3000';

async function updateUsersStatus() {
  try {
    console.log('🔄 Updating user status...');
    console.log(`📧 Emails: ${emails.join(', ')}`);
    console.log(`🌐 API URL: ${API_URL}/api/mark-users-sent-by-email\n`);

    const response = await fetch(`${API_URL}/api/mark-users-sent-by-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emails }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Success!');
      console.log(`Updated ${result.count} user(s):`);
      if (result.userIds) {
        console.log(`User IDs: ${result.userIds.join(', ')}`);
      }
      if (result.notFoundEmails && result.notFoundEmails.length > 0) {
        console.log(`⚠️  Not found emails: ${result.notFoundEmails.join(', ')}`);
      }
      console.log('\n✅ Status updated: credits_email_sent_at and credits_assigned set to true');
    } else {
      console.error('❌ Error:', result.message);
      if (result.errors) {
        console.error('Errors:', JSON.stringify(result.errors, null, 2));
      }
      if (result.notFoundEmails) {
        console.error('Not found emails:', result.notFoundEmails.join(', '));
      }
      if (result.sqlMigration) {
        console.error('\n📝 SQL Migration needed:');
        console.error(result.sqlMigration);
      }
    }
  } catch (error) {
    console.error('❌ Failed to update users:', error.message);
    console.error('\n💡 Tips:');
    console.error('1. Make sure your Next.js server is running');
    console.error('2. Update API_URL in the script if your server is not on localhost:3000');
    console.error('3. Or set API_URL environment variable: API_URL=https://your-domain.com node update-users-status.js');
    console.error('\n📋 Or use curl command:');
    console.error(`curl -X POST ${API_URL}/api/mark-users-sent-by-email \\`);
    console.error(`  -H "Content-Type: application/json" \\`);
    console.error(`  -d '{"emails":${JSON.stringify(emails)}}'`);
  }
}

updateUsersStatus();

