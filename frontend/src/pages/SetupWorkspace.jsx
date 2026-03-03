import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import { Building2, ArrowRight } from 'lucide-react';
import Button from '@components/common/Button';

export default function SetupWorkspace() {
  const navigate = useNavigate();
  const { setupWorkspace, user, isLoading, error } = useAuthStore();
  const [businessName, setBusinessName] = useState('');

  // Check if user is authenticated and has no business yet
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    } else if (user && user.businessId) {
      // User already has a business, redirect to dashboard
      navigate('/app/dashboard');
    }
    console.log('SetupWorkspace mounted. User:', user);
  }, [navigate, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await setupWorkspace({ businessName });
      // navigate('/app/dashboard'); // Done! Straight to the app.
    } catch (err) {
      console.error("Workspace setup failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="w-16 h-16 bg-black text-white rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg">
          <Building2 size={32} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Setup your workspace</h2>
        <p className="mt-2 text-sm text-gray-600">
          Welcome, <span className="font-bold">{user?.email || 'there'}</span>! Let's get your business setup.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100 animate-in fade-in slide-in-from-bottom-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-sm font-bold text-red-700 rounded-r-md">
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Business Name</label>
            <div className="relative">
              <Building2 className="absolute top-1/2 -translate-y-1/2 left-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                required
                autoFocus
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-slate-900 transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none"                placeholder="e.g. AutoFix Garage"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              You can always change this later in your settings.
            </p>
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              loading={isLoading} 
              className="mt-2 flex w-full items-center justify-center rounded-lg bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-70 shadow-md shadow-slate-300"
            >
              {isLoading ? "Creating business..." : "Get Started"} <ArrowRight size={18} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}