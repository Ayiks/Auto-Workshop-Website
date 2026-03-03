import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Mail, ArrowLeft } from 'lucide-react';

export default function SignupSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  // const email = location.state?.email || '';
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get('email') || '';

  useEffect(() => {
    // Debug log to verify component is mounting
    console.log('SignupSuccess component mounted with email:', email);
  }, [email]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 font-sans p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-slate-100 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full mx-auto flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle size={32} />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Created!</h2>
        
        <p className="text-slate-600 mb-6">
          We've sent a verification link to <span className="font-bold text-slate-900 break-all">{email}</span>. 
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-blue-900">Check your email</p>
              <p className="text-xs text-blue-700 mt-1">
                Click the verification link in the email to continue setting up your workspace.
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-6">
          Didn't receive the email? Check your spam folder or try signing up again.
        </p>

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
