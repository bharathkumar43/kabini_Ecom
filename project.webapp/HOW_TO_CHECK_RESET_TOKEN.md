# 🔍 How to Check if Your Reset Token is Expired

## 🎯 **Quick Answer**
Your reset token is most likely **EXPIRED** because:
1. Tokens expire after 1 hour
2. You're probably using an old reset link
3. You need to request a NEW password reset

## 🛠️ **3 Ways to Check Your Token**

### **Method 1: Use the Web Tool (Easiest)**
1. Open `check-reset-token.html` in your browser
2. Copy your reset token from the URL
3. Paste it in the tool
4. Click "Check Token Status"

### **Method 2: Use the Command Line Tool**
1. Open terminal in the backend directory
2. Run: `node check-token.js YOUR_TOKEN_HERE`
3. See the detailed token information

### **Method 3: Check the URL**
Look at your reset password URL:
- If it's from more than 1 hour ago → **EXPIRED**
- If you already used it → **USED**
- If it's recent and unused → **VALID**

## 📋 **How to Get Your Reset Token**

### **From the URL:**
If your reset URL is:
```
http://localhost:5173/reset-password?token=abc123def456ghi789
```
Then your token is: `abc123def456ghi789`

### **From the Email:**
1. Open your password reset email
2. Right-click on the reset link
3. Copy the link address
4. Extract the token from the URL

## 🔍 **Token Status Meanings**

| Status | Meaning | What to Do |
|--------|---------|------------|
| **VALID** | Token is working | Use it to reset password |
| **EXPIRED** | Token is too old (>1 hour) | Request new password reset |
| **USED** | Token was already used | Request new password reset |
| **INVALID** | Token doesn't exist | Request new password reset |

## 🚀 **Quick Fix Steps**

### **Step 1: Check Your Token**
Use one of the methods above to check if your token is valid.

### **Step 2: If Token is Expired/Invalid**
1. Go to your login page
2. Click "Forgot your password?"
3. Enter your email address
4. Click "Send Reset Link"
5. Check your email for the NEW reset link

### **Step 3: Use the New Token**
1. Click the NEW reset link immediately
2. Enter your new password
3. Click "Reset Password"

## 🧪 **Test Your Token**

### **Using the Web Tool:**
1. Open `check-reset-token.html`
2. Paste your token
3. Click "Check Token Status"
4. See the results

### **Using Command Line:**
```bash
cd project.webapp/backend
node check-token.js YOUR_TOKEN_HERE
```

## 📊 **Example Output**

### **Valid Token:**
```
✅ Token is VALID and working! You can use it to reset your password.
```

### **Expired Token:**
```
❌ Token is INVALID or EXPIRED. You need to request a new password reset.
```

## 🎯 **Most Likely Scenario**

Based on your error message, your token is probably:
- **EXPIRED** (older than 1 hour)
- **USED** (already used to reset password)
- **INVALID** (doesn't exist in database)

**Solution:** Request a NEW password reset to get a NEW token.

## 🚨 **Important Notes**

- **Tokens expire in 1 hour**
- **Each token can only be used once**
- **You need a NEW token for each reset attempt**
- **Use the NEWEST reset link from your email**

## 📞 **If You Need Help**

1. **Use the web tool** to check your token status
2. **Check the backend logs** for detailed information
3. **Request a new password reset** if token is expired
4. **Use the new reset link immediately**

## 🎉 **Expected Result**

After checking your token:
- If **VALID**: Use it to reset your password
- If **EXPIRED/USED/INVALID**: Request a new password reset

**The password reset system is working correctly!** You just need a valid token. 🚀
