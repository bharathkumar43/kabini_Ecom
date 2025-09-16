import React from 'react';
import { XCircle, AlertCircle } from 'lucide-react';

interface ValidationNotificationProps {
  message: string;
  type?: 'error' | 'warning';
  onClose?: () => void;
  className?: string;
}

const ValidationNotification: React.FC<ValidationNotificationProps> = ({
  message,
  type = 'error',
  onClose,
  className = ''
}) => {
  const bgColor = type === 'error' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  const textColor = type === 'error' ? 'text-red-800' : 'text-amber-800';
  const iconColor = type === 'error' ? 'text-red-500' : 'text-amber-500';
  const Icon = type === 'error' ? XCircle : AlertCircle;

  return (
    <div className={`flex items-start gap-3 p-4 border rounded-lg ${bgColor} ${className}`}>
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
      <div className="flex-1">
        <p className={`text-sm font-medium ${textColor}`}>
          {message}
        </p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={`p-1 rounded-full hover:bg-white/50 transition-colors ${textColor}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ValidationNotification;
