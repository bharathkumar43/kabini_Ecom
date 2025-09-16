import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import ErrorNotification from './ui/ErrorNotification';
import PasswordStrengthIndicator from './ui/PasswordStrengthIndicator';
import { useEmojiBlocking } from '../utils/useEmojiBlocking';
import { validateProfessionalEmail, getEmailValidationMessage, formatEmail } from '../utils/emailValidation';

const SignUp = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [validationError, setValidationError] = useState("");
  const [emailValidationError, setEmailValidationError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordOk, setPasswordOk] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [preventAutofill, setPreventAutofill] = useState(true);
  const navigate = useNavigate();
  const { login, error, clearError, isAuthenticated } = useAuth();
  
  // Enhanced emoji blocking hook
  const { handleInputChangeAggressive: handleEmojiFilteredInput, handlePaste, handleKeyDown } = useEmojiBlocking();

  // Effect to prevent autofill by temporarily making fields read-only
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreventAutofill(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Effect to redirect after successful authentication
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Use the AuthContext state instead of checking authService directly
      if (isAuthenticated) {
        console.log('[SignUp] User is authenticated via AuthContext, redirecting to overview...');
        navigate('/overview', { replace: true });
        return;
      }
      
      // Fallback: also check authService directly
      if (authService.isAuthenticated()) {
        console.log('[SignUp] User is authenticated via authService, redirecting to overview...');
        navigate('/overview', { replace: true });
        return;
      }
    };

    // Check immediately
    checkAuthAndRedirect();

    // Set up an interval to check authentication status (more frequent for better responsiveness)
    const interval = setInterval(checkAuthAndRedirect, 100);

    return () => clearInterval(interval);
  }, [navigate, isAuthenticated]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Clear authentication error when user starts typing
    if (authError) {
      setAuthError(null);
    }
    
    // Update form data
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear validation error when user starts typing
    if (validationError) setValidationError('');
    if (emailValidationError) setEmailValidationError('');
    
    // Real-time validation for email
    if (name === 'email') {
      if (!value.trim()) {
        // Don't show error while typing, only when field is empty
        setEmailValidationError('');
      } else {
        // Use comprehensive Gmail email validation for real-time feedback
        const emailValidation = validateProfessionalEmail(value);
        if (!emailValidation.isValid) {
          // Show real-time validation error
          setEmailValidationError(getEmailValidationMessage(value, emailValidation));
        } else {
          // Clear validation error if email is valid
          setEmailValidationError('');
        }
      }
    }
    
    // Enhanced real-time validation for password
    if (name === 'password') {
      const hasUppercase = /[A-Z]/.test(value);
      const hasLowercase = /[a-z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
      const isLongEnough = value.length >= 4;
      const notTooLong = value.length <= 128;
      
      // Check for weak patterns
      const noRepeatedChars = !/(.)\1{2,}/.test(value);
      const noSequential = !/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|123|234|345|456|567|678|789|321|432|543|654|765|876|987/i.test(value);
      const noKeyboardPatterns = !/qwerty|asdfgh|zxcvbn|123456|654321/i.test(value);
      
      const allRequirementsMet = hasUppercase && hasLowercase && hasNumber && hasSpecialChar && isLongEnough && notTooLong && noRepeatedChars && noSequential && noKeyboardPatterns;
      setPasswordOk(allRequirementsMet);
      
      // Clear validation error when password is valid
      if (allRequirementsMet) {
        setValidationError('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setEmailValidationError('');
    setAuthError(null);
    
    // Validate all required fields
    if (!formData.firstName.trim()) {
      setValidationError('First name is required');
      return;
    }
    if (!formData.lastName.trim()) {
      setValidationError('Last name is required');
      return;
    }
    if (!formData.email.trim()) {
      setValidationError('Email is required');
      return;
    }
    if (!formData.password.trim()) {
      setValidationError('Password is required');
      return;
    }
    if (!formData.confirmPassword.trim()) {
      setValidationError('Please confirm your password');
      return;
    }
    
    // Enhanced name validation: letters only, no emojis, no special characters
    const nameRegex = /^[A-Za-z]+$/;
    
    // Check for emojis and special characters in first name
    if (!nameRegex.test(formData.firstName)) {
      if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(formData.firstName)) {
        setValidationError('First name cannot contain emojis');
        return;
      }
      if (/[^A-Za-z]/.test(formData.firstName)) {
        setValidationError('First name can only contain letters (A-Z, a-z). No numbers, spaces, or special characters allowed.');
        return;
      }
      setValidationError('First name can contain only letters (A-Z, a-z)');
      return;
    }
    
    // Check for emojis and special characters in last name
    if (!nameRegex.test(formData.lastName)) {
      if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(formData.lastName)) {
        setValidationError('Last name cannot contain emojis');
        return;
      }
      if (/[^A-Za-z]/.test(formData.lastName)) {
        setValidationError('Last name can only contain letters (A-Z, a-z). No numbers, spaces, or special characters allowed.');
        return;
      }
      setValidationError('Last name can contain only letters (A-Z, a-z)');
      return;
    }
    
    // Check name length requirements
    if (formData.firstName.trim().length < 2) {
      setValidationError('First name must be at least 2 characters long');
      return;
    }
    if (formData.firstName.trim().length > 30) {
      setValidationError('First name cannot exceed 30 characters');
      return;
    }
    if (formData.lastName.trim().length < 2) {
      setValidationError('Last name must be at least 2 characters long');
      return;
    }
    if (formData.lastName.trim().length > 30) {
      setValidationError('Last name cannot exceed 30 characters');
      return;
    }
    
    // Use comprehensive email validation for professional domains
    const emailValidation = validateProfessionalEmail(formData.email);
    if (!emailValidation.isValid) {
      setEmailValidationError(getEmailValidationMessage(formData.email, emailValidation));
      return;
    }
    
    // Clear any email validation errors before proceeding
    setEmailValidationError('');
    
    // Enhanced password validation with comprehensive checks
    const password = formData.password;
    
    // Check password length
    if (password.length < 4) {
      setValidationError('Password must be at least 4 characters long');
      return;
    }
    if (password.length > 128) {
      setValidationError('Password cannot exceed 128 characters');
      return;
    }
    
    // Check for required character types
    if (!/[A-Z]/.test(password)) {
      setValidationError('Password must contain at least one uppercase letter (A-Z)');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setValidationError('Password must contain at least one lowercase letter (a-z)');
      return;
    }
    if (!/\d/.test(password)) {
      setValidationError('Password must contain at least one number (0-9)');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setValidationError('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"\\|,.<>/?`)');
      return;
    }
    
    // Check for common weak patterns
    if (/(.)\1{2,}/.test(password)) {
      setValidationError('Password cannot contain 3 or more repeated characters');
      return;
    }
    
    // Check for sequential characters
    if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
      setValidationError('Password cannot contain sequential characters (abc, 123, etc.)');
      return;
    }
    
    // Check for keyboard patterns
    if (/qwerty|asdfgh|zxcvbn|123456|654321/i.test(password)) {
      setValidationError('Password cannot contain common keyboard patterns');
      return;
    }
    
    // Check password confirmation match
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    clearError();
    
    try {
      const response = await authService.register({
        email: formData.email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`,
        displayName: `${formData.firstName} ${formData.lastName}`
      });

      if (response.success) {
        console.log('[SignUp] Sign up successful');
        
        // Check if email verification is required
        if (response.emailVerificationRequired) {
          // Show success message and redirect to login with verification message
          setAuthError('');
          setValidationError('');
          setEmailValidationError('');
          
          // Show success message
          setAuthError('Account created successfully! Please check your email to verify your account before logging in.');
          
          // Redirect to login after a delay
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                message: 'Account created successfully! Please check your email to verify your account.',
                email: formData.email 
              }
            });
          }, 3000);
        } else {
          // User is already logged in after successful registration
          setAuthError('');
          setValidationError('');
          setEmailValidationError('');
          
          // Force immediate navigation to overview
          console.log('[SignUp] Forcing immediate navigation to overview...');
          navigate('/overview', { replace: true });
        }
      } else {
        setValidationError(response.error || 'Sign up failed. Please try again.');
      }
    } catch (err: any) {
      console.error('[SignUp] Sign up error:', err);
      
      // Handle specific error cases for better user experience
      let errorMessage = 'Sign up failed. Please try again.';
      
      if (err && typeof err === 'object') {
        if (err.message && typeof err.message === 'string') {
          if (err.message.includes('already exists') || err.message.includes('duplicate')) {
            errorMessage = 'Account already exists on this email';
          } else if (err.message.includes('Network') || err.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            errorMessage = err.message;
          }
        } else if (err.error && typeof err.error === 'string') {
          // Handle backend error responses
          if (err.error.includes('already exists') || err.error.includes('duplicate')) {
            errorMessage = 'Account already exists on this email';
          } else if (err.error.includes('Network') || err.error.includes('connection')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            errorMessage = err.error;
          }
        }
      }
      
      // Set authentication error for the toggle notification
      console.log('[SignUp] Setting authentication error message:', errorMessage);
      setAuthError(errorMessage);
      
      // Clear any inline validation errors since we're showing authentication error as toggle
      setValidationError('');
      setEmailValidationError('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 px-4 relative overflow-hidden">
      {/* Enhanced background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-300/30 via-indigo-300/30 to-purple-300/30"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-200/20 via-blue-200/20 to-indigo-200/20"></div>
      
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
          <h1 className="text-4xl font-bold text-black mb-3">Create your account</h1>
          <p className="text-gray-600 text-lg">Sign up to get started with kabini.ai</p>
        </div>



        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">First Name <span className="text-red-600">*</span></label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                  // Allow only letters for first name - no emojis, no special characters
                  const filteredValue = value.replace(/[^A-Za-z]/g, '');
                  
                  // Check for emojis specifically
                  if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(value)) {
                    setValidationError('First name cannot contain emojis');
                    return;
                  }
                  
                  setFormData(prev => ({ ...prev, firstName: filteredValue }));
                  // Clear any previous validation popup once user starts correcting
                  if (validationError) setValidationError('');
                  if (emailValidationError) setEmailValidationError('');
                  // Don't clear authError - let it remain as toggle notification
                })}
                onPaste={(e) => handlePaste(e, (value) => {
                  const filteredValue = value.replace(/[^A-Za-z]/g, '');
                  setFormData(prev => ({ ...prev, firstName: filteredValue }));
                })}
                onKeyDown={handleKeyDown}
                onCompositionStart={(e) => e.preventDefault()}
                onCompositionUpdate={(e) => e.preventDefault()}
                onCompositionEnd={(e) => e.preventDefault()}
                required
                placeholder="Enter your first name *"
                pattern="[A-Za-z]+"
                autoComplete="off"
                data-form-type="other"
                readOnly={preventAutofill}
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Last Name <span className="text-red-600">*</span></label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                  // Allow only letters for last name - no emojis, no special characters
                  const filteredValue = value.replace(/[^A-Za-z]/g, '');
                  
                  // Check for emojis specifically
                  if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(value)) {
                    setValidationError('Last name cannot contain emojis');
                    return;
                  }
                  
                  setFormData(prev => ({ ...prev, lastName: filteredValue }));
                  // Clear any previous validation popup once user starts correcting
                  if (validationError) setValidationError('');
                  if (emailValidationError) setEmailValidationError('');
                  // Don't clear authError - let it remain as toggle notification
                })}
                onPaste={(e) => handlePaste(e, (value) => {
                  const filteredValue = value.replace(/[^A-Za-z]/g, '');
                  setFormData(prev => ({ ...prev, lastName: filteredValue }));
                })}
                onKeyDown={handleKeyDown}
                onCompositionStart={(e) => e.preventDefault()}
                onCompositionUpdate={(e) => e.preventDefault()}
                onCompositionEnd={(e) => e.preventDefault()}
                required
                placeholder="Enter your last name *"
                pattern="[A-Za-z]+"
                autoComplete="off"
                data-form-type="other"
                readOnly={preventAutofill}
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Email <span className="text-red-600">*</span></label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                const formattedEmail = formatEmail(value);
                setFormData(prev => ({ ...prev, email: formattedEmail }));
                // Clear any previous validation popup once user starts correcting
                if (validationError) setValidationError('');
                if (emailValidationError) setEmailValidationError('');
                // Don't clear authError here - let it remain as toggle notification
                
                // Real-time email validation - show inline validation for email format
                if (!formattedEmail.trim()) {
                  setEmailValidationError('');
                } else {
                  const emailValidation = validateProfessionalEmail(formattedEmail);
                  if (!emailValidation.isValid) {
                    setEmailValidationError(getEmailValidationMessage(formattedEmail, emailValidation));
                  } else {
                    setEmailValidationError('');
                  }
                }
              })}
              onPaste={(e) => handlePaste(e, (value) => {
                const formattedEmail = formatEmail(value);
                setFormData(prev => ({ ...prev, email: formattedEmail }));
                // Trigger validation after paste
                const emailValidation = validateProfessionalEmail(formattedEmail);
                if (!emailValidation.isValid) {
                  setEmailValidationError(getEmailValidationMessage(formattedEmail, emailValidation));
                } else {
                  setEmailValidationError('');
                }
              })}
              onKeyDown={handleKeyDown}
              onCompositionStart={(e) => e.preventDefault()}
              onCompositionUpdate={(e) => e.preventDefault()}
              onCompositionEnd={(e) => e.preventDefault()}
              required
              autoComplete="off"
              data-form-type="other"
              readOnly={preventAutofill}
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

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Password <span className="text-red-600">*</span></label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                  setFormData(prev => ({ ...prev, password: value }));
                  // Clear any previous validation popup once user starts correcting
                  if (validationError) setValidationError('');
                  if (emailValidationError) setEmailValidationError('');
                  // Don't clear authError - let it remain as toggle notification
                  // Check password strength
                  const hasUppercase = /[A-Z]/.test(value);
                  const hasLowercase = /[a-z]/.test(value);
                  const hasNumber = /\d/.test(value);
                  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
                  const isLongEnough = value.length >= 8;
                  
                  const allRequirementsMet = hasUppercase && hasLowercase && hasNumber && hasSpecialChar && isLongEnough;
                  setPasswordOk(allRequirementsMet);
                  
                  // Clear validation error when password is valid
                  if (allRequirementsMet) {
                    setValidationError('');
                  }
                })}
                onPaste={(e) => handlePaste(e, (value) => {
                  setFormData(prev => ({ ...prev, password: value }));
                  // Check password strength
                  const hasUppercase = /[A-Z]/.test(value);
                  const hasLowercase = /[a-z]/.test(value);
                  const hasNumber = /\d/.test(value);
                  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
                  const isLongEnough = value.length >= 8;
                  
                  const allRequirementsMet = hasUppercase && hasLowercase && hasNumber && hasSpecialChar && isLongEnough;
                  setPasswordOk(allRequirementsMet);
                  
                  // Clear validation error when password is valid
                  if (allRequirementsMet) {
                    setValidationError('');
                  }
                })}
                onKeyDown={handleKeyDown}
                onCompositionStart={(e) => e.preventDefault()}
                onCompositionUpdate={(e) => e.preventDefault()}
                onCompositionEnd={(e) => e.preventDefault()}
                required
                autoComplete="new-password"
                data-form-type="other"
                readOnly={preventAutofill}
                placeholder="Create a password *"
                className="w-full px-4 pr-12 py-4 border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Enhanced Password Strength Indicator */}
            <PasswordStrengthIndicator 
              password={formData.password} 
              className="mt-3"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Confirm Password <span className="text-red-600">*</span></label>
            <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => handleEmojiFilteredInput(e, (value) => {
                setFormData(prev => ({ ...prev, confirmPassword: value }));
                // Clear any previous validation popup once user starts correcting
                if (validationError) setValidationError('');
                // Don't clear authError - let it remain as toggle notification
              })}
              onPaste={(e) => handlePaste(e, (value) => {
                setFormData(prev => ({ ...prev, confirmPassword: value }));
              })}
              onKeyDown={handleKeyDown}
              onCompositionStart={(e) => e.preventDefault()}
              onCompositionUpdate={(e) => e.preventDefault()}
              onCompositionEnd={(e) => e.preventDefault()}
              required
              autoComplete="new-password"
              data-form-type="other"
              readOnly={preventAutofill}
              placeholder="Re-enter your password *"
              className="w-full px-4 pr-12 py-4 border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
              tabIndex={-1}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white font-bold py-4 px-6 rounded-xl hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transform hover:scale-[1.02]"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
          </button>
        </form>

          <div className="mt-6 text-center">
            <span
              onClick={() => navigate('/login')}
              className="text-sm text-black hover:text-gray-700 underline hover:no-underline transition-colors cursor-pointer"
            >
              Already have an account? Sign in
            </span>
          </div>
      </div>
      
      {/* Error Notification - Only for authentication errors, not email validation */}
      <ErrorNotification
        error={authError || error}
        onClose={() => {
          setAuthError(null);
          clearError();
        }}
        autoClose={true}
        autoCloseDelay={5000}
      />
    </div>
  );
};

export default SignUp; 