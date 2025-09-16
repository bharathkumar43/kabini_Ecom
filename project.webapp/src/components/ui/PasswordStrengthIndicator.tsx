import React from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ 
  password, 
  className = '' 
}) => {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isLongEnough = password.length >= 8;
  
  const allRequirementsMet = hasUppercase && hasLowercase && hasNumber && hasSpecialChar && isLongEnough;

  if (password.length === 0) {
    return null;
  }

  return (
    <div className={`text-sm ${allRequirementsMet ? 'text-green-600' : 'text-red-600'} ${className}`}>
      {allRequirementsMet 
        ? '✅ Password meets all requirements' 
        : '❌ Password must contain: at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character'
      }
    </div>
  );
};

export default PasswordStrengthIndicator;
