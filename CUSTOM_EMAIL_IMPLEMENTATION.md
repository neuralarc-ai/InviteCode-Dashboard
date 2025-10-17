# Custom Email Reminder Implementation

## Overview
Added functionality to send custom reminder emails to users with medium and low activity levels, in addition to the existing preset email templates.

## Features Added

### 1. **Custom Email API Route**
**File:** `src/app/api/send-custom-reminder/route.ts`

- Accepts custom subject and message
- Uses same email infrastructure as preset emails
- Beautiful HTML email template with custom content
- Includes user's activity level in the email
- Proper error handling and validation

### 2. **Enhanced Hook Functionality**
**File:** `src/hooks/use-realtime-data.ts`

- Added `sendCustomReminder()` function
- Maintains existing `sendActivityReminder()` for preset emails
- Proper error handling and logging
- Returns success/failure status

### 3. **Updated UI Components**
**File:** `src/app/usage-logs/page.tsx`

- **Two Email Options** for medium/low activity users:
  - **Quick Reminder**: Uses preset template (existing functionality)
  - **Custom Email**: Opens dialog for custom content
- **Custom Email Dialog** with:
  - Subject line input
  - Message textarea (8 rows)
  - Character counter
  - Email preview
  - Send/Cancel buttons

## User Interface

### Email Options in Table
For users with medium or low activity, you now see:

```
┌─────────────────────────────────────────┐
│ Activity Level: Medium                  │
│ 5 days ago                             │
│ [📧 Quick Reminder] [✏️ Custom Email]  │ ← NEW
│ ✓ Sent                                 │
└─────────────────────────────────────────┘
```

### Custom Email Dialog
```
┌─────────────────────────────────────────┐
│ ✏️ Send Custom Reminder Email          │
│ Send a personalized reminder email to   │
│ John Doe (john@example.com)             │
│                                         │
│ Email Subject:                          │
│ [We miss you, John! Come back...]      │
│                                         │
│ Email Message:                          │
│ ┌─────────────────────────────────────┐ │
│ │ Hi John,                           │ │
│ │                                    │ │
│ │ We noticed you haven't been as     │ │
│ │ active on our platform recently... │ │
│ │                                    │ │
│ │ Best regards,                      │ │
│ │ The AI Team                        │ │
│ └─────────────────────────────────────┘ │
│ 234 characters                         │
│                                         │
│ 📧 Email Preview                       │
│ To: john@example.com                   │
│ Subject: We miss you, John!            │
│ Activity Level: medium                  │
│                                         │
│ [Cancel] [📤 Send Custom Email]        │
└─────────────────────────────────────────┘
```

## How It Works

### 1. **Quick Reminder (Preset)**
```typescript
// Uses existing preset template
handleSendReminder(userEmail, userName, activityLevel, userId)
  → sendActivityReminder()
  → /api/send-activity-reminder
  → Preset HTML template
```

### 2. **Custom Email**
```typescript
// Opens dialog with custom content
handleOpenCustomEmail(userEmail, userName, activityLevel, userId)
  → Opens dialog with pre-filled content
  → User edits subject and message
  → handleSendCustomEmail()
  → sendCustomReminder()
  → /api/send-custom-reminder
  → Custom HTML template with user content
```

## Email Template Structure

### Custom Email Template
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Custom Reminder</h1>
  </div>
  
  <div style="padding: 30px; background-color: #f8f9fa;">
    <h2>Hello {userName},</h2>
    
    <!-- Custom message content -->
    <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      {customMessage}
    </div>
    
    <!-- Activity level info -->
    <div style="margin: 30px 0; padding: 20px; background-color: #e3f2fd; border-radius: 8px;">
      <h3>Your Activity Level: {activityLevel}</h3>
      <p>We noticed you haven't been as active recently. We'd love to see you back!</p>
    </div>
    
    <!-- Call-to-action button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{APP_URL}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
        Get Back to Using Our AI
      </a>
    </div>
    
    <!-- Footer -->
    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
      <p>Best regards,<br>The AI Team</p>
      <p style="font-size: 12px; color: #999;">
        This is a custom reminder email sent specifically to you.
      </p>
    </div>
  </div>
</div>
```

## Default Content

### Subject Line
```
We miss you, {userName}! Come back to our AI platform
```

### Message Template
```
Hi {userName},

We noticed you haven't been as active on our platform recently. We'd love to have you back!

Your current activity level is {activityLevel}, and we think you might enjoy exploring some of our new features.

Feel free to reach out if you have any questions or need assistance getting started again.

Best regards,
The AI Team
```

## State Management

### Dialog State
```typescript
const [customEmailDialog, setCustomEmailDialog] = useState<{
  isOpen: boolean;
  user: { email: string; name: string; activityLevel: string; userId: string } | null;
}>({ isOpen: false, user: null });
```

### Form State
```typescript
const [customSubject, setCustomSubject] = useState('');
const [customMessage, setCustomMessage] = useState('');
const [sendingCustomEmail, setSendingCustomEmail] = useState(false);
```

## Error Handling

### API Validation
```typescript
if (!userEmail || !userName || !customSubject || !customMessage) {
  return NextResponse.json(
    { success: false, error: 'Missing required fields' },
    { status: 400 }
  );
}
```

### UI Validation
```typescript
disabled={!customSubject.trim() || !customMessage.trim() || sendingCustomEmail}
```

### Error Display
- API errors shown in alert dialog
- Success/failure status shown in table row
- Loading states prevent multiple submissions

## User Experience Flow

### Quick Reminder
1. User clicks "Quick Reminder" button
2. Preset email sent immediately
3. Success indicator appears in table
4. No dialog interruption

### Custom Email
1. User clicks "Custom Email" button
2. Dialog opens with pre-filled content
3. User can edit subject and message
4. Preview shows email details
5. User clicks "Send Custom Email"
6. Dialog closes, success indicator appears
7. Custom email sent with user's content

## Benefits

### 1. **Flexibility**
- Preset emails for quick actions
- Custom emails for personalized outreach
- Both options available for each user

### 2. **User-Friendly**
- Pre-filled templates reduce typing
- Character counter for message length
- Email preview before sending
- Clear success/failure feedback

### 3. **Professional**
- Beautiful HTML email templates
- Consistent branding
- Activity level context included
- Call-to-action buttons

### 4. **Efficient**
- No page reloads
- Instant feedback
- Maintains table state
- Proper loading states

## Technical Details

### API Endpoints
- **Preset:** `POST /api/send-activity-reminder`
- **Custom:** `POST /api/send-custom-reminder`

### Email Service
- Uses Nodemailer with Gmail SMTP
- Environment variables: `EMAIL_USER`, `EMAIL_PASS`
- HTML email templates with inline CSS

### Security
- Input validation on both client and server
- Email content sanitization
- Rate limiting through existing infrastructure

## Testing

### Manual Testing Steps
1. Navigate to Usage Logs page
2. Find users with medium/low activity
3. Click "Quick Reminder" → Verify preset email sent
4. Click "Custom Email" → Verify dialog opens
5. Edit subject and message
6. Click "Send Custom Email" → Verify custom email sent
7. Check email delivery and formatting

### Expected Results
- Both email types send successfully
- Dialog opens/closes properly
- Success indicators appear in table
- Email templates render correctly
- No console errors

## Future Enhancements

### Possible Improvements
1. **Email Templates**: Save custom templates for reuse
2. **Scheduling**: Send emails at specific times
3. **Bulk Custom**: Send custom emails to multiple users
4. **Analytics**: Track email open rates and responses
5. **A/B Testing**: Test different email templates
6. **Rich Editor**: WYSIWYG editor for email content

### Configuration Options
1. **Default Templates**: Admin-configurable default content
2. **Email Limits**: Rate limiting per user
3. **Approval Workflow**: Require approval for custom emails
4. **Audit Log**: Track all email sends

## Files Modified

### New Files
- `src/app/api/send-custom-reminder/route.ts`

### Modified Files
- `src/hooks/use-realtime-data.ts`
- `src/app/usage-logs/page.tsx`

### Dependencies
- Existing UI components (Dialog, Textarea, etc.)
- Existing email infrastructure
- No new external dependencies

---

**Implementation Date:** 2025-10-17  
**Version:** 1.0  
**Status:** Production Ready

## Usage Instructions

### For Administrators
1. Navigate to Usage Logs page
2. Identify users with medium/low activity
3. Choose between:
   - **Quick Reminder**: One-click preset email
   - **Custom Email**: Personalized message dialog
4. Monitor success indicators in table
5. Check email delivery in your email service

### For Developers
1. Custom emails use the same infrastructure as preset emails
2. All email sends are logged in console
3. Error handling is consistent across both types
4. UI state management prevents race conditions
5. Email templates are easily customizable

---

**The custom email functionality is now fully implemented and ready for use!** 🎉
