# Supabase Feedback Email Notifications Setup

This guide explains how to set up email notifications when feedback is submitted through the Weekly Planner app.

## Option 1: Using Supabase Database Webhooks (Recommended)

### Step 1: Create a Database Function

Run this SQL in your Supabase SQL Editor:

```sql
-- Create a function to send feedback notification
CREATE OR REPLACE FUNCTION notify_feedback_submission()
RETURNS trigger AS $$
DECLARE
  feedback_info JSONB;
BEGIN
  -- Prepare feedback information
  feedback_info := jsonb_build_object(
    'id', NEW.id,
    'feedback_type', NEW.feedback_type,
    'subject', NEW.subject,
    'message', NEW.message,
    'name', COALESCE(NEW.name, 'Anonymous'),
    'email', COALESCE(NEW.email, 'Not provided'),
    'created_at', NEW.created_at,
    'page_url', NEW.page_url
  );
  
  -- Send notification via pg_net (HTTP request)
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails', -- Or your preferred email service
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.resend_api_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'Weekly Planner <noreply@your-domain.com>',
      'to', ['admin@your-domain.com'], -- Replace with your admin email
      'subject', 'New Feedback: ' || NEW.feedback_type || ' - ' || NEW.subject,
      'html', format(
        '<h2>New Feedback Received</h2>
        <p><strong>Type:</strong> %s</p>
        <p><strong>Subject:</strong> %s</p>
        <p><strong>Message:</strong></p>
        <blockquote>%s</blockquote>
        <p><strong>From:</strong> %s (%s)</p>
        <p><strong>Page:</strong> %s</p>
        <p><strong>Submitted:</strong> %s</p>
        <hr>
        <p><a href="https://app.supabase.com/project/%s/editor/feedback?id=%s">View in Supabase</a></p>',
        NEW.feedback_type,
        NEW.subject,
        NEW.message,
        COALESCE(NEW.name, 'Anonymous'),
        COALESCE(NEW.email, 'Not provided'),
        COALESCE(NEW.page_url, 'Unknown'),
        NEW.created_at,
        current_setting('app.supabase_project_ref', true),
        NEW.id
      )
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function on new feedback
CREATE TRIGGER on_feedback_created
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION notify_feedback_submission();
```

### Step 2: Set Database Configuration

Set your email service API key and project reference:

```sql
-- Set your email service API key (e.g., Resend, SendGrid, etc.)
ALTER DATABASE postgres SET "app.resend_api_key" = 'your-api-key-here';

-- Set your Supabase project reference (from your project URL)
ALTER DATABASE postgres SET "app.supabase_project_ref" = 'your-project-ref';
```

### Step 3: Enable pg_net Extension (if not already enabled)

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

## Option 2: Using Supabase Edge Functions

### Step 1: Create an Edge Function

Create a new Edge Function called `feedback-notification`:

```typescript
// supabase/functions/feedback-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')

serve(async (req) => {
  try {
    const { record } = await req.json()
    
    // Send email using Resend (or your preferred service)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Weekly Planner <noreply@your-domain.com>',
        to: [ADMIN_EMAIL],
        subject: `New Feedback: ${record.feedback_type} - ${record.subject}`,
        html: `
          <h2>New Feedback Received</h2>
          <p><strong>Type:</strong> ${record.feedback_type}</p>
          <p><strong>Subject:</strong> ${record.subject}</p>
          <p><strong>Message:</strong></p>
          <blockquote>${record.message}</blockquote>
          <p><strong>From:</strong> ${record.name || 'Anonymous'} (${record.email || 'Not provided'})</p>
          <p><strong>Submitted:</strong> ${new Date(record.created_at).toLocaleString()}</p>
        `,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

### Step 2: Deploy the Edge Function

```bash
supabase functions deploy feedback-notification
```

### Step 3: Set Environment Variables

```bash
supabase secrets set RESEND_API_KEY=your-resend-api-key
supabase secrets set ADMIN_EMAIL=admin@your-domain.com
```

### Step 4: Create Database Webhook

In Supabase Dashboard:
1. Go to Database → Webhooks
2. Create a new webhook:
   - Name: `feedback-notification`
   - Table: `feedback`
   - Events: `Insert`
   - Type: `Supabase Edge Function`
   - Edge Function: `feedback-notification`

## Option 3: Using Node.js Backend (Current Implementation)

If you prefer to handle email notifications in your Node.js backend, you can use Nodemailer or any email service SDK:

### Install Dependencies

```bash
npm install nodemailer
# or
npm install @sendgrid/mail
# or
npm install resend
```

### Update server-supabase.js

Replace the TODO comment in the feedback endpoint with:

```javascript
// Using Nodemailer
const nodemailer = require('nodemailer');

// Create transporter (configure with your email service)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// In the feedback endpoint, after successful database insert:
try {
    await transporter.sendMail({
        from: '"Weekly Planner" <noreply@your-domain.com>',
        to: process.env.ADMIN_EMAIL,
        subject: `New Feedback: ${feedback_type} - ${subject}`,
        html: `
            <h2>New Feedback Received</h2>
            <p><strong>Type:</strong> ${feedback_type}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <blockquote>${message}</blockquote>
            <p><strong>From:</strong> ${name || 'Anonymous'} (${email || 'Not provided'})</p>
            <p><strong>User ID:</strong> ${req.user.id}</p>
            <p><strong>Page:</strong> ${page_url || 'Unknown'}</p>
            <p><strong>Submitted:</strong> ${new Date().toISOString()}</p>
        `
    });
} catch (emailError) {
    console.error('Failed to send notification email:', emailError);
    // Don't fail the request if email fails
}
```

### Required Environment Variables

Add to your `.env` file:

```env
# For SMTP (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@your-domain.com

# Or for SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
ADMIN_EMAIL=admin@your-domain.com

# Or for Resend
RESEND_API_KEY=your-resend-api-key
ADMIN_EMAIL=admin@your-domain.com
```

## Testing Email Notifications

1. Submit test feedback through the app
2. Check your admin email inbox
3. Verify the email contains all feedback details
4. Test with different feedback types

## Monitoring

You can monitor feedback submissions by:
1. Checking the Supabase Dashboard → Table Editor → feedback table
2. Setting up alerts for failed email deliveries
3. Creating a dashboard view for feedback statistics

## Security Notes

- Never expose email API keys in frontend code
- Use environment variables for all sensitive configuration
- Consider rate limiting feedback submissions to prevent spam
- Validate and sanitize all feedback content before sending emails