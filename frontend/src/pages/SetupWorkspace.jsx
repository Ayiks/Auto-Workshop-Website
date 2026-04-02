import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import { Building2, ArrowRight, Wrench, Paintbrush, Car, MoreHorizontal } from 'lucide-react';
import Button from '@components/common/Button';

const JOB_TYPE_OPTIONS = [
  { value: 'mechanic',  label: 'Mechanic',   icon: Wrench,       desc: 'Engine, brakes, suspension, electrical' },
  { value: 'sprayer',   label: 'Sprayer',     icon: Paintbrush,   desc: 'Full respray, touch-up, primer & paint' },
  { value: 'bodyworks', label: 'Body Works',  icon: Car,          desc: 'Panel beating, dent removal, welding' },
  { value: 'other',     label: 'Other',       icon: MoreHorizontal, desc: 'Other workshop services' },
];

export default function SetupWorkspace() {
  const navigate = useNavigate();
  const { setupWorkspace, user, isLoading, error } = useAuthStore();
  const [businessName, setBusinessName] = useState('');
  const [enabledJobTypes, setEnabledJobTypes] = useState(['mechanic', 'sprayer', 'bodyworks', 'other']);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    } else if (user && user.businessId) {
      navigate('/app/dashboard');
    }
  }, [navigate, user]);

  const toggleJobType = (value) => {
    setEnabledJobTypes(prev =>
      prev.includes(value)
        ? prev.length > 1 ? prev.filter(t => t !== value) : prev  // keep at least 1
        : [...prev, value]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await setupWorkspace({ businessName, enabledJobTypes });
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
          {/* Business Name */}
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
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-slate-900 transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none"
                placeholder="e.g. AutoFix Garage"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">You can always change this later in your settings.</p>
          </div>

          {/* Workshop Specializations */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">What types of work does your shop do?</label>
            <p className="text-xs text-gray-500 mb-3">Select all that apply. This controls which job types and staff roles are available.</p>
            <div className="grid grid-cols-2 gap-2">
              {JOB_TYPE_OPTIONS.map(({ value, label, icon: Icon, desc }) => {
                const selected = enabledJobTypes.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleJobType(value)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-colors ${
                      selected
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${selected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${selected ? 'text-slate-900' : 'text-slate-600'}`}>{label}</p>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
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
