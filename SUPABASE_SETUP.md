# Supabase Setup Guide

This guide explains how to configure Supabase authentication for Fera Search.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- A Supabase project created

## Configuration Steps

### 1. Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### 2. Update app.js

Open `app.js` and find these lines near the top:

```javascript
/* ===== Supabase Config ===== */
var SUPABASE_URL = "https://YOUR_SUPABASE_URL.supabase.co";
var SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Replace with your actual credentials:

```javascript
/* ===== Supabase Config ===== */
var SUPABASE_URL = "https://xxxxx.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGc...your-actual-key";
```

### 3. Configure Email Authentication in Supabase

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize the "Confirm signup" template

### 4. Configure Email Settings

1. Go to **Settings** → **Auth**
2. Enable **Email Confirmations** if you want users to verify their email
3. Set **Site URL** to your deployment URL (e.g., `https://yourdomain.com`)

### 5. (Optional) Set Up Custom SMTP

For production use, configure a custom SMTP server:

1. Go to **Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Configure your SMTP provider (e.g., SendGrid, Mailgun, AWS SES)

## Authentication Flow

### Sign Up
1. User enters email and password
2. Supabase sends a verification email with a 6-digit OTP
3. User enters the OTP to verify their account
4. User is logged in

### Sign In
1. User enters email and password
2. If credentials are correct, user is logged in immediately
3. Session is stored and persists across page reloads

## Fallback Mode

If Supabase is not configured (empty credentials in app.js):
- Authentication features are disabled
- Users will see an alert prompting them to configure Supabase
- Search functionality continues to work without authentication
- Local history still works when enabled

**Important**: For security reasons, there is no localStorage-based authentication fallback. Supabase configuration is required for user authentication.

## Security Considerations

1. **Never commit credentials to git** - Use environment variables in production
2. **Enable Row Level Security (RLS)** in Supabase for any database tables
3. **Set up proper CORS** in Supabase project settings
4. **Use HTTPS** in production for secure transmission

## Testing

To test authentication:

1. Open the app in a browser
2. Click "Sign in" button
3. Enter email and password (min 6 characters)
4. Click "Sign Up" for new users or "Sign In" for existing users
5. For sign up, check email for verification code and enter it

## Troubleshooting

### Email not received
- Check spam folder
- Verify SMTP settings in Supabase
- Check Supabase logs for errors

### "Supabase client not initialized" warning
- Verify Supabase library is loaded from CDN
- Check browser console for errors
- Verify credentials are correct

### Sign in fails
- Check browser console for detailed error messages
- Verify user exists in Supabase Auth dashboard
- Check if email is verified (if required)

## Environment Variables (Production)

For production deployments, use environment variables:

```javascript
var SUPABASE_URL = process.env.SUPABASE_URL || "https://YOUR_SUPABASE_URL.supabase.co";
var SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";
```

Or use a build tool to inject these at build time.
