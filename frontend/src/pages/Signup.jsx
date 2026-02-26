import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import { useResponsive } from '@hooks/useResponsive';
import { Building2, Mail, Lock, User, Phone, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import Button from '@components/common/Button'; // Assuming you have this component

export default function Register() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { register, isLoading, error } = useAuthStore();
  
  const [step, setStep] = useState(1); // 🌟 New State to track form step
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    businessName: '',
    selectedPlan: 'free'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Move to step 2 (Only fires if native HTML validation passes)
  const handleNextStep = (e) => {
    e.preventDefault();
    setStep(2);
  };

  // Final Submit to Backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(formData);
      navigate('/app/dashboard');
    } catch (err) {
      console.error("Signup failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4 sm:px-0">
        <div className={`${isMobile ? 'w-14 h-14' : 'w-16 h-16'} bg-black text-white rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg`}>
          {step === 1 ? <User size={isMobile ? 24 : 32} /> : <Building2 size={isMobile ? 24 : 32} />}
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
          {step === 1 ? 'Create your account' : 'Setup your workspace'}
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-gray-600">
          {step === 1 ? (
            <>
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-black hover:underline">
                Sign in here
              </Link>
            </>
          ) : (
            'Just one last step before we get started.'
          )}
        </p>
      </div>

      <div className="mt-6 sm:mt-8 px-4 sm:mx-auto sm:w-full sm:max-w-md relative overflow-hidden">
        
        {/* Step Indicator */}
        <div className="flex justify-center items-center mb-4 sm:mb-6 gap-2">
           <div className={`h-1.5 w-10 sm:w-12 rounded-full ${step >= 1 ? 'bg-black' : 'bg-gray-200'} transition-colors`}></div>
           <div className={`h-1.5 w-10 sm:w-12 rounded-full ${step >= 2 ? 'bg-black' : 'bg-gray-200'} transition-colors`}></div>
        </div>

        <div className="bg-white py-6 sm:py-8 px-4 sm:px-6 md:px-10 shadow-xl shadow-gray-200/50 sm:rounded-2xl border border-gray-100 relative">
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-md">
              <p className="text-sm font-bold text-red-700">{error}</p>
            </div>
          )}

          {/* We use two separate <form> tags. 
            Form 1 just increments the step.
            Form 2 actually submits the data.
          */}

          {step === 1 ? (
            <form className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300" onSubmit={handleNextStep}>
              
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-xs sm:text-sm"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-xs sm:text-sm"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">Phone Number <span className="text-gray-400 font-normal">(Optional)</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-xs sm:text-sm"
                    placeholder="+233 54 123 4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-xs sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full py-2.5 sm:py-3 bg-black hover:bg-gray-900 text-white rounded-lg font-bold text-sm sm:text-base flex justify-center items-center gap-2 shadow-md transition-all"
                >
                  Continue <ArrowRight size={18} />
                </Button>
              </div>
            </form>
          ) : (
            <form className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300" onSubmit={handleSubmit}>
              
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">Business Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    name="businessName"
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-xs sm:text-sm"
                    placeholder="e.g. AutoFix Garage"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This is the name that will appear on your receipts and dashboard.
                </p>
              </div>

              {/* Read-only summary so they know their data carried over */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-100 flex items-center gap-3 mt-4">
                <div className="bg-white p-2 rounded-full shadow-sm">
                   <User className="w-4 sm:w-5 h-4 sm:h-5 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                   <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{formData.fullName}</p>
                   <p className="text-xs text-gray-500 truncate">{formData.email}</p>
                </div>
                <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-green-500 flex-shrink-0" />
              </div>

              <div className="pt-4 flex gap-2 sm:gap-3">
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors flex items-center justify-center"
                >
                  <ArrowLeft size={20} />
                </button>
                <Button 
                  type="submit" 
                  loading={isLoading}
                  className="flex-1 py-2.5 sm:py-3 bg-black hover:bg-gray-900 text-white rounded-lg font-bold text-sm sm:text-base flex justify-center items-center gap-2 shadow-md transition-all"
                >
                  Create Workspace
                </Button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}