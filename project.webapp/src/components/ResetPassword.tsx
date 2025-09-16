import React, { useState, useEffect } from 'react';
import { User, Loader2, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ErrorNotification from './ui/ErrorNotification';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });
  const [validationError, setValidationError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordOk, setPasswordOk] = useState(false);
  const navigate = useNavigate();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setValidationError("Invalid reset link. Please request a new password reset.");
      setIsCheckingToken(false);
      return;
    }
    
    // Since backend doesn't have token validation endpoint, 
    // we'll show the form and let the backend validate on submit
    console.log('[ResetPassword] Token found in URL, showing reset form');
    setIsValidToken(true);
    setIsCheckingToken(false);
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    if (name === 'password') {
      const ok = value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
      setPasswordOk(ok);
    }
  };

  const validateForm = () => {
    if (!formData.password) {
      setValidationError("Password is required");
      return false;
    }
    if (!formData.confirmPassword) {
      setValidationError("Please confirm your password");
      return false;
    }

    // Validate password
    if (formData.password.length < 8) {
      setValidationError("Password must be at least 8 characters long");
      return false;
    }
    if (!/(?=.*[a-z])/.test(formData.password)) {
      setValidationError("Password must contain at least one lowercase letter");
      return false;
    }
    if (!/(?=.*[A-Z])/.test(formData.password)) {
      setValidationError("Password must contain at least one uppercase letter");
      return false;
    }
    if (!/(?=.*\d)/.test(formData.password)) {
      setValidationError("Password must contain at least one number");
      return false;
    }

    // Check password confirmation
    if (formData.password !== formData.confirmPassword) {
      setValidationError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!validateForm()) {
      return;
    }

    if (!token) {
      setValidationError("Invalid reset token. Please request a new password reset.");
      return;
    }

    setIsLoading(true);
    try {
      console.log('[ResetPassword] Attempting to reset password with token:', token);
      
      // Use direct fetch since we need to handle the response manually
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          newPassword: formData.password
        }),
      });

      const data = await response.json();
      console.log('[ResetPassword] Response:', response.status, data);

      if (response.ok) {
        console.log('[ResetPassword] Password reset successful');
        setIsSuccess(true);
      } else {
        console.error('[ResetPassword] Password reset failed:', data.error);
        setValidationError(data.error || 'Failed to reset password. Please try again.');
      }
    } catch (error: any) {
      console.error('[ResetPassword] Error during password reset:', error);
      setValidationError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-md mx-auto p-8 bg-white rounded-lg shadow-sm">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <div className="text-gray-600">Verifying reset link...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-md mx-auto p-8 bg-white rounded-lg shadow-sm">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-red-600" />
            </div>
                         <h1 className="text-3xl font-bold text-gray-900 mb-2">Invalid Reset Link</h1>
             <p className="text-gray-600 mb-6">{validationError}</p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all"
            >
              Request New Reset Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-md mx-auto p-8 bg-white rounded-lg shadow-sm">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Password Reset Successfully</h1>
            <p className="text-gray-600 mb-6">Your password has been updated. You can now log in with your new password.</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md mx-auto p-8 bg-white rounded-lg shadow-sm">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
          <p className="text-gray-600">Enter your new password below</p>
        </div>



        <form onSubmit={handleResetPassword} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">New Password <span className="text-red-600">*</span></label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="Enter your new password"
                className="w-full px-4 pr-12 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className={`mt-2 text-xs ${passwordOk ? 'text-green-600' : 'text-gray-500'}`}>
              {passwordOk ? 'Password meets requirements' : 'Must be at least 8 characters with uppercase, lowercase, and number'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Confirm New Password <span className="text-red-600">*</span></label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                placeholder="Re-enter your new password"
                className="w-full px-4 pr-12 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
            className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full bg-blue-500 border-2 border-blue-600 text-white hover:bg-blue-600 hover:text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Login
          </button>
        </div>
      </div>
      
      {/* Error Notification */}
      <ErrorNotification
        error={validationError}
        onClose={() => setValidationError('')}
        autoClose={true}
        autoCloseDelay={5000}
      />
    </div>
  );
};

export default ResetPassword; 