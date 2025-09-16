# Password Reset "Invalid or expired reset token" Error - Troubleshooting Guide

## 🚨 **Error: "Invalid or expired reset token"**

This error occurs when the password reset token cannot be validated. Here are the most common causes and solutions:

## 🔍 **Common Causes & Solutions**

### **1. Token Has Expired (Most Common)**
**Cause**: Reset tokens expire after 1 hour for security reasons.
**Solution**: 
- Request a new password reset
- Check the time between token generation and usage
- Ensure you're using the token within 1 hour

### **2. Token Has Already Been Used**
**Cause**: Each reset token can only be used once.
**Solution**:
- Request a new password reset
- Don't refresh the reset page after successful password change

### **3. Database Connection Issues**
**Cause**: Backend cannot connect to PostgreSQL database.
**Solution**:
```bash
# Check if PostgreSQL is running
# Windows: Check Services
# Linux/Mac: sudo systemctl status postgresql

# Check database connection
cd backend
node -e "const db = require('./database'); console.log('DB connection test');"
```

### **4. Token Not Properly Saved**
**Cause**: Token generation succeeded but database save failed.
**Solution**:
- Check backend server logs for database errors
- Verify `password_reset_tokens` table exists
- Check database permissions

### **5. URL Encoding Issues**
**Cause**: Token gets corrupted during URL transmission.
**Solution**:
- Check if token contains special characters
- Ensure proper URL encoding/decoding
- Copy token directly from email without modifications

### **6. Backend Server Not Running**
**Cause**: Frontend cannot reach backend API.
**Solution**:
```bash
# Start backend server
cd backend
node server.js

# Check if server is running on port 3001
curl http://localhost:3001/api/auth/forgot-password
```

## 🧪 **Step-by-Step Debugging**

### **Step 1: Check Backend Server**
```bash
# Test if backend is running
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### **Step 2: Check Database Connection**
```bash
# Check if database is accessible
cd backend
node -e "
const db = require('./database');
db.getUserByEmail('test@example.com')
  .then(user => console.log('DB OK:', user ? 'User found' : 'User not found'))
  .catch(err => console.error('DB Error:', err));
"
```

### **Step 3: Test Token Generation**
```bash
# Generate a test token
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

### **Step 4: Test Token Validation**
```bash
# Test token validation (replace TOKEN with actual token)
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN","newPassword":"TestPassword123"}'
```

## 🔧 **Database Troubleshooting**

### **Check if Table Exists**
```sql
-- Connect to your PostgreSQL database
SELECT * FROM password_reset_tokens LIMIT 1;
```

### **Check Token in Database**
```sql
-- Find your token (replace 'your-token-here')
SELECT * FROM password_reset_tokens WHERE token = 'your-token-here';
```

### **Check Token Expiration**
```sql
-- Check if token is expired
SELECT *, 
       expires_at > NOW() as is_valid,
       used as is_used
FROM password_reset_tokens 
WHERE token = 'your-token-here';
```

### **Clean Up Expired Tokens**
```sql
-- Delete expired tokens
DELETE FROM password_reset_tokens 
WHERE expires_at < NOW() OR used = true;
```

## 🐛 **Debug Tools**

### **1. Use the Debug Tool**
Open `debug-password-reset.html` in your browser for interactive debugging.

### **2. Check Backend Logs**
Look for these log messages in your backend console:
```
🔐 [Forgot Password] Request received: { email: 'user@example.com' }
🔑 [Forgot Password] Generating reset token for user: user-id
💾 [Forgot Password] Saving token to database...
🔗 [Forgot Password] Reset link created: http://localhost:5173/reset-password?token=...
```

### **3. Check Frontend Console**
Look for these messages in browser console:
```
[ResetPassword] Token found in URL, showing reset form
[ResetPassword] Attempting to reset password with token: ...
[ResetPassword] Response: 400 { error: 'Invalid or expired reset token' }
```

## ⚙️ **Configuration Issues**

### **Environment Variables**
Check if these are set correctly:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Email (optional for testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### **Database Schema**
Ensure the table exists:
```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🚀 **Quick Fixes**

### **Fix 1: Restart Everything**
```bash
# Stop backend server (Ctrl+C)
# Restart backend
cd backend
node server.js

# Restart frontend
cd ..
npm run dev
```

### **Fix 2: Clear Database**
```sql
-- Clear all reset tokens
DELETE FROM password_reset_tokens;
```

### **Fix 3: Check Token Format**
Ensure token is 64 characters long (32 bytes = 64 hex characters):
```
Example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### **Fix 4: Test with Fresh Token**
1. Generate a new reset token
2. Use it immediately (within 1 hour)
3. Don't refresh the page after using it

## 📊 **Error Codes Reference**

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Invalid or expired reset token" | Token not found, expired, or used | Request new token |
| "Token and new password are required" | Missing parameters | Check form data |
| "Password must be at least 8 characters..." | Weak password | Use stronger password |
| "Failed to reset password. Please try again." | Database error | Check database connection |

## 🎯 **Prevention Tips**

1. **Use tokens quickly** - Don't wait more than 1 hour
2. **Don't refresh pages** - After successful reset, don't refresh
3. **Check email spam** - Reset emails might be in spam folder
4. **Use strong passwords** - Meet all requirements
5. **Keep backend running** - Ensure server stays up during reset process

## 📞 **Still Having Issues?**

If you're still experiencing problems:

1. **Check the debug tool**: `debug-password-reset.html`
2. **Review backend logs** for detailed error messages
3. **Test database connection** manually
4. **Verify environment variables** are set correctly
5. **Check if PostgreSQL is running** and accessible

The most common cause is **token expiration** - try generating a fresh token and using it immediately!
