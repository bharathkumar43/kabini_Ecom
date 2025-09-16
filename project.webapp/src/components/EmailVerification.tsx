import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Mail, RefreshCw } from 'lucide-react';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setVerificationStatus('error');
      setMessage('No verification token provided');
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVerificationStatus('success');
        setMessage(data.message);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        if (data.error.includes('expired')) {
          setVerificationStatus('expired');
        } else {
          setVerificationStatus('error');
        }
        setMessage(data.error);
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setVerificationStatus('error');
      setMessage('Failed to verify email. Please try again.');
    }
  };

  const resendVerification = async () => {
    if (!userEmail) {
      setResendMessage('Please enter your email address');
      return;
    }

    setIsResending(true);
    setResendMessage('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResendMessage('Verification email sent successfully! Please check your inbox.');
      } else {
        setResendMessage(data.error || 'Failed to resend verification email');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setResendMessage('Failed to resend verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (verificationStatus) {
      case 'loading':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
            <p className="text-gray-600">Please wait while we verify your email address.</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified Successfully!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to login page...</p>
          </div>
        );

      case 'expired':
        return (
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Link Expired</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resend Verification Email</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email address"
                  />
                </div>
                <button
                  onClick={resendVerification}
                  disabled={isResending || !userEmail}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Resend Verification Email
                    </>
                  )}
                </button>
                {resendMessage && (
                  <p className={`text-sm ${resendMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                    {resendMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            
            <div className="space-y-4">
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                Go to Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
              >
                Create New Account
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default EmailVerification;
