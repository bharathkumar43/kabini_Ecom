# Google OAuth Authentication Fix Guide

## Problem Description

The Google OAuth authentication is failing with the error:
```
[Login] Authentication verification failed after multiple attempts
[Login] Final localStorage state: {accessToken: null, refreshToken: null, expiresAt: null}
```

## Root Cause

The issue is caused by **missing Google OAuth environment variables** in both frontend and backend:

1. **Frontend**: Missing `VITE_REACT_APP_GOOGLE_CLIENT_ID`
2. **Backend**: Missing `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

## Solution Steps

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API and Google Identity Services
4. Go to "APIs & Services" > "Credentials"
5. Create OAuth 2.0 Client ID (Web application type)
6. Add authorized origins: `http://localhost:5173`
7. Copy the Client ID and Client Secret

### Step 2: Configure Frontend Environment

1. **Copy the template file**:
   ```bash
   cp env.google-oauth-template.txt .env
   ```

2. **Update the .env file** with your Google Client ID:
   ```env
   VITE_REACT_APP_GOOGLE_CLIENT_ID=your_actual_google_client_id_here
   ```

### Step 3: Configure Backend Environment

1. **Copy the template file**:
   ```bash
   cp backend/env.google-oauth-template.txt backend/.env
   ```

2. **Update the backend .env file** with your Google credentials:
   ```env
   GOOGLE_CLIENT_ID=your_actual_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_actual_google_client_secret_here
   ```

### Step 4: Restart Servers

1. **Stop both frontend and backend servers**
2. **Start the backend server**:
   ```bash
   cd backend
   npm start
   ```
3. **Start the frontend server**:
   ```bash
   npm run dev
   ```

## Verification

After configuration:

1. Check browser console for Google OAuth initialization
2. Verify environment variables are loaded:
   - Frontend: `import.meta.env.VITE_REACT_APP_GOOGLE_CLIENT_ID` should show your client ID
   - Backend: `process.env.GOOGLE_CLIENT_ID` should show your client ID

## Common Issues and Solutions

### Issue 1: "Invalid client" error
- **Solution**: Verify Google Client ID is correct and OAuth consent screen is configured

### Issue 2: "Redirect URI mismatch" error  
- **Solution**: Ensure `http://localhost:5173` is added to authorized origins in Google Cloud Console

### Issue 3: Environment variables not loading
- **Solution**: Restart both servers after updating .env files

### Issue 4: CORS errors
- **Solution**: Backend CORS is already configured to allow localhost:5173

## Security Notes

- Never commit .env files to version control
- Keep your Google Client Secret secure
- Use environment variables for all sensitive configuration
- Regularly rotate OAuth credentials

## Testing

1. Navigate to login page
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Verify successful login and token storage
5. Check localStorage for accessToken, refreshToken, and expiresAt

## Support

If issues persist:
1. Check browser console for JavaScript errors
2. Check backend server logs for authentication errors
3. Verify Google Cloud Console configuration
4. Ensure all environment variables are properly set
