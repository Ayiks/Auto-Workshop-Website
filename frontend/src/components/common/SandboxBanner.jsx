// src/components/common/SandboxBanner.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, X, ArrowRight, Clock } from 'lucide-react';

function useCountdown(expiresAt) {
  const calc = () => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt) - Date.now();
    if (diff <= 0) return { expired: true, hours: 0, minutes: 0, display: 'Expired', totalMs: 0 };
    const hours   = Math.floor(diff / 36e5);
    const minutes = Math.floor((diff % 36e5) / 6e4);
    return { expired: false, hours, minutes, display: `${hours}h ${minutes}m`, totalMs: diff };
  };

  const [time, setTime] = useState(calc);

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setTime(calc()), 60_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return time;
}

export default function SandboxBanner() {
  const navigate = useNavigate();

  // Select plain state values — NOT functions.
  // Selecting a function from the store returns the function reference (always
  // truthy), which caused the banner to show on every page including /signup.
  const isSandbox        = useAuthStore((s) => s.isSandbox);
  const sandboxExpiresAt = useAuthStore((s) => s.sandboxExpiresAt);

  const [dismissed, setDismissed] = useState(false);

  const expiresAt = sandboxExpiresAt ? new Date(sandboxExpiresAt) : null;
  const countdown = useCountdown(expiresAt);

  // Only render for sandbox sessions that haven't been dismissed
  if (!isSandbox || dismissed || !countdown) return null;

  const isUrgent  = !countdown.expired && countdown.hours < 4;
  const isExpired = countdown.expired;
  const bgClass   = isExpired ? 'bg-red-600' : isUrgent ? 'bg-orange-500' : 'bg-gray-900';
  const progressPct = Math.min(100, (countdown.totalMs / (48 * 36e5)) * 100);

  return (
    <AnimatePresence>
      <motion.div
        key="sandbox-banner"
        initial={{ y: -48, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        exit={{   y: -48, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className={`relative z-50 w-full ${bgClass} select-none`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">

          {/* Left: icon + message + countdown */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <FlaskConical size={15} className="text-white/70 flex-shrink-0" />
            <p className="text-white text-xs sm:text-sm font-medium truncate">
              {isExpired
                ? 'Your demo workspace has expired.'
                : <>You&apos;re in a <span className="font-bold">demo workspace</span>. <span className="hidden sm:inline text-white/60">Data resets automatically.</span></>
              }
            </p>
            {!isExpired && (
              <span className={`hidden sm:flex flex-shrink-0 items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${isUrgent ? 'bg-white/25 text-white' : 'bg-white/10 text-white/75'}`}>
                <Clock size={10} />
                {countdown.display} left
              </span>
            )}
          </div>

          {/* Right: CTA + dismiss */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => navigate('/signup')}
              className="flex items-center gap-1.5 bg-white text-gray-900 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-gray-100 active:scale-95 transition-all whitespace-nowrap"
            >
              Sign up free <ArrowRight size={11} />
            </button>
            {!isExpired && (
              <button
                onClick={() => setDismissed(true)}
                aria-label="Dismiss banner"
                className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar showing time remaining */}
        {!isExpired && (
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/10">
            <div className="h-full bg-white/35" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}