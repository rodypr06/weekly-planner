# Domain Change Authentication Fix Guide

## Issue
After changing the domain from `task.rodytech.net` to `task.rodytech.ai`, the Supabase authentication is not working with existing database users.

## Root Cause
The authentication failure is likely due to Supabase's security settings that require updating the allowed redirect URLs and site URL configuration when the domain changes.

## Solution Steps

### 1. Update Supabase Dashboard Configuration

Log in to your Supabase dashboard at https://supabase.com/dashboard and navigate to your project:

#### A. Update Authentication Settings
1. Go to **Authentication** → **URL Configuration**
2. Update the following URLs:
   - **Site URL**: `https://task.rodytech.ai`
   - **Redirect URLs**: Add these URLs (remove old .net domain):
     ```
     https://task.rodytech.ai
     https://task.rodytech.ai/*
     https://task.rodytech.ai/auth/callback
     http://localhost:2324/* (for local development)
     ```

#### B. Update Email Templates (if using email authentication)
1. Go to **Authentication** → **Email Templates**
2. Update any references to the old domain in:
   - Confirm signup template
   - Reset password template
   - Magic link template
   - Change email address template

### 2. Clear Browser Cache and Cookies

Since authentication tokens may be cached with the old domain:

1. Clear all cookies for both domains:
   - `task.rodytech.net`
   - `task.rodytech.ai`
2. Clear localStorage and sessionStorage
3. Clear browser cache

### 3. Verify CORS Settings

Check if your server has proper CORS headers for the new domain:

```javascript
// In server-supabase.js or server.js
app.use(cors({
    origin: [
        'https://task.rodytech.ai',
        'http://localhost:3000',
        'http://localhost:2324'
    ],
    credentials: true
}));
```

### 4. Update Environment Variables (if needed)

If you have any environment variables with the domain, update them:

```bash
# .env file
SITE_URL=https://task.rodytech.ai
ALLOWED_ORIGINS=https://task.rodytech.ai
```

### 5. Test Authentication

After making these changes:

1. Try logging in with an existing user
2. Test password reset functionality
3. Test new user registration
4. Check that sessions persist correctly

### 6. Additional Debugging

If authentication still doesn't work, check:

1. **Browser Console**: Look for any CORS errors or authentication errors
2. **Network Tab**: Check if authentication requests are going to the correct Supabase URL
3. **Supabase Logs**: Check the dashboard logs for authentication attempts

### Quick Test Script

You can test authentication directly using this script in the browser console:

```javascript
// Test Supabase connection and auth
(async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log('Current session:', session);
    console.log('Error:', error);
    
    // Try to sign in with test credentials
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'your-test-email@example.com',
        password: 'your-password'
    });
    
    console.log('Sign in result:', data);
    console.log('Sign in error:', signInError);
})();
```

## Common Issues and Solutions

### Issue: "Invalid Site URL" error
**Solution**: Update the Site URL in Supabase dashboard to match your new domain

### Issue: "Redirect URL not allowed" error  
**Solution**: Add your new domain to the allowed redirect URLs list

### Issue: Sessions not persisting
**Solution**: Clear all old domain cookies and localStorage

### Issue: CORS errors
**Solution**: Update server CORS configuration to allow the new domain

## Prevention for Future

1. Use environment variables for domain configuration
2. Document all places where domain is configured
3. Create a domain change checklist
4. Test authentication in staging environment first

## Contact Supabase Support

If none of these solutions work, contact Supabase support with:
- Your project reference: `buvzbxinbrfrfssvyagk`
- The exact error messages you're seeing
- Browser console logs during authentication attempts