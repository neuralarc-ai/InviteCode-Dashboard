# Reminder Tracking Implementation

## Overview
This document describes the implementation of reminder tracking functionality for invite codes. When a reminder email is sent to a user, the system now automatically updates their entry to indicate that a reminder has been sent.

## Changes Made

### 1. Database Schema Updates

**File:** `add-reminder-tracking.sql`

Added a new column to track when reminder emails are sent:
- `reminder_sent_at` (TIMESTAMP WITH TIME ZONE NULL): Stores the timestamp of when the last reminder email was sent for an invite code
- Created an index for efficient querying: `idx_invite_codes_reminder_sent_at`

**To apply this change, run the SQL file in your Supabase SQL editor:**
```bash
# In Supabase SQL Editor, run:
add-reminder-tracking.sql
```

### 2. TypeScript Type Updates

**File:** `src/lib/types.ts`

Updated the `InviteCode` type to include the new field:
```typescript
export type InviteCode = {
  // ... existing fields
  reminderSentAt: Date | null;  // NEW FIELD
  isPreview?: boolean;
};
```

Also updated the Database interface for Supabase:
- Added `reminder_sent_at` to `invite_codes` table Row, Insert, and Update types

### 3. Data Transformation Updates

**File:** `src/lib/data.ts`

Added a new `transformInviteCode` function (was missing) to properly transform database rows to TypeScript objects:
```typescript
function transformInviteCode(row: any): InviteCode {
  return {
    // ... existing fields
    reminderSentAt: row.reminder_sent_at ? new Date(row.reminder_sent_at) : null,
  };
}
```

### 4. API Route Updates

**File:** `src/app/api/send-reminder-email/route.ts`

Updated the API to record when a reminder is sent:
- After successfully sending reminder emails, the system now updates the `reminder_sent_at` field in the database
- This happens automatically after a successful email send operation
- If the update fails, it logs an error but doesn't fail the request (graceful degradation)

```typescript
// Update the invite code to record when the reminder was sent
const { error: updateError } = await supabase
  .from('invite_codes')
  .update({ reminder_sent_at: new Date().toISOString() })
  .eq('id', codeId);
```

### 5. UI Component Updates

**File:** `src/components/dashboard/invite-code-columns.tsx`

#### 5.1 SendReminderAction Component
- Added `refreshInviteCodes` from the refresh context
- After successfully sending a reminder, the component now refreshes the invite codes list to show the updated status

```typescript
if (result.success) {
  toast({ /* ... */ });
  // Refresh the invite codes list to show updated reminder status
  await refreshInviteCodes();
}
```

#### 5.2 New Column: "Reminder Sent"
Added a new sortable column to display reminder status:
- Shows a blue "Sent" badge with the date if a reminder has been sent
- Shows "Not sent" in muted text if no reminder has been sent
- The column is sortable by `reminderSentAt` field
- Date format: "Month Day" (e.g., "Jan 15")

Visual indicators:
- **Sent:** Blue badge with date (e.g., "Sent Jan 15")
- **Not sent:** Gray muted text

### 6. Table Component Updates

**File:** `src/components/dashboard/invite-codes-table-realtime.tsx`

Updated preview code objects to include the new field:
```typescript
const previewCodesAsInviteCodes: InviteCode[] = previewCodes.map((preview, index) => ({
  // ... existing fields
  reminderSentAt: null,  // Preview codes haven't had reminders sent
  isPreview: true,
}));
```

### 7. Real-time Data Hook Updates

**File:** `src/hooks/use-realtime-data.ts`

Updated the `fetchCodes` function to include `reminderSentAt` when transforming database rows:
```typescript
const transformedCodes = data?.map((row: any) => ({
  // ... existing fields
  reminderSentAt: row.reminder_sent_at ? new Date(row.reminder_sent_at) : null,
})) || [];
```

## Features

### Automatic Tracking
- When a reminder email is sent via the "Send Reminder" action in the UI, the system automatically records the timestamp
- The timestamp is stored in the database immediately after successful email delivery
- Real-time subscriptions ensure the UI updates automatically when the database is updated

### Visual Feedback
1. **New Column:** A dedicated "Reminder Sent" column shows the reminder status at a glance
2. **Badge Indicator:** Blue "Sent" badge makes it easy to identify codes that have had reminders sent
3. **Date Display:** Shows when the reminder was sent in a compact format
4. **Sortable:** Users can sort by reminder sent date to quickly find codes that need follow-up

### Data Refresh
- After sending a reminder, the table automatically refreshes to show the updated status
- No manual refresh required - the system uses real-time subscriptions and manual refresh triggers

## User Workflow

1. **View Invite Codes:** Navigate to the Invite Codes page
2. **Identify Code:** Find an invite code that hasn't been used
3. **Send Reminder:** Click the actions menu (⋯) and select "Send Reminder"
4. **Automatic Update:** After the reminder is sent successfully:
   - A success toast notification appears
   - The table refreshes automatically
   - The "Reminder Sent" column updates to show "Sent" with the current date
5. **Track Status:** Use the "Reminder Sent" column to see which codes have been followed up on

## Technical Details

### Database Field
- **Field name:** `reminder_sent_at`
- **Type:** `TIMESTAMP WITH TIME ZONE`
- **Nullable:** Yes (NULL means no reminder has been sent)
- **Index:** Created for efficient queries on reminder status

### Real-time Updates
The system uses Supabase real-time subscriptions to automatically detect changes:
- When `reminder_sent_at` is updated in the database, the UI receives a real-time notification
- The `useInviteCodes` hook automatically refetches data when changes are detected
- No polling required - updates are pushed from the database to the UI

### Error Handling
- If the database update fails, an error is logged but the email send operation is not rolled back
- Users still receive the success notification for the email send
- The timestamp will be NULL in the database, indicating no reminder has been recorded

## Future Enhancements

Potential improvements that could be added:
1. **Multiple Reminders:** Track a history of reminder emails instead of just the last one
2. **Reminder Intervals:** Show how long it's been since the last reminder
3. **Auto-reminder:** Automatically send reminders after a certain period
4. **Reminder Templates:** Allow customizing reminder email content
5. **Reminder Statistics:** Dashboard metrics for reminder effectiveness

## Testing

To test the implementation:

1. **Apply Database Migration:**
   ```sql
   -- Run in Supabase SQL Editor
   -- Content from add-reminder-tracking.sql
   ```

2. **Test Reminder Send:**
   - Create or find an invite code with emails
   - Send a reminder via the UI
   - Verify the "Reminder Sent" column updates

3. **Test Sorting:**
   - Click the "Reminder Sent" column header
   - Verify codes sort by reminder date

4. **Test Real-time Updates:**
   - Open the invite codes page in two browser windows
   - Send a reminder in one window
   - Verify the other window updates automatically

## Dependencies

No new dependencies were added. The implementation uses existing packages:
- Supabase client for database operations
- Next.js API routes for server-side operations
- React hooks for state management
- Existing UI components (Badge, Button, etc.)

## Rollback

If you need to rollback these changes:

1. **Remove Database Column:**
   ```sql
   ALTER TABLE invite_codes DROP COLUMN IF EXISTS reminder_sent_at;
   DROP INDEX IF EXISTS idx_invite_codes_reminder_sent_at;
   ```

2. **Revert Code Changes:**
   - Remove `reminderSentAt` from TypeScript types
   - Remove the "Reminder Sent" column from the table
   - Remove the database update in the API route
   - Remove `reminderSentAt` from data transformation functions

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check the server logs for API errors
3. Verify the database migration was applied successfully
4. Ensure the `reminder_sent_at` column exists in the `invite_codes` table

