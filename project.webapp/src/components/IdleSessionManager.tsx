import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface IdleSessionManagerProps {
  idleMinutes?: number;        // minutes of inactivity before logout (default: 10)
  warningSeconds?: number;     // seconds before logout to show warning (default: 60)
  redirectDelayMs?: number;    // ms to show the expired banner before redirect (default: 2500)
}

const IdleSessionManager: React.FC<IdleSessionManagerProps> = ({
  idleMinutes = 10,
  warningSeconds = 60,
  redirectDelayMs = 2500,
}) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [showWarning, setShowWarning] = useState(false);
  const [showExpiredBanner, setShowExpiredBanner] = useState(false);

  const warningTimerRef = useRef<number | null>(null);
  const logoutTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    const idleMs = Math.max(1, idleMinutes) * 60_000;
    const warnMs = Math.max(0, idleMs - Math.max(0, warningSeconds) * 1000);

    // Warning timer
    warningTimerRef.current = window.setTimeout(() => {
      setShowWarning(true);
    }, warnMs);

    // Logout timer
    logoutTimerRef.current = window.setTimeout(async () => {
      setShowWarning(false);
      setShowExpiredBanner(true);
      // Give user brief feedback then logout and redirect
      window.setTimeout(async () => {
        try { await logout(); } catch {}
        navigate('/', { replace: true });
      }, redirectDelayMs);
    }, idleMs);
  }, [clearTimers, idleMinutes, warningSeconds, redirectDelayMs, logout, navigate]);

  const resetActivity = useCallback(() => {
    startTimers();
  }, [startTimers]);

  useEffect(() => {
    startTimers();
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetActivity, { passive: true }));
    // Hide warning if user becomes active again
    const cancelWarning = () => setShowWarning(false);
    events.forEach(evt => window.addEventListener(evt, cancelWarning, { passive: true }));

    return () => {
      clearTimers();
      events.forEach(evt => window.removeEventListener(evt, resetActivity));
      events.forEach(evt => window.removeEventListener(evt, cancelWarning));
    };
  }, [startTimers, resetActivity, clearTimers]);

  return (
    <>
      {showWarning && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-[90%] max-w-sm text-center">
            <div className="text-lg font-semibold text-gray-900 mb-2">You are about to be signed out</div>
            <div className="text-sm text-gray-600 mb-4">
              Due to inactivity, your session will expire soon. Move your mouse or press any key to stay signed in.
            </div>
            <button
              onClick={() => resetActivity()}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors w-full"
            >
              Stay signed in
            </button>
          </div>
        </div>
      )}

      {showExpiredBanner && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1100]">
          <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
            Session expired. Redirecting to login...
          </div>
        </div>
      )}
    </>
  );
};

export default IdleSessionManager;


