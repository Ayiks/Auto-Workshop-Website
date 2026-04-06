import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import {
  Building2, ArrowRight, Wrench, Paintbrush, Car, MoreHorizontal,
  MessageSquare, MapPin, Phone, Mail, Upload, CheckCircle, Info,
} from 'lucide-react';
import Button from '@components/common/Button';
import { uploadLogoToCloudinary } from '@/services/cloudinary';

const JOB_TYPE_OPTIONS = [
  { value: 'mechanic',  label: 'Mechanic',   icon: Wrench,         desc: 'Engine, brakes, suspension, electrical' },
  { value: 'sprayer',   label: 'Sprayer',     icon: Paintbrush,     desc: 'Full respray, touch-up, primer & paint' },
  { value: 'bodyworks', label: 'Body Works',  icon: Car,            desc: 'Panel beating, dent removal, welding' },
  { value: 'other',     label: 'Other',       icon: MoreHorizontal, desc: 'Other workshop services' },
];

const STEPS = [
  { label: 'Identity' },
  { label: 'Services' },
  { label: 'Contact' },
  { label: 'Messaging' },
];

export default function SetupWorkspace() {
  const navigate = useNavigate();
  const { setupWorkspace, user, isLoading, error } = useAuthStore();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);

  // Step 1
  const [businessName, setBusinessName] = useState('');
  const [logo, setLogo] = useState('');

  // Step 2
  const [enabledJobTypes, setEnabledJobTypes] = useState(['mechanic', 'sprayer', 'bodyworks', 'other']);

  // Step 3
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 4
  const [arkeselSenderId, setArkeselSenderId] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    } else if (user && user.businessId) {
      navigate('/app/dashboard');
    }
    if (user?.email) setEmail(user.email);
    if (user?.phone) setPhone(user.phone);
  }, [navigate, user]);

  const toggleJobType = (value) => {
    setEnabledJobTypes(prev =>
      prev.includes(value)
        ? prev.length > 1 ? prev.filter(t => t !== value) : prev
        : [...prev, value]
    );
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const url = await uploadLogoToCloudinary(file);
      setLogo(url);
    } catch {
      // upload failed — preview stays but logo URL won't be set
      setLogo('');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    try {
      await setupWorkspace({
        businessName,
        enabledJobTypes,
        logo,
        address,
        phone,
        email,
        arkeselSenderId: arkeselSenderId || undefined,
        smsEnabled,
      });
    } catch (err) {
      console.error('Workspace setup failed', err);
    }
  };

  const canProceedStep1 = businessName.trim().length > 0;

  const initials = businessName
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'BZ';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="w-14 h-14 bg-black text-white rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-lg">
          <Building2 size={28} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Setup your workspace</h2>
        <p className="mt-1.5 text-sm text-gray-500">
          Welcome, <span className="font-semibold text-gray-700">{user?.email || 'there'}</span>! Let's configure your business.
        </p>
      </div>

      {/* Step indicator */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg mt-6 px-4">
        <div className="flex items-center justify-between mb-1">
          {STEPS.map((s, i) => {
            const num = i + 1;
            const isDone = step > num;
            const isCurrent = step === num;
            return (
              <div key={num} className="flex-1 flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  isDone ? 'bg-slate-900 border-slate-900 text-white'
                  : isCurrent ? 'border-slate-900 text-slate-900 bg-white'
                  : 'border-slate-200 text-slate-400 bg-white'
                }`}>
                  {isDone ? <CheckCircle size={14} /> : num}
                </div>
                <span className={`mt-1 text-[10px] hidden sm:block ${isCurrent ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="relative h-1 bg-slate-100 rounded-full mt-2">
          <div
            className="absolute left-0 top-0 h-1 bg-slate-900 rounded-full transition-all duration-300"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100 animate-in fade-in slide-in-from-bottom-8">
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border-l-4 border-red-500 text-sm font-semibold text-red-700 rounded-r-md">
            {error}
          </div>
        )}

        {/* ── STEP 1: Business Identity ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Business Identity</h3>
              <p className="text-xs text-gray-500 mt-0.5">Your business name and logo.</p>
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Business Name <span className="text-red-500">*</span></label>
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
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Business Logo <span className="text-xs font-normal text-gray-400">(optional)</span></label>
              <div className="flex items-center gap-4">
                {/* Preview */}
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 bg-slate-50">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-slate-900 font-bold text-lg">{initials}</span>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={logoUploading}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    <Upload size={14} />
                    {logoUploading ? 'Uploading...' : logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  <p className="text-xs text-gray-400 mt-1.5">PNG, JPG or SVG. Max 5MB.</p>
                  {logo && !logoUploading && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle size={12} /> Logo uploaded
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!canProceedStep1 || logoUploading}
              onClick={handleNext}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-slate-200"
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 2: Workshop Services ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Workshop Services</h3>
              <p className="text-xs text-gray-500 mt-0.5">Select all that apply. Controls which job types and staff roles are available.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {JOB_TYPE_OPTIONS.map(({ value, label, icon: Icon, desc }) => {
                const selected = enabledJobTypes.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleJobType(value)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-colors ${
                      selected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${selected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
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

            <div className="flex gap-3">
              <button type="button" onClick={handleBack} className="flex-1 py-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Back
              </button>
              <button type="button" onClick={handleNext} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition active:scale-[0.98]">
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Contact & Location ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-gray-900">Contact & Location</h3>
              <p className="text-xs text-gray-500 mt-0.5">Appears on invoices and receipts sent to customers.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">Business Address</label>
              <div className="relative">
                <MapPin className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-slate-900 text-sm transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none resize-none"
                  placeholder="e.g. 12 High Street, Accra, Ghana"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute top-1/2 -translate-y-1/2 left-3 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-slate-900 text-sm transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none"
                  placeholder="e.g. +233 24 000 0000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">Business Email</label>
              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2 left-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-slate-900 text-sm transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none"
                  placeholder="e.g. info@autofix.com"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={handleBack} className="flex-1 py-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Back
              </button>
              <button type="button" onClick={handleNext} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition active:scale-[0.98]">
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Messaging Setup ── */}
        {step === 4 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-gray-900">Messaging Setup</h3>
              <p className="text-xs text-gray-500 mt-0.5">Configure SMS notifications for your customers. You can skip this and set it up later.</p>
            </div>

            {/* SMS Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <MessageSquare size={15} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Enable SMS</p>
                  <p className="text-xs text-slate-500">Send automated messages to customers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSmsEnabled(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${smsEnabled ? 'bg-slate-900' : 'bg-slate-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${smsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Sender ID */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">
                SMS Sender ID
                <span className="text-xs font-normal text-gray-400 ml-2">({arkeselSenderId.length}/11 chars)</span>
              </label>
              <input
                type="text"
                maxLength={11}
                value={arkeselSenderId}
                onChange={(e) => setArkeselSenderId(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 text-sm transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none"
                placeholder="e.g. AutoFix (max 11 chars)"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                This is the name that appears as the sender on SMS messages. Max 11 characters.
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-2.5 text-xs text-blue-700">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>You can connect your Arkesel account and configure WhatsApp under <strong>Settings → Messaging</strong> after setup.</span>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={handleBack} className="flex-1 py-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Back
              </button>
              <Button
                type="submit"
                loading={isLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition active:scale-[0.98] disabled:opacity-60 shadow-md shadow-slate-200"
              >
                {isLoading ? 'Creating...' : 'Finish Setup'} {!isLoading && <ArrowRight size={16} />}
              </Button>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition py-1"
            >
              Skip messaging setup for now
            </button>
          </form>
        )}
      </div>

      {/* Persistent notice */}
      <p className="text-center text-xs text-gray-400 mt-5 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        All settings can be updated later under <span className="font-medium text-gray-500">Settings → Organisation Profile</span>
      </p>
    </div>
  );
}
