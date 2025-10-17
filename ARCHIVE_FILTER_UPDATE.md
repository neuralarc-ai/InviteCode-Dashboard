# Archive Filter Update

## Overview
Added a dedicated archive filter dropdown to the invite codes table, providing a more intuitive way to filter between active, archived, and all codes.

## Changes Made

### Updated Components

**File:** `src/components/dashboard/invite-codes-table-realtime.tsx`

#### 1. New State Variable
- Replaced `showArchived` boolean toggle with `archiveFilter` string state
- Default value: `'active'` (shows non-archived codes by default)
- Options: `'active'`, `'archived'`, `'all'`

```typescript
const [archiveFilter, setArchiveFilter] = React.useState<string>('active');
```

#### 2. New Filter Dropdown
Added a dedicated archive filter dropdown next to the status filter:

```typescript
<Select value={archiveFilter} onValueChange={setArchiveFilter}>
  <SelectTrigger className="w-[140px]">
    <Archive className="h-4 w-4 mr-2" />
    <SelectValue placeholder="Archive" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="active">Active Only</SelectItem>
    <SelectItem value="archived">Archived Only</SelectItem>
    <SelectItem value="all">All Codes</SelectItem>
  </SelectContent>
</Select>
```

#### 3. Updated Filtering Logic
The filter now supports three states:
- **Active Only**: Shows only non-archived codes (default)
- **Archived Only**: Shows only archived codes
- **All Codes**: Shows both archived and non-archived codes

```typescript
const filteredCodes = allCodes.filter((code) => {
  // Archive filter
  let matchesArchive = true;
  if (archiveFilter === 'active') {
    matchesArchive = !code.isArchived;
  } else if (archiveFilter === 'archived') {
    matchesArchive = code.isArchived;
  }
  // If archiveFilter === 'all', show both
  
  // ... other filters
});
```

#### 4. Removed Toggle Button
- Removed the "Show Archived" / "Show Active" toggle button
- Replaced with the more intuitive dropdown filter

#### 5. Updated "Archive Used" Button Visibility
- The "Archive Used" button now only shows when viewing active codes
- Hidden when viewing archived or all codes

```typescript
{archiveFilter === 'active' && (
  <Button onClick={handleArchiveUsedCodes}>
    Archive Used
  </Button>
)}
```

#### 6. Updated Footer Display
Enhanced the footer text to show current filter state:
- Shows "Archived" when filtering archived codes
- Shows "All" when showing all codes
- Shows status filter when active (Active/Used/Expired)

## User Experience

### Filter Options

**Status Filter:**
- All Status
- Active (not used, not expired)
- Used (code has been used)
- Expired (code has expired)

**Archive Filter (NEW):**
- Active Only (default) - Shows non-archived codes
- Archived Only - Shows archived codes
- All Codes - Shows both archived and non-archived

### Usage Examples

**View only active codes (default):**
- Archive Filter: "Active Only"
- Shows: Non-archived codes only

**View only archived codes:**
- Archive Filter: "Archived Only"
- Shows: Archived codes only
- "Archive Used" button hidden

**View all codes:**
- Archive Filter: "All Codes"
- Shows: Both archived and non-archived codes
- "Archive Used" button hidden

**Combine filters:**
- Status: "Used"
- Archive: "Active Only"
- Shows: Used codes that are not archived

### Visual Layout

```
[Search Box] [Status Filter ▼] [Archive Filter ▼] [🔴 Indicator]
                                                      [Archive Used] [Cleanup] [Delete] [Generate]
```

The archive filter is positioned:
- Right after the status filter
- Before the red dot indicator
- Uses Archive icon for easy identification

## Benefits

### More Intuitive
- Dropdown is more discoverable than toggle button
- Three options are clearer than a binary toggle
- Consistent with existing status filter pattern

### Better Organization
- All filters grouped together in one area
- Easy to understand current view state
- Logical flow: Search → Status → Archive

### Flexible Viewing
- Can view all codes at once if needed
- No need to toggle back and forth
- Single location for all filtering controls

### Improved UX
- Matches common filter patterns in web apps
- Icon helps identify the filter purpose
- Clear labels for each option

## Technical Details

### Filter Priority
Filters are applied in this order:
1. Archive filter (active/archived/all)
2. Text search filter
3. Status filter (active/used/expired)

All filters work together - selecting "Archived Only" + "Used" shows only archived codes that are used.

### State Management
- Archive filter state: `archiveFilter` (string)
- Status filter state: `statusFilter` (string)
- Search filter state: `filter` (string)
- All filters are independent and can be combined

### Performance
- Filtering happens on the client side
- No additional API calls needed
- Indexes on `is_archived` column ensure fast queries
- Real-time updates work seamlessly

## Migration from Toggle Button

**Old Behavior:**
- Click "Show Archived" to view archived codes
- Click "Show Active" to return to active codes
- Binary on/off state

**New Behavior:**
- Select "Active Only" from dropdown (default)
- Select "Archived Only" to view archived
- Select "All Codes" to see both
- Three-state selection

## Future Enhancements

Potential improvements:
1. **Quick Filters**: Add preset filter combinations
2. **Filter Badges**: Show active filters as removable badges
3. **Filter Persistence**: Remember filter selections across sessions
4. **URL State**: Sync filters with URL parameters for shareable links
5. **Advanced Filters**: Add date range, email sent status, etc.

## Testing

To test the new filter:

1. **Default View:**
   - Should show "Active Only" selected
   - Should display non-archived codes

2. **View Archived:**
   - Select "Archived Only" from dropdown
   - Should show only archived codes
   - "Archive Used" button should be hidden

3. **View All:**
   - Select "All Codes" from dropdown
   - Should show both archived and non-archived codes
   - "Archive Used" button should be hidden

4. **Combine Filters:**
   - Select "Used" status + "Active Only" archive
   - Should show used codes that are not archived
   - Try different combinations

5. **Filter Persistence:**
   - Select a filter
   - Navigate to another page
   - Return to invite codes
   - Filter should reset to default (Active Only)

## Support

The archive filter is fully compatible with:
- All existing features
- Real-time updates
- Pagination
- Search functionality
- Status filtering
- Sorting
- Selection and bulk operations

No additional setup required - the filter works immediately after code update.

