import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import { Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';

export default function Register() {
  const { registerUser } = useAuthStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await registerUser(formData);
      const emailSent = result?.emailSent !== false;
      navigate(
        `/signup-success?email=${encodeURIComponent(formData.email)}${emailSent ? '' : '&emailSent=false'}`,
        { replace: true }
      );
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 font-sans p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
        
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Create Your Account</h2>
          <p className="mt-2 text-sm text-slate-500">
            Already have an account? <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700">Sign in</Link>
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Form fields for Name, Email, Phone, Password (similar to your previous ones) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
            <div className="relative">
              <User className="absolute top-2.5 left-3 h-5 w-5 text-slate-400" />
              <input name="fullName" type="text" required value={formData.fullName} onChange={handleChange} className="block w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-slate-900 transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none" placeholder="John Doe" />
            </div>
          </div>
          <div>
            <label className=" block text-sm font-medium text-slate-700">Email</label>
            <span className="text-xs text-slate-500">Please note: You must verify your email address before you can access your account.</span>
            <div className="relative">
              <Mail className="absolute top-2.5 left-3 h-5 w-5 text-slate-400" />
              <input name="email" type="email" required value={formData.email} onChange={handleChange} className="block w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-slate-900 transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none" placeholder="john@example.com" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
            <div className="relative">
              <Phone className="absolute top-2.5 left-3 h-5 w-5 text-slate-400" />
              <input name="phone" type="tel" value={formData.phone} onChange={handleChange} className="block w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-slate-900 transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none" placeholder="+ (555) 000-0000" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <Lock className="absolute top-2.5 left-3 h-5 w-5 text-slate-400" />
              <input name="password" type="password" required value={formData.password} onChange={handleChange} className="block w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-slate-900 transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none" placeholder="••••••••" />
            </div>
            <span className="text-xs text-red-500 mt-2 block">Must be at least 8 characters.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center rounded-lg bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-70 shadow-md shadow-slate-300"
          >
            {isSubmitting ? "Creating account..." : "Continue"} <ArrowRight size={18} className="ml-2"/>
          </button>
        </form>

        {/* Brand & Version Footer */}
        <div className="mt-8 border-t border-slate-100 pt-6 text-center">
          <p className="text-xs text-slate-400">
            v1.1.0 — © 2026 Ayiks Inc.
          </p>
        </div>
      </div>
    </div>
  );
}