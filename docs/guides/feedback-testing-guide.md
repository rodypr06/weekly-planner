# Feedback Feature Testing Guide

This guide helps you test the newly implemented feedback feature in the Weekly Planner app.

## Prerequisites

1. **Database Setup**: Run the SQL script in `supabase-feedback-setup.sql` in your Supabase SQL Editor
2. **Update Environment Variables**: Add optional webhook URL to your `.env` file if you want email notifications
3. **Restart Server**: Make sure to restart your server to load the new changes

## Testing Steps

### 1. Test Feedback Form UI

1. **Login to the app**
2. **Click on your user menu** (top right corner)
3. **Click "Send Feedback"** - The feedback modal should appear
4. **Verify the form elements**:
   - Feedback Type dropdown (Bug Report, Feature Request, Improvement, Other)
   - Subject field
   - Message textarea
   - Optional Name field
   - Optional Email field (should be pre-filled with user's email if logged in)

### 2. Test Form Validation

1. **Try submitting empty form** - Should show validation errors
2. **Fill only some required fields** - Should not submit until all required fields are filled
3. **Test each feedback type** - Select different options from the dropdown

### 3. Test Feedback Submission

Submit feedback with different scenarios:

#### Test Case 1: Bug Report
```
Type: Bug Report
Subject: Test bug report
Message: This is a test bug report to verify the feedback system is working correctly.
Name: (leave empty to test anonymous)
Email: (leave empty to test anonymous)
```

#### Test Case 2: Feature Request
```
Type: Feature Request
Subject: Add dark mode
Message: It would be great to have a dark mode option for the app.
Name: John Doe
Email: john@example.com
```

#### Test Case 3: Logged-in User Feedback
```
Type: Improvement
Subject: Performance optimization
Message: The app could load faster on mobile devices.
Name: (should use logged-in username)
Email: (should use logged-in user email)
```

### 4. Verify Database Storage

1. **Go to Supabase Dashboard**
2. **Navigate to Table Editor → feedback table**
3. **Verify the submitted feedback appears** with:
   - Correct user_id (for logged-in users)
   - All form fields properly stored
   - Timestamps (created_at, updated_at)
   - Status should be 'new'
   - User agent and page URL captured

### 5. Test Email Notifications (if configured)

If you've set up `FEEDBACK_WEBHOOK_URL`:

1. **Submit feedback**
2. **Check your webhook endpoint** (Zapier, IFTTT, etc.)
3. **Verify the webhook receives**:
   ```json
   {
     "type": "bug",
     "subject": "Test bug",
     "message": "Test message",
     "from": "Anonymous",
     "email": "user@example.com",
     "userId": "uuid-here",
     "pageUrl": "http://localhost:2324/",
     "timestamp": "2024-01-15T12:00:00.000Z"
   }
   ```

### 6. Test Error Handling

1. **Disconnect internet and try submitting** - Should show network error
2. **Submit very long message** (over 10,000 characters) - Should handle gracefully
3. **Test with invalid session** - Log out in another tab and try submitting

### 7. Test UI Feedback

After successful submission:
- ✅ Success message should appear
- ✅ Modal should close automatically
- ✅ Form should reset
- ✅ Success sound should play (if audio is enabled)

## Verification Checklist

- [ ] Feedback button appears in user menu
- [ ] Modal opens and closes properly
- [ ] Form validation works correctly
- [ ] Feedback submits successfully
- [ ] Data appears in Supabase database
- [ ] Email/webhook notification sent (if configured)
- [ ] Success message and sound play
- [ ] Form resets after submission
- [ ] Error handling works properly

## Common Issues & Solutions

### Issue: Feedback not appearing in database
- **Check**: Is the feedback table created?
- **Check**: Are RLS policies properly set?
- **Solution**: Re-run the SQL setup script

### Issue: Modal not opening
- **Check**: Browser console for JavaScript errors
- **Check**: Is the user properly authenticated?
- **Solution**: Clear browser cache and reload

### Issue: Webhook not receiving data
- **Check**: Is `FEEDBACK_WEBHOOK_URL` set in `.env`?
- **Check**: Server logs for webhook errors
- **Solution**: Test webhook URL with curl/Postman

## SQL Queries for Monitoring

```sql
-- View all feedback
SELECT * FROM feedback ORDER BY created_at DESC;

-- View feedback by type
SELECT feedback_type, COUNT(*) 
FROM feedback 
GROUP BY feedback_type;

-- View recent feedback (last 7 days)
SELECT * FROM feedback 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- View feedback from specific user
SELECT * FROM feedback 
WHERE user_id = 'user-uuid-here';
```