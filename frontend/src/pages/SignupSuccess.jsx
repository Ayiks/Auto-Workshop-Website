import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Mail, ArrowLeft, Send, AlertTriangle } from 'lucide-react';
import { authApi } from '@api/auth';

export default function SignupSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get('email') || '';
  const emailSent = searchParams.get('emailSent') !== 'false';

  const [resendStatus, setResendStatus] = useState('idle'); // idle | sending | sent | error
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    console.log('SignupSuccess component mounted with email:', email);
  }, [email]);

  const handleResend = async () => {
    if (!email || resendStatus === 'sending' || resendStatus === 'sent') return;
    setResendStatus('sending');
    setResendError('');
    try {
      await authApi.resendVerification(email);
      setResendStatus('sent');
    } catch (err) {
      setResendError(err.message || 'Failed to resend. Please try again.');
      setResendStatus('error');
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 font-sans p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-slate-100 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full mx-auto flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle size={32} />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Created!</h2>

        {emailSent ? (
          <p className="text-slate-600 mb-6">
            We've sent a verification link to <span className="font-bold text-slate-900 break-all">{email}</span>.
          </p>
        ) : (
          <p className="text-slate-600 mb-6">
            Your account was created for <span className="font-bold text-slate-900 break-all">{email}</span>.
          </p>
        )}

        {/* Email delivery failed warning */}
        {!emailSent && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">Email delivery failed</p>
                <p className="text-xs text-amber-700 mt-1">
                  We couldn't send the verification email. Use the button below to try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {emailSent && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-blue-900">Check your email</p>
                <p className="text-xs text-blue-700 mt-1">
                  Click the verification link in the email to continue setting up your workspace.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Resend button */}
        {resendStatus === 'sent' ? (
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium">
              <CheckCircle size={16} />
              Verification email sent!
            </div>
            <p className="text-xs text-slate-500 mt-1">Check your inbox and spam/junk folder — it may take a few minutes.</p>
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={resendStatus === 'sending' || !email}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition disabled:opacity-60 mb-3"
          >
            <Send size={16} />
            {resendStatus === 'sending' ? 'Sending...' : 'Resend Verification Email'}
          </button>
        )}

        {resendStatus === 'error' && (
          <p className="text-xs text-red-600 mb-3">{resendError}</p>
        )}

        <button
          onClick={() => navigate('/signup')}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          <ArrowLeft size={18} />
          Back to Sign Up
        </button>

        {/* Brand & Version Footer */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="text-xs text-slate-400">
            v1.1.0 — © 2026 Ayiks Inc.
          </p>
        </div>
      </div>
    </div>
  );
}
