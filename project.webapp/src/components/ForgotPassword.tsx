import React, { useState } from 'react';
import { User, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEmojiBlocking } from '../utils/useEmojiBlocking';
import { validateProfessionalEmail, getEmailValidationMessage, formatEmail } from '../utils/emailValidation';
import ErrorNotification from './ui/ErrorNotification';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailValidationError, setEmailValidationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // Enhanced emoji blocking hook
  const { handleInputChangeAggressive: handleEmojiFilteredInput, handlePaste, handleKeyDown } = useEmojiBlocking();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formattedEmail = formatEmail(value);
    setEmail(formattedEmail);
    
    // Real-time email validation - show red alert box for errors
    if (!formattedEmail.trim()) {
      setEmailValidationError(null); // Clear error when field is empty
    } else {
      const emailValidation = validateProfessionalEmail(formattedEmail);
      if (!emailValidation.isValid) {
        setEmailValidationError(getEmailValidationMessage(formattedEmail, emailValidation));
      } else {
        setEmailValidationError(null); // Clear error when email is valid
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[ForgotPassword] Form submitted, clearing previous errors');
    setError('');
    
    // Validate email field
    if (!email || !email.trim()) {
      console.log('[ForgotPassword] Email is empty, setting validation error');
      setEmailValidationError('Please enter your email address');
      return;
    }

    // Use comprehensive Gmail email validation
    try {
      const emailValidation = validateProfessionalEmail(email);
      if (!emailValidation || !emailValidation.isValid) {
        console.log('[ForgotPassword] Email validation failed, setting validation error');
        setEmailValidationError(getEmailValidationMessage(email, emailValidation));
        return;
      }
    } catch (validationError) {
      console.log('[ForgotPassword] Email validation error:', validationError);
      setEmailValidationError('Please enter a valid email address');
      return;
    }

    console.log('[ForgotPassword] Starting API call to forgot-password endpoint');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();
      console.log('[ForgotPassword] Response:', response.status, data);

      if (response.ok) {
        console.log('[ForgotPassword] Password reset email sent successfully');
        setSubmitted(true);
      } else {
        console.error('[ForgotPassword] Failed to send reset email:', data.error);
        setError(data.error || 'Failed to send reset email. Please try again.');
      }
      
    } catch (error: any) {
      console.error('[ForgotPassword] Error during forgot password request:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 relative overflow-hidden">
      {/* Enhanced background gradient */}
      <div className="absolute inset-0 bg-gray-200/30"></div>
      <div className="absolute inset-0 bg-gray-300/20"></div>
      
      {/* Animation Style 1: Floating Orbs with Pulse */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/40 to-cyan-400/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-purple-400/40 to-pink-400/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-r from-indigo-400/35 to-blue-400/35 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{animationDelay: '2s'}}></div>
      
      {/* Animation Style 2: Bouncing Elements */}
      <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-cyan-300/30 to-blue-300/30 rounded-full blur-2xl animate-bounce" style={{animationDelay: '0.5s'}}></div>
      <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-gradient-to-br from-purple-300/30 to-pink-300/30 rounded-full blur-2xl animate-bounce" style={{animationDelay: '1.5s'}}></div>
      
      <div className="w-full max-w-md mx-auto p-8 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 relative z-10 bg-gradient-to-br from-white/95 via-white/90 to-white/95">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <User className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-black mb-3">Forgot your password?</h1>
          <p className="text-gray-600 text-lg">Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        {submitted ? (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <div className="text-green-600 font-semibold mb-2">Check your email</div>
              <div className="text-gray-600 text-sm">
                If an account with that email exists, a reset link has been sent to <strong>{email}</strong>.
              </div>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-black text-white font-bold py-4 px-6 rounded-xl hover:bg-gray-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg transform hover:scale-[1.02]"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">Email <span className="text-red-600">*</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                  const formattedEmail = formatEmail(value);
                  setEmail(formattedEmail);
                  // Trigger validation after paste
                  const emailValidation = validateProfessionalEmail(formattedEmail);
                  if (!emailValidation.isValid) {
                    setEmailValidationError(getEmailValidationMessage(formattedEmail, emailValidation));
                  } else {
                    setEmailValidationError(null); // Clear error when email is valid
                  }
                })}
                onPaste={(e) => handlePaste(e, (value) => {
                  const formattedEmail = formatEmail(value);
                  setEmail(formattedEmail);
                  // Trigger validation after paste - show red alert box for errors
                  const emailValidation = validateProfessionalEmail(formattedEmail);
                  if (!emailValidation.isValid) {
                    setEmailValidationError(getEmailValidationMessage(formattedEmail, emailValidation));
                  } else {
                    setEmailValidationError(null); // Clear error when email is valid
                  }
                })}
                              onKeyDown={handleKeyDown}
              onCompositionStart={(e) => e.preventDefault()}
              onCompositionUpdate={(e) => e.preventDefault()}
              onCompositionEnd={(e) => e.preventDefault()}
              required
              placeholder="Enter your email address *"
              className={`w-full px-4 py-4 border-2 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all ${
                emailValidationError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
              }`}
              />
              
              {/* Simple Red Text for Email Validation Errors */}
              {emailValidationError && (
                <div className="mt-2 text-sm text-red-600">
                  Please enter valid email address
                </div>
              )}
            </div>
            

            
            <button
              type="submit"
              disabled={isLoading || !!emailValidationError}
              className="w-full bg-black text-white font-bold py-4 px-6 rounded-xl hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transform hover:scale-[1.02]"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full bg-black text-white font-bold py-4 px-6 rounded-xl hover:bg-gray-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg transform hover:scale-[1.02]"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Login
            </button>
          </form>
        )}
      </div>
      
      {/* Error Notification Toggle */}
      <ErrorNotification
        error={error}
        onClose={() => setError(null)}
        autoClose={true}
        autoCloseDelay={5000}
        type="error"
      />
    </div>
  );
};

export default ForgotPassword; 