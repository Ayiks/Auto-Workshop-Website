import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import PhoneInput, { isValidPhone } from '@components/common/PhoneInput';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);
const WarnIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

export default function Register() {
  const { registerUser } = useAuthStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = (data = formData) => {
    const e = {};
    if (!data.fullName.trim()) e.fullName = 'Full name is required';
    if (!data.email.trim()) {
      e.email = 'Email is required';
    } else if (!EMAIL_RE.test(data.email)) {
      e.email = 'Please enter a valid email address';
    }
    if (data.phone && !isValidPhone(data.phone)) {
      e.phone = 'Please enter a valid phone number';
    }
    if (!data.password) {
      e.password = 'Password is required';
    } else if (data.password.length < 8) {
      e.password = 'Must be at least 8 characters';
    }
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    setServerError('');
    // Clear this field's error as soon as it becomes valid
    if (errors[name]) {
      const revalidated = validate(updated);
      setErrors(prev => ({ ...prev, [name]: revalidated[name] || null }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    const fieldErrors = validate();
    setErrors(prev => ({ ...prev, [name]: fieldErrors[name] || null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

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
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordMet = formData.password.length >= 8;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 font-sans p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-slate-100">

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Create Your Account</h2>
          <p className="mt-2 text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700">Sign in</Link>
          </p>
        </div>

        {serverError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 text-center">
            {serverError}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>

          {/* Full Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute top-2.5 left-3 h-5 w-5 text-slate-400" />
              <input
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`block w-full rounded-lg border bg-slate-50 pl-10 pr-4 py-2.5 text-slate-900 transition focus:bg-white focus:ring-4 outline-none ${
                  errors.fullName
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-50'
                    : 'border-slate-200 focus:border-blue-600 focus:ring-blue-50'
                }`}
                placeholder="John Doe"
              />
            </div>
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <WarnIcon /> {errors.fullName}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Email <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-slate-500">You must verify your email before accessing your account.</span>
            <div className="relative mt-1">
              <Mail className="absolute top-2.5 left-3 h-5 w-5 text-slate-400" />
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`block w-full rounded-lg border bg-slate-50 pl-10 pr-4 py-2.5 text-slate-900 transition focus:bg-white focus:ring-4 outline-none ${
                  errors.email
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-50'
                    : 'border-slate-200 focus:border-blue-600 focus:ring-blue-50'
                }`}
                placeholder="john@example.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <WarnIcon /> {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Phone <span className="text-xs text-slate-400">(optional)</span>
            </label>
            <PhoneInput
              value={formData.phone}
              onChange={(v) => {
                const updated = { ...formData, phone: v };
                setFormData(updated);
                if (errors.phone) {
                  const revalidated = validate(updated);
                  setErrors(prev => ({ ...prev, phone: revalidated.phone || null }));
                }
              }}
              placeholder="Local number"
              error={errors.phone}
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute top-2.5 left-3 h-5 w-5 text-slate-400" />
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`block w-full rounded-lg border bg-slate-50 pl-10 pr-4 py-2.5 text-slate-900 transition focus:bg-white focus:ring-4 outline-none ${
                  errors.password
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-50'
                    : 'border-slate-200 focus:border-blue-600 focus:ring-blue-50'
                }`}
                placeholder="••••••••"
              />
            </div>
            {formData.password.length === 0 && !errors.password ? null : passwordMet ? (
              <span className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                <CheckIcon /> Password meets requirements
              </span>
            ) : (
              <span className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                <WarnIcon /> Must be at least 8 characters
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center rounded-lg bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-70 shadow-md shadow-slate-300"
          >
            {isSubmitting ? 'Creating account...' : 'Continue'} <ArrowRight size={18} className="ml-2" />
          </button>
        </form>

        <div className="mt-8 border-t border-slate-100 pt-6 text-center">
          <p className="text-xs text-slate-400">v1.1.0 — © 2026 Ayiks Inc.</p>
        </div>
      </div>
    </div>
  );
}
