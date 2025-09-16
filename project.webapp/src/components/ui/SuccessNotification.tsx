import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface SuccessNotificationProps {
  message: string | null;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
  type?: NotificationType;
}

const SuccessNotification: React.FC<SuccessNotificationProps> = ({
  message,
  onClose,
  autoClose = true,
  autoCloseDelay = 3000,
  type = 'success'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // Color configuration based on notification type
  const getNotificationStyles = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-500',
          title: 'text-green-800',
          message: 'text-green-700',
          closeButton: 'text-green-400 hover:text-green-600',
          closeButtonFocus: 'focus:ring-green-500',
          progressBg: 'bg-green-200',
          progressBar: 'bg-green-500',
          iconComponent: CheckCircle,
          titleText: 'Success'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-500',
          title: 'text-red-800',
          message: 'text-red-700',
          closeButton: 'text-red-400 hover:text-red-600',
          closeButtonFocus: 'focus:ring-red-500',
          progressBg: 'bg-red-200',
          progressBar: 'bg-red-500',
          iconComponent: AlertCircle,
          titleText: 'Error'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-500',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          closeButton: 'text-yellow-400 hover:text-yellow-600',
          closeButtonFocus: 'focus:ring-yellow-500',
          progressBg: 'bg-yellow-200',
          progressBar: 'bg-yellow-500',
          iconComponent: AlertTriangle,
          titleText: 'Warning'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-500',
          title: 'text-blue-800',
          message: 'text-blue-700',
          closeButton: 'text-blue-400 hover:text-blue-600',
          closeButtonFocus: 'focus:ring-blue-500',
          progressBg: 'bg-blue-200',
          progressBar: 'bg-blue-500',
          iconComponent: Info,
          titleText: 'Info'
        };
      default:
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-500',
          title: 'text-green-800',
          message: 'text-green-700',
          closeButton: 'text-green-400 hover:text-green-600',
          closeButtonFocus: 'focus:ring-green-500',
          progressBg: 'bg-green-200',
          progressBar: 'bg-green-500',
          iconComponent: CheckCircle,
          titleText: 'Success'
        };
    }
  };

  const styles = getNotificationStyles(type);
  const IconComponent = styles.iconComponent;

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      
      if (autoClose) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(onClose, 300); // Wait for animation to complete
        }, autoCloseDelay);
        
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [message, autoClose, autoCloseDelay, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div
        className={`transform transition-all duration-300 ease-in-out ${
          isVisible 
            ? 'translate-x-0 opacity-100 scale-100' 
            : 'translate-x-full opacity-0 scale-95'
        }`}
      >
        <div className={`${styles.bg} border ${styles.border} rounded-lg shadow-lg p-4 relative`}>
          {/* Close button */}
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className={`absolute top-2 right-2 ${styles.closeButton} transition-colors focus:outline-none focus:ring-2 ${styles.closeButtonFocus} focus:ring-offset-2 rounded-full p-1`}
            aria-label={`Close ${type} notification`}
          >
            <X className="w-4 h-4" />
          </button>
          
          {/* Notification content */}
          <div className="flex items-start gap-3 pr-6">
            <div className="flex-shrink-0">
              <IconComponent className={`w-5 h-5 ${styles.icon}`} />
            </div>
            <div className="flex-1">
              <h3 className={`text-sm font-semibold ${styles.title} mb-1`}>
                {styles.titleText}
              </h3>
              <p className={`text-sm ${styles.message} leading-relaxed`}>
                {message}
              </p>
            </div>
          </div>
          
          {/* Progress bar for auto-close */}
          {autoClose && (
            <div className={`mt-3 h-1 ${styles.progressBg} rounded-full overflow-hidden`}>
              <div 
                className={`h-full ${styles.progressBar} rounded-full transition-all duration-300 ease-linear`}
                style={{
                  width: isVisible ? '0%' : '100%',
                  transitionDuration: `${autoCloseDelay}ms`
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuccessNotification; 