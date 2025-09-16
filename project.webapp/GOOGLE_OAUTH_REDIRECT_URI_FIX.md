# Google OAuth Redirect URI Mismatch Fix

## Error Description
You're getting this error:
```
Access blocked: This app's request is invalid
Error 400: redirect_uri_mismatch
```

## Root Cause
The redirect URI in your Google Cloud Console doesn't match what your application is sending.

## Immediate Fix Applied
I've already fixed the code by adding the missing `redirect_uri` parameter in the Google OAuth client configuration.

## Complete Fix Steps

### Step 1: Update Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Find your OAuth 2.0 Client ID and click on it
4. In the "Authorized redirect URIs" section, add these URLs:
   ```
   http://localhost:5173
   http://localhost:3000
   http://localhost:5173/
   http://localhost:3000/
   ```
5. Click "Save"

### Step 2: Verify Environment Variables

Make sure you have these environment variables set:

**Frontend (.env file):**
```env
VITE_REACT_APP_GOOGLE_CLIENT_ID=your_actual_google_client_id_here
```

**Backend (backend/.env file):**
```env
GOOGLE_CLIENT_ID=your_actual_google_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret_here
```

### Step 3: Restart Servers

1. Stop both frontend and backend servers
2. Start backend: `cd backend && npm start`
3. Start frontend: `npm run dev`

### Step 4: Test the Fix

1. Navigate to login page
2. Click "Sign in with Google"
3. Complete the OAuth flow
4. Verify successful login

## Code Changes Made

I've updated the Google OAuth client configuration in `src/services/authService.ts`:

```typescript
// Before (causing the error):
const client = (window as any).google.accounts.oauth2.initTokenClient({
  client_id: import.meta.env.VITE_REACT_APP_GOOGLE_CLIENT_ID || '',
  scope: 'openid profile email',
  prompt: 'select_account',
  callback: async (response: any) => {

// After (fixed):
const client = (window as any).google.accounts.oauth2.initTokenClient({
  client_id: import.meta.env.VITE_REACT_APP_GOOGLE_CLIENT_ID || '',
  scope: 'openid profile email',
  redirect_uri: window.location.origin,  // ← This was missing!
  prompt: 'select_account',
  callback: async (response: any) => {
```

## Why This Fixes the Issue

1. **Missing redirect_uri**: The OAuth client wasn't specifying where to redirect after authentication
2. **Google's security**: Google requires exact URI matching for security
3. **Dynamic origin**: Using `window.location.origin` ensures the redirect URI matches your current domain

## Common Redirect URI Patterns

For development, use:
- `http://localhost:5173` (Vite default)
- `http://localhost:3000` (Create React App default)

For production, use your actual domain:
- `https://yourdomain.com`
- `https://app.yourdomain.com`

## Verification

After applying the fix:
1. Check browser console - no more redirect URI errors
2. Google OAuth popup should work correctly
3. Authentication flow should complete successfully
4. Tokens should be stored in localStorage

## If Issues Persist

1. **Clear browser cache and cookies**
2. **Check Google Cloud Console** - ensure redirect URIs are exactly matched
3. **Verify environment variables** are loaded correctly
4. **Check server logs** for any backend authentication errors
