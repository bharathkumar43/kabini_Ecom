const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kabini_ai',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function checkToken(token) {
  const client = await pool.connect();
  
  try {
    console.log(`🔍 Checking token: ${token.substring(0, 10)}...`);
    
    // Check if token exists at all
    const allTokensResult = await client.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1',
      [token]
    );
    
    if (allTokensResult.rows.length === 0) {
      console.log('❌ Token does not exist in database');
      return {
        exists: false,
        status: 'NOT_FOUND',
        message: 'Token does not exist in database'
      };
    }
    
    const tokenData = allTokensResult.rows[0];
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    const isExpired = expiresAt < now;
    const isUsed = tokenData.used;
    
    console.log('📊 Token Information:');
    console.log(`  - Token: ${token.substring(0, 10)}...`);
    console.log(`  - User ID: ${tokenData.user_id}`);
    console.log(`  - Created: ${tokenData.created_at}`);
    console.log(`  - Expires: ${tokenData.expires_at}`);
    console.log(`  - Used: ${tokenData.used}`);
    console.log(`  - Current Time: ${now.toISOString()}`);
    console.log(`  - Is Expired: ${isExpired}`);
    console.log(`  - Is Used: ${isUsed}`);
    
    let status = 'UNKNOWN';
    let message = '';
    
    if (isUsed) {
      status = 'USED';
      message = 'Token has already been used to reset password';
    } else if (isExpired) {
      status = 'EXPIRED';
      message = 'Token has expired (older than 1 hour)';
    } else {
      status = 'VALID';
      message = 'Token is valid and can be used';
    }
    
    console.log(`\n🎯 Result: ${status}`);
    console.log(`📝 Message: ${message}`);
    
    return {
      exists: true,
      status: status,
      message: message,
      tokenData: {
        user_id: tokenData.user_id,
        created_at: tokenData.created_at,
        expires_at: tokenData.expires_at,
        used: tokenData.used,
        is_expired: isExpired
      }
    };
    
  } finally {
    client.release();
  }
}

// Get token from command line argument
const token = process.argv[2];

if (!token) {
  console.log('❌ Please provide a token to check');
  console.log('Usage: node check-token.js <your-token>');
  process.exit(1);
}

checkToken(token)
  .then(result => {
    console.log('\n📋 Summary:');
    console.log(`Status: ${result.status}`);
    console.log(`Message: ${result.message}`);
    
    if (result.status === 'VALID') {
      console.log('\n✅ You can use this token to reset your password!');
    } else {
      console.log('\n❌ You need to request a new password reset.');
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error checking token:', error);
    process.exit(1);
  });
