import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wrench, Paintbrush, Car, MoreHorizontal, Upload, CheckCircle } from 'lucide-react';
import { settingsApi } from '@api/settings';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import LoadingSpinner from '@components/common/LoadingSpinner';
import { uploadLogoToCloudinary } from '@/services/cloudinary';
import { toast } from 'react-hot-toast';

const JOB_TYPE_OPTIONS = [
  { value: 'mechanic',  label: 'Mechanic',    icon: Wrench,         desc: 'Engine, brakes, suspension, electrical' },
  { value: 'sprayer',   label: 'Sprayer',      icon: Paintbrush,     desc: 'Full respray, touch-up, primer & paint' },
  { value: 'bodyworks', label: 'Body Works',   icon: Car,            desc: 'Panel beating, dent removal, welding' },
  { value: 'other',     label: 'Other',        icon: MoreHorizontal, desc: 'Other workshop services' },
];

export default function BusinessSettings() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const logoInputRef = useRef(null);

  const { data: settingsResponse, isLoading } = useQuery({
    queryKey: ['business-settings'],
    queryFn: settingsApi.getBusinessSettings,
  });

  const settings = settingsResponse?.data;

  const [formData, setFormData] = useState({
    name: settings?.name || '',
    address: settings?.address || '',
    phone: settings?.phone || '',
    email: settings?.email || '',
    website: settings?.website || '',
    enabledJobTypes: settings?.enabledJobTypes ?? ['mechanic', 'sprayer', 'bodyworks', 'other'],
  });

  // Re-sync state when data loads
  useState(() => {
    if (settings) {
      setFormData({
        ...settings,
        enabledJobTypes: settings.enabledJobTypes ?? ['mechanic', 'sprayer', 'bodyworks', 'other'],
      });
    }
  }, [settings]);

  const toggleJobType = (value) => {
    setFormData(prev => {
      const current = prev.enabledJobTypes;
      if (current.includes(value)) {
        return current.length > 1 ? { ...prev, enabledJobTypes: current.filter(t => t !== value) } : prev;
      }
      return { ...prev, enabledJobTypes: [...current, value] };
    });
  };

  const updateMutation = useMutation({
    mutationFn: settingsApi.updateBusinessSettings,
    onSuccess: () => {
      queryClient.invalidateQueries(['business-settings']);
      setIsEditing(false);
      toast.success('Business settings updated');
    },
    onError: (error) => toast.error(error.response?.data?.error || 'Failed to update settings'),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setLogoPreview(null);
    if (settings) setFormData({
      ...settings,
      enabledJobTypes: settings.enabledJobTypes ?? ['mechanic', 'sprayer', 'bodyworks', 'other'],
    });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const url = await uploadLogoToCloudinary(file);
      await settingsApi.updateBusinessSettings({ logo: url });
      queryClient.invalidateQueries(['business-settings']);
    } catch {
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center"><LoadingSpinner /></div>;

  return (
    <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 bg-gray-50/50">
        <div>
          <h2 className="text-sm sm:text-base text-gray-900">Organization Profile</h2>
          <p className="text-xs text-gray-500 mt-0.5">Details used for billing and documentation</p>
        </div>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit Details</Button>
        ) : (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="secondary" size="sm" onClick={handleCancel} className="flex-1 sm:flex-none">Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={updateMutation.isPending} className="flex-1 sm:flex-none bg-gray-900 hover:bg-black text-white">Save Changes</Button>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Logo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-start">
          <label className="block text-xs sm:text-sm text-gray-700 sm:mt-2">Business Logo</label>
          <div className="sm:col-span-2">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 bg-slate-50">
                {logoPreview || settings?.logo ? (
                  <img
                    src={logoPreview || settings?.logo}
                    alt="Business logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-slate-700 font-bold text-lg">
                    {(settings?.name || 'BZ').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                )}
              </div>
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                  className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  <Upload size={13} />
                  {logoUploading ? 'Uploading...' : settings?.logo ? 'Change Logo' : 'Upload Logo'}
                </button>
                <p className="text-[11px] text-gray-400 mt-1.5">PNG, JPG or SVG. Max 5MB.</p>
                {logoUploading && <p className="text-[11px] text-blue-600 mt-1">Uploading...</p>}
                {!logoUploading && logoPreview && (
                  <p className="text-[11px] text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle size={11} /> Logo updated
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Name */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-start">
          <label className="block text-xs sm:text-sm text-gray-700 sm:mt-2">Business Name</label>
          <div className="sm:col-span-2">
            <input
              type="text"
              name="name"
              value={isEditing ? formData.name : settings?.name || ''}
              onChange={handleChange}
              disabled={!isEditing}
              className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-xs sm:text-sm disabled:bg-gray-50 disabled:text-gray-500 transition-colors" 
              placeholder="e.g. Acme Corp"
            />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-start">
          <label className="block text-xs sm:text-sm text-gray-700 sm:mt-2">Contact Details</label>
          <div className="sm:col-span-2 space-y-3 sm:space-y-4">
            <div>
                <label className="block text-xs text-gray-500 mb-1">Email Address</label>
                <input
                type="email"
                name="email"
                value={isEditing ? formData.email : settings?.email || ''}
                onChange={handleChange}
                disabled={!isEditing}
                className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-xs sm:text-sm disabled:bg-gray-50 disabled:text-gray-500 transition-colors" 
                />
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Phone Number</label>
                <input
                type="tel"
                name="phone"
                value={isEditing ? formData.phone : settings?.phone || ''}
                onChange={handleChange}
                disabled={!isEditing}
                className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-xs sm:text-sm disabled:bg-gray-50 disabled:text-gray-500 transition-colors" 
                />
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Website</label>
                <input
                type="url"
                name="website"
                value={isEditing ? formData.website : settings?.website || ''}
                onChange={handleChange}
                disabled={!isEditing}
                className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-xs sm:text-sm disabled:bg-gray-50 disabled:text-gray-500 transition-colors" 
                />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Address */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-start">
          <label className="block text-xs sm:text-sm text-gray-700 sm:mt-2">Physical Address</label>
          <div className="sm:col-span-2">
            <textarea
              name="address"
              rows={3}
              value={isEditing ? formData.address : settings?.address || ''}
              onChange={handleChange}
              disabled={!isEditing}
                        className="block w-full rounded-lg p-2 border border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-xs sm:text-sm disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
            />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Workshop Specializations */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-start">
          <div>
            <label className="block text-xs sm:text-sm text-gray-700">Workshop Specializations</label>
            <p className="text-[11px] text-gray-400 mt-0.5">Controls which job types and staff roles are available.</p>
          </div>
          <div className="sm:col-span-2">
            {isEditing ? (
              <div className="grid grid-cols-2 gap-2">
                {JOB_TYPE_OPTIONS.map(({ value, label, icon: Icon, desc }) => {
                  const selected = formData.enabledJobTypes.includes(value);
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
            ) : (
              <div className="flex flex-wrap gap-2">
                {(settings?.enabledJobTypes ?? ['mechanic', 'sprayer', 'bodyworks', 'other']).map(type => {
                  const opt = JOB_TYPE_OPTIONS.find(o => o.value === type);
                  if (!opt) return null;
                  const Icon = opt.icon;
                  return (
                    <span key={type} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                      <Icon className="w-3 h-3" />
                      {opt.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}