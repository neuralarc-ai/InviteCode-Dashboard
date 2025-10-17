# Quick Start: Applying Archive Functionality

## Step 1: Apply Database Migration

Run the SQL migration in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `add-archive-to-invite-codes.sql`
4. Click "Run" to execute the migration

The migration will:
- Add `is_archived` column to the `invite_codes` table (default: FALSE)
- Create indexes for efficient querying of archived/non-archived codes

## Step 2: Verify the Changes

All code changes have already been made to the following files:

### Updated Files:
1. ✅ `src/lib/types.ts` - Added `isArchived` field to InviteCode type
2. ✅ `src/lib/data.ts` - Updated `transformInviteCode` to include archive status
3. ✅ `src/hooks/use-realtime-data.ts` - Includes `isArchived` in data fetching
4. ✅ `src/components/dashboard/invite-code-columns.tsx` - Added archive/unarchive actions
5. ✅ `src/components/dashboard/invite-codes-table-realtime.tsx` - Added archive view toggle and bulk archive
6. ✅ `src/app/api/archive-invite-code/route.ts` - NEW: Archive single code API
7. ✅ `src/app/api/unarchive-invite-code/route.ts` - NEW: Unarchive single code API
8. ✅ `src/app/api/bulk-archive-used-codes/route.ts` - NEW: Bulk archive used codes API

## Step 3: Test the Implementation

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Invite Codes page:**
   - Go to `/invite-codes` in your application

3. **Test Individual Archive:**
   - Find a used invite code
   - Click the actions menu (⋯)
   - Select "Archive"
   - Verify the code disappears from the view
   - Click "Show Archived" button
   - Verify the code appears in archived view

4. **Test Bulk Archive:**
   - Ensure you have multiple used codes
   - Click "Archive Used" button
   - Verify success notification with count
   - Verify all used codes are archived

5. **Test Unarchive:**
   - While viewing archived codes (click "Show Archived")
   - Find a code to restore
   - Click actions menu (⋯)
   - Select "Unarchive"
   - Click "Show Active"
   - Verify the code reappears in active view

## What You'll See

### New Buttons:
1. **"Show Archived" / "Show Active"** - Toggle between views
   - Shows archived codes when clicked
   - Button changes to "Show Active" when viewing archives
   - Icon changes between Eye (active) and EyeOff (archived)

2. **"Archive Used"** - Bulk archive operation
   - Only visible in active view
   - Archives all used codes at once
   - Shows success notification with count

### Updated Actions Menu:
- **Archive** - Appears for non-archived codes
- **Unarchive** - Appears for archived codes
- **Send Reminder** - Hidden for archived codes (can't send reminders to archived)
- **Separator** - Visual separation between action groups

### Views:
- **Active View (Default):**
  - Shows only non-archived codes
  - Displays active, unused, and expired codes
  - "Show Archived" button visible

- **Archived View:**
  - Shows only archived codes
  - All standard filters still work (search, status)
  - "Show Active" button visible
  - Can unarchive codes from this view

## Features Overview

### ✨ Individual Archive Management
- Archive single codes via actions menu
- Unarchive single codes when needed
- Automatic table refresh after operations

### ✨ Bulk Operations
- Archive all used codes with one click
- Efficient database operation
- Shows count of archived codes

### ✨ View Management
- Toggle between active and archived views
- Separate, focused views for different needs
- All filters work in both views
- Clear visual indicators

### ✨ Data Preservation
- Archived codes are hidden, not deleted
- Can be unarchived anytime
- Maintains complete history
- Useful for auditing and reference

## Common Workflows

### Weekly Cleanup:
1. Navigate to Invite Codes page
2. Click "Archive Used" button
3. Review success notification
4. Active view now shows only current codes

### View Historical Data:
1. Click "Show Archived" button
2. Search or filter archived codes
3. View details of old campaigns
4. Click "Show Active" to return

### Restore a Code:
1. Click "Show Archived"
2. Find the code
3. Actions menu → "Unarchive"
4. Return to active view to see restored code

## Troubleshooting

### Button Not Showing?
- Verify the database migration was applied successfully
- Check the browser console for errors
- Refresh the page

### Archive Not Working?
- Check the API route logs for errors
- Verify the `is_archived` column exists in the database
- Ensure proper database permissions

### Codes Not Appearing After Archive?
- This is expected behavior - archived codes are hidden from active view
- Click "Show Archived" to see archived codes
- Real-time updates should refresh automatically

### Can't Find Archived Code?
- Make sure you're in the archived view ("Show Archived")
- Try searching by code name or email
- Check status filters are not hiding the code

## Benefits

### 🎯 Cleaner Interface
- Main view shows only relevant, active codes
- Easier to find current codes
- Less visual clutter

### 📊 Better Organization
- Clear separation between active and historical data
- Bulk operations for efficient management
- Focused views for different tasks

### 🔒 Data Preservation
- Historical data safely stored
- Can be retrieved anytime
- Maintains complete audit trail

### ⚡ Improved Performance
- Fewer codes displayed by default
- Faster rendering and searching
- Optimized database queries

## Next Steps

After applying these changes, you can:

1. **Regular Maintenance:**
   - Archive used codes weekly or monthly
   - Keep active view focused on current campaigns
   - Maintain organized dashboard

2. **Historical Analysis:**
   - Review archived codes for insights
   - Analyze past campaign performance
   - Audit email sends and usage patterns

3. **Code Recovery:**
   - Restore accidentally archived codes
   - Reactivate codes for special cases
   - Unarchive for follow-up campaigns

## Support

If you encounter any issues:
- Check `ARCHIVE_INVITE_CODES_IMPLEMENTATION.md` for detailed documentation
- Review the browser console for client-side errors
- Check server logs for API errors
- Verify all files were updated correctly
- Ensure the database migration was successful

## Summary

This implementation adds professional archive functionality:
- ✅ Clean separation between active and archived codes
- ✅ Easy toggle between views
- ✅ Bulk archive for efficiency
- ✅ Individual archive/unarchive for flexibility
- ✅ Data preservation without deletion
- ✅ Real-time updates and automatic refresh
- ✅ Clear user feedback with toast notifications
- ✅ Maintains all existing features and filters

Archive used codes to keep your dashboard clean and organized while preserving complete historical data! 🎉

