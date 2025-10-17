# Archive Invite Codes Implementation

## Overview
This document describes the implementation of archive functionality for invite codes. Used invite codes can now be archived to keep the main view clean while preserving historical data. Archived codes can be viewed separately and unarchived if needed.

## Changes Made

### 1. Database Schema Updates

**File:** `add-archive-to-invite-codes.sql`

Added a new column to track archived status:
- `is_archived` (BOOLEAN DEFAULT FALSE NOT NULL): Flag to indicate if an invite code has been archived
- Created indexes for efficient querying:
  - `idx_invite_codes_is_archived`: General index for archived status
  - `idx_invite_codes_not_archived`: Optimized index for non-archived codes (most common query)

**To apply this change, run the SQL file in your Supabase SQL editor:**
```sql
-- Run in Supabase SQL Editor
-- Content from add-archive-to-invite-codes.sql
```

### 2. TypeScript Type Updates

**File:** `src/lib/types.ts`

Updated the `InviteCode` type to include the archive field:
```typescript
export type InviteCode = {
  // ... existing fields
  isArchived: boolean;  // NEW FIELD
  isPreview?: boolean;
};
```

Also updated the Database interface for Supabase:
- Added `is_archived` to `invite_codes` table Row, Insert, and Update types

### 3. Data Transformation Updates

**Files:** `src/lib/data.ts`, `src/hooks/use-realtime-data.ts`

Updated transformation functions to include `isArchived`:
```typescript
isArchived: row.is_archived || false,
```

### 4. API Routes

Created three new API routes for archive functionality:

#### 4.1 Archive Single Code
**File:** `src/app/api/archive-invite-code/route.ts`
- Archives a single invite code by ID
- Validates code exists before archiving
- Returns success/failure status

#### 4.2 Unarchive Single Code
**File:** `src/app/api/unarchive-invite-code/route.ts`
- Unarchives a single invite code by ID
- Validates code exists before unarchiving
- Returns success/failure status

#### 4.3 Bulk Archive Used Codes
**File:** `src/app/api/bulk-archive-used-codes/route.ts`
- Archives all used invite codes that are not already archived
- Updates multiple codes in a single operation
- Returns count of archived codes

### 5. UI Component Updates

#### 5.1 Invite Code Columns
**File:** `src/components/dashboard/invite-code-columns.tsx`

Added new action components:

**ArchiveCodeAction:**
- Displays "Archive" in the dropdown menu
- Archives the code when clicked
- Refreshes the table after successful archive
- Shows toast notifications for success/failure

**UnarchiveCodeAction:**
- Displays "Unarchive" in the dropdown menu
- Unarchives the code when clicked
- Refreshes the table after successful unarchive
- Shows toast notifications for success/failure

**Updated Actions Menu:**
- Conditionally shows "Archive" or "Unarchive" based on code status
- Hides "Send Reminder" action for archived codes
- Added separator between actions for better organization

#### 5.2 Invite Codes Table
**File:** `src/components/dashboard/invite-codes-table-realtime.tsx`

**New State:**
- `showArchived`: Boolean to toggle between active and archived views
- `isArchivingUsed`: Loading state for bulk archive operation

**Filtering:**
- Filters out archived codes by default
- When `showArchived` is true, shows only archived codes
- Maintains existing text and status filters

**New Buttons:**

1. **Toggle Archived View Button:**
   - Shows "Show Archived" when viewing active codes
   - Shows "Show Active" when viewing archived codes
   - Uses Eye/EyeOff icons for visual clarity

2. **Archive Used Button:**
   - Only visible when viewing active codes
   - Archives all used codes in one click
   - Shows "Archiving..." during operation
   - Displays success notification with count

**Updated Preview Codes:**
- Added `isArchived: false` to preview code objects

## Features

### Individual Archive Management
- **Archive Single Code:** Click actions menu (⋯) → "Archive"
- **Unarchive Single Code:** Click actions menu (⋯) → "Unarchive" (when viewing archived)
- **Automatic Refresh:** Table updates automatically after archiving/unarchiving

### Bulk Operations
- **Archive All Used Codes:** Click "Archive Used" button to archive all used codes at once
- **Efficient Processing:** Updates multiple codes in a single database operation
- **Progress Feedback:** Shows loading state and completion notification with count

### View Management
- **Toggle Views:** Switch between active and archived codes with one click
- **Separate Views:** Active codes shown by default, archived codes in separate view
- **Persistent Filters:** Search and status filters work in both views
- **Clear Indication:** Button text clearly indicates current and next view state

## User Workflow

### Archiving Used Codes

**Individual Archive:**
1. Navigate to the Invite Codes page
2. Find a used invite code
3. Click the actions menu (⋯)
4. Select "Archive"
5. Code disappears from active view (moved to archive)

**Bulk Archive:**
1. Navigate to the Invite Codes page
2. Click "Archive Used" button
3. All used codes are archived
4. Success notification shows count of archived codes
5. Active view now shows only unused/active codes

### Viewing Archived Codes

1. Click "Show Archived" button
2. View changes to show only archived codes
3. Button changes to "Show Active"
4. Can search and filter archived codes
5. Click "Show Active" to return to active view

### Unarchiving Codes

1. Click "Show Archived" to view archived codes
2. Find the code you want to restore
3. Click the actions menu (⋯)
4. Select "Unarchive"
5. Code disappears from archived view (moved to active)
6. Click "Show Active" to see the restored code

## Technical Details

### Database Operations

**Archive:**
```sql
UPDATE invite_codes 
SET is_archived = true 
WHERE id = $1
```

**Unarchive:**
```sql
UPDATE invite_codes 
SET is_archived = false 
WHERE id = $1
```

**Bulk Archive Used:**
```sql
UPDATE invite_codes 
SET is_archived = true 
WHERE is_used = true 
  AND is_archived = false
```

### Filtering Logic

```typescript
const filteredCodes = allCodes.filter((code) => {
  // Archive filter (primary filter)
  const matchesArchive = showArchived ? code.isArchived : !code.isArchived;
  
  // Text filter
  const matchesText = /* ... */;
  
  // Status filter
  const matchesStatus = /* ... */;
  
  return matchesArchive && matchesText && matchesStatus;
});
```

### Real-time Updates

The system uses Supabase real-time subscriptions:
- Changes to `is_archived` trigger automatic UI updates
- No manual refresh needed when archiving from another window
- Updates are pushed from database to UI in real-time

### Conditional Action Display

```typescript
{row.isArchived ? (
  <UnarchiveCodeAction code={row} />
) : (
  <ArchiveCodeAction code={row} />
)}
```

- Shows appropriate action based on current archive status
- Prevents invalid operations (can't archive already archived code)
- Provides clear action labels

## Benefits

### Cleaner Interface
- Main view shows only active, relevant codes
- Reduces visual clutter from used codes
- Easier to find and manage active codes

### Data Preservation
- Historical data is not deleted, just hidden
- Can retrieve archived codes anytime
- Maintains audit trail of all codes

### Better Organization
- Clear separation between active and archived codes
- Easy bulk operations for common tasks
- Efficient management of large code lists

### Improved Performance
- Filtering archived codes reduces data displayed
- Faster rendering with fewer rows
- Optimized database queries with indexes

## Use Cases

### Regular Cleanup
- Archive used codes weekly/monthly
- Keep active view focused on current codes
- Maintain clean, organized dashboard

### Historical Reference
- View archived codes for auditing
- Check old campaign performance
- Verify historical email sends

### Code Recovery
- Unarchive codes if needed
- Restore accidentally archived codes
- Reactivate codes for special cases

## Future Enhancements

Potential improvements that could be added:

1. **Auto-Archive:**
   - Automatically archive codes after X days of being used
   - Scheduled job to archive old codes
   - Configurable auto-archive rules

2. **Archive Statistics:**
   - Dashboard metrics for archived codes
   - Archive date tracking
   - Archive reason/notes

3. **Bulk Unarchive:**
   - Unarchive multiple codes at once
   - Select codes to unarchive
   - Unarchive by criteria (date, campaign, etc.)

4. **Export Archives:**
   - Export archived codes to CSV
   - Generate archive reports
   - Historical data analysis

5. **Archive Search:**
   - Advanced search in archived codes
   - Filter by archive date
   - Search across both views simultaneously

## Testing

To test the implementation:

1. **Apply Database Migration:**
   ```sql
   -- Run in Supabase SQL Editor
   -- Content from add-archive-to-invite-codes.sql
   ```

2. **Test Individual Archive:**
   - Mark a code as used (if not already)
   - Archive the code via actions menu
   - Verify it disappears from active view
   - Click "Show Archived"
   - Verify code appears in archived view

3. **Test Bulk Archive:**
   - Ensure you have multiple used codes
   - Click "Archive Used"
   - Verify success notification with count
   - Verify used codes are archived

4. **Test Unarchive:**
   - View archived codes
   - Unarchive a code
   - Switch to active view
   - Verify code reappears

5. **Test Filtering:**
   - Search for codes in both views
   - Apply status filters in both views
   - Verify filters work correctly

## Dependencies

No new dependencies were added. The implementation uses existing packages:
- Supabase client for database operations
- Next.js API routes for server-side operations
- React hooks for state management
- Existing UI components (Button, DropdownMenu, etc.)
- Lucide React icons (Archive, ArchiveRestore, Eye, EyeOff)

## Rollback

If you need to rollback these changes:

1. **Remove Database Column:**
   ```sql
   ALTER TABLE invite_codes DROP COLUMN IF EXISTS is_archived;
   DROP INDEX IF EXISTS idx_invite_codes_is_archived;
   DROP INDEX IF EXISTS idx_invite_codes_not_archived;
   ```

2. **Delete API Routes:**
   - Remove `src/app/api/archive-invite-code/`
   - Remove `src/app/api/unarchive-invite-code/`
   - Remove `src/app/api/bulk-archive-used-codes/`

3. **Revert Code Changes:**
   - Remove `isArchived` from TypeScript types
   - Remove archive actions from columns component
   - Remove archive toggle and bulk archive button
   - Remove `showArchived` state and filtering logic
   - Remove `isArchived` from data transformation functions

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check the server logs for API errors
3. Verify the database migration was applied successfully
4. Ensure the `is_archived` column exists in the `invite_codes` table
5. Check that indexes were created properly

## Summary

This implementation adds comprehensive archive functionality to the invite codes system:
- ✅ Database field for tracking archive status
- ✅ API routes for archiving, unarchiving, and bulk operations
- ✅ UI actions for individual archive management
- ✅ Toggle to switch between active and archived views
- ✅ Bulk archive button for used codes
- ✅ Automatic refresh and real-time updates
- ✅ Clear visual indicators and user feedback
- ✅ Preserves data while keeping interface clean

The archive feature helps maintain a clean, organized dashboard while preserving historical data for reference and auditing purposes.

