import React from 'react';
import { Info, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { validateGmailEmail, getEmailValidationSuggestions } from '../../utils/emailValidation';

interface EmailValidationHelperProps {
  email: string;
  showHelper?: boolean;
  className?: string;
}

const EmailValidationHelper: React.FC<EmailValidationHelperProps> = ({ 
  email, 
  showHelper = false, 
  className = '' 
}) => {
  if (!showHelper || !email.trim()) {
    return null;
  }

  const validation = validateGmailEmail(email);
  const suggestions = getEmailValidationSuggestions(validation);

  if (validation.isValid) {
    return (
      <div className={`flex items-center gap-2 text-green-600 text-sm ${className}`}>
        <CheckCircle className="w-4 h-4" />
        <span>Email format is valid</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Error Summary */}
      <div className="flex items-start gap-2 text-red-600 text-sm">
        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Please fix the following issues:</p>
          <ul className="mt-1 space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index} className="text-xs">• {error}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex items-start gap-2 text-amber-600 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Suggestions:</p>
            <ul className="mt-1 space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="text-xs">• {suggestion}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Gmail Guidelines */}
      <div className="flex items-start gap-2 text-blue-600 text-sm bg-blue-50 p-3 rounded-lg">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Gmail Email Guidelines:</p>
          <ul className="mt-1 space-y-1 text-xs">
            <li>• Local part: 6-30 characters, letters/numbers/._%+-</li>
            <li>• Must start and end with letter or number</li>
            <li>• No consecutive dots or special characters</li>
            <li>• Domain: 3-63 characters, letters/numbers/.-</li>
            <li>• Must have valid TLD (e.g., .com, .org)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmailValidationHelper;
