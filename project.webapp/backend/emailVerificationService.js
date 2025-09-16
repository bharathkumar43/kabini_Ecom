const crypto = require('crypto');
const emailService = require('./emailService');

class EmailVerificationService {
  constructor() {
    this.verificationTokens = new Map(); // In production, use Redis or database
  }

  // Generate verification token
  generateVerificationToken(email) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry
    
    this.verificationTokens.set(token, {
      email,
      expiresAt,
      verified: false
    });
    
    return token;
  }

  // Verify token
  verifyToken(token) {
    const tokenData = this.verificationTokens.get(token);
    
    if (!tokenData) {
      return { valid: false, error: 'Invalid verification token' };
    }
    
    if (new Date() > tokenData.expiresAt) {
      this.verificationTokens.delete(token);
      return { valid: false, error: 'Verification token has expired' };
    }
    
    tokenData.verified = true;
    return { valid: true, email: tokenData.email };
  }

  // Send verification email
  async sendVerificationEmail(email, name, token) {
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
    
    const emailContent = {
      to: email,
      subject: 'Verify Your Email Address - kabini.ai',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Welcome to kabini.ai!</h1>
          </div>
          
          <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-top: 0;">Hi ${name},</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Thank you for creating an account with kabini.ai! To complete your registration and start using our platform, 
              please verify your email address by clicking the button below.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
              If the button doesn't work, you can also copy and paste this link into your browser:
            </p>
            <p style="color: #2563eb; font-size: 14px; word-break: break-all; margin-top: 5px;">
              ${verificationLink}
            </p>
          </div>
          
          <div style="text-align: center; color: #64748b; font-size: 14px;">
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create an account with kabini.ai, please ignore this email.</p>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center; color: #64748b; font-size: 12px;">
            <p>© 2024 kabini.ai. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
        Welcome to kabini.ai!
        
        Hi ${name},
        
        Thank you for creating an account with kabini.ai! To complete your registration and start using our platform, 
        please verify your email address by visiting the following link:
        
        ${verificationLink}
        
        This verification link will expire in 24 hours.
        
        If you didn't create an account with kabini.ai, please ignore this email.
        
        Best regards,
        The kabini.ai Team
      `
    };

    try {
      const result = await emailService.sendEmail(emailContent);
      return { success: true, result };
    } catch (error) {
      console.error('❌ [EmailVerification] Failed to send verification email:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if email domain is valid (basic check)
  async validateEmailDomain(email) {
    const domain = email.split('@')[1];
    
    // List of known disposable email domains
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com',
      'temp-mail.org', 'throwaway.email', 'getnada.com', 'maildrop.cc',
      'sharklasers.com', 'guerrillamailblock.com', 'pokemail.net', 'spam4.me',
      'bccto.me', 'chacuo.net', 'dispostable.com', 'mailnesia.com',
      'mailcatch.com', 'inboxalias.com', 'mailmetrash.com', 'trashmail.net'
    ];
    
    if (disposableDomains.includes(domain.toLowerCase())) {
      return { valid: false, error: 'Disposable email addresses are not allowed' };
    }
    
    // Basic domain validation
    if (!domain || domain.length < 3) {
      return { valid: false, error: 'Invalid email domain' };
    }
    
    return { valid: true };
  }

  // Clean up expired tokens
  cleanupExpiredTokens() {
    const now = new Date();
    for (const [token, data] of this.verificationTokens.entries()) {
      if (now > data.expiresAt) {
        this.verificationTokens.delete(token);
      }
    }
  }
}

module.exports = new EmailVerificationService();
