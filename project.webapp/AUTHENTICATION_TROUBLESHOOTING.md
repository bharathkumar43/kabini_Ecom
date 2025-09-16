# Authentication Troubleshooting Guide

## Overview
This guide helps resolve authentication issues in the Kabini.ai application. The application supports three authentication methods:
1. **Local Authentication** (email/password)
2. **Google OAuth**
3. **Microsoft Azure AD**

## Common Error: "AuthContext: Login failed: Error: cancelled"

This error typically occurs when:
- Environment variables are not properly configured
- OAuth providers are not set up correctly
- Database connection issues
- Missing JWT configuration

## Quick Fix Steps

### 1. Run the Setup Script
```bash
# Windows (Command Prompt)
setup-auth.bat

# Windows (PowerShell)
.\setup-auth.ps1
```

### 2. Configure Environment Variables

#### Frontend (.env file)
```bash
# API Configuration
VITE_REACT_APP_API_URL=http://localhost:5000/api

# Google OAuth
VITE_REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here

# Microsoft Azure AD
VITE_REACT_APP_AZURE_CLIENT_ID=your_azure_client_id_here
VITE_REACT_APP_AZURE_TENANT_ID=your_azure_tenant_id_here
VITE_REACT_APP_REDIRECT_URI=http://localhost:5173
```

#### Backend (backend/.env file)
```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Authentication
AUTH_TYPE=local
ENABLE_LOCAL_AUTH=true

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=kabini_ai
DB_PASSWORD=password
DB_PORT=5432

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Azure AD
AZURE_CLIENT_ID=your_azure_client_id_here
AZURE_TENANT_ID=your_azure_tenant_id_here
AZURE_CLIENT_SECRET=your_azure_client_secret_here
```

## Detailed Troubleshooting

### Issue 1: "Google OAuth client ID not configured"
**Solution**: Set `VITE_REACT_APP_GOOGLE_CLIENT_ID` in your frontend `.env` file

**Steps to get Google OAuth credentials**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
5. Set Application Type to "Web application"
6. Add authorized redirect URIs: `http://localhost:5173`
7. Copy the Client ID and Client Secret

### Issue 2: "Azure Client ID not configured"
**Solution**: Set `VITE_REACT_APP_AZURE_CLIENT_ID` and `VITE_REACT_APP_AZURE_TENANT_ID` in your frontend `.env` file

**Steps to get Azure AD credentials**:
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory → App registrations
3. Click "New registration"
4. Set Application type to "Single tenant"
5. Add redirect URI: `http://localhost:5173`
6. Copy the Application (client) ID and Directory (tenant) ID
7. Go to Certificates & secrets → New client secret

### Issue 3: "JWT_SECRET is not set"
**Solution**: Set `JWT_SECRET` in your backend `.env` file

**Generate a secure JWT secret**:
```bash
# Option 1: Use Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Option 2: Use online generator
# Visit: https://generate-secret.vercel.app/64
```

### Issue 4: Database Connection Issues
**Solution**: Ensure PostgreSQL is running and accessible

**Check database connection**:
```bash
# Test connection
psql -h localhost -U postgres -d kabini_ai

# If database doesn't exist, create it
createdb -h localhost -U postgres kabini_ai

# Run setup script
cd backend
.\setup-postgresql.bat
```

### Issue 5: "Authentication failed" with specific status codes

#### Status 401: Unauthorized
- Check if user exists in database
- Verify password for local authentication
- Check if OAuth tokens are valid

#### Status 404: Not Found
- User doesn't exist (for local auth)
- Check database connection
- Verify user creation process

#### Status 500: Server Error
- Check backend logs for detailed error
- Verify environment variables
- Check database schema

## Testing Authentication

### Test Local Authentication
```bash
# Create test user
cd backend
node create-test-user.js

# Test login
node test-auth-logs.js
```

### Test Google OAuth
```bash
# Test Google authentication
cd backend
node test-google-oauth.js
```

### Test Microsoft Authentication
```bash
# Test Microsoft authentication
cd backend
node test-microsoft-auth.js
```

## Environment Variable Reference

### Frontend Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_REACT_APP_API_URL` | Backend API URL | Yes |
| `VITE_REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth Client ID | For Google auth |
| `VITE_REACT_APP_AZURE_CLIENT_ID` | Azure AD Client ID | For Microsoft auth |
| `VITE_REACT_APP_AZURE_TENANT_ID` | Azure AD Tenant ID | For Microsoft auth |

### Backend Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | JWT signing secret | Yes |
| `DB_HOST` | Database host | Yes |
| `DB_NAME` | Database name | Yes |
| `DB_USER` | Database user | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | For Google auth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | For Google auth |
| `AZURE_CLIENT_ID` | Azure AD Client ID | For Microsoft auth |
| `AZURE_TENANT_ID` | Azure AD Tenant ID | For Microsoft auth |
| `AZURE_CLIENT_SECRET` | Azure AD Client Secret | For Microsoft auth |

## Logs and Debugging

### Enable Debug Logging
The application includes comprehensive logging. Check console output for:
- `[AuthService]` - Frontend authentication logs
- `[Server]` - Backend authentication logs
- `[Auth]` - Authentication middleware logs

### Common Log Patterns
```
✅ [AuthService] Google OAuth successful, got access token
✅ [Server] User created/updated in database successfully
✅ [Server] Tokens generated successfully
❌ [AuthService] Google OAuth error: access_denied
❌ [Server] Missing required fields
```

## Still Having Issues?

1. **Check all environment variables** are set correctly
2. **Verify OAuth provider configuration** in their respective consoles
3. **Check database connection** and schema
4. **Review browser console** for JavaScript errors
5. **Check backend logs** for detailed error messages
6. **Ensure ports are not blocked** (5000 for backend, 5173 for frontend)

## Support

If you continue to experience issues:
1. Check the logs for specific error messages
2. Verify your OAuth provider configuration
3. Ensure all environment variables are properly set
4. Test with the provided test scripts
5. Check database connectivity and schema
