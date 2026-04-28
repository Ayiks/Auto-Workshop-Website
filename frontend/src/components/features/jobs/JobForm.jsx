import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { materialsApi } from '@api/materials';
import { invoicesApi, quotesApi } from '@api/jobs';
import { settingsApi } from '@api/settings';
import { useAuthStore } from '@stores/authStore';
import Button from '@components/common/Button';
import CustomerSelect from '@components/common/CustomerSelect';
import { uploadToCloudinary } from '@/services/cloudinary';
import { toast } from 'react-hot-toast';
import PhoneInput, { isValidPhone } from '@components/common/PhoneInput';

const CURRENT_YEAR = new Date().getFullYear();

const REMINDER_INTERVALS = [
  { label: '1 Month', value: 1 },
  { label: '3 Months', value: 3 },
  { label: '6 Months', value: 6 },
  { label: '1 Year', value: 12 },
];

const REMINDER_TYPES = [
  { value: 'follow_up', label: 'Follow up on job' },
  { value: 'oil_coolant_change', label: 'Oil / Coolant change' },
  { value: 'general_check', label: 'General check' },
  { value: 'how_was_job', label: 'How was the job?' },
];

export default function JobForm({ job, onSubmit, onCancel, isLoading }) {
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    jobType: job?.jobType || getDefaultJobType(user?.role) || 'mechanic',
    clientName: job?.clientName || '',
    clientPhone: job?.clientPhone || '',
    clientEmail: job?.clientEmail || '',
    vehicleMake: job?.vehicleMake || '',
    vehicleModel: job?.vehicleModel || '',
    vehicleRegNumber: job?.vehicleRegNumber || '',
    vehicleYear: job?.vehicle?.year || '',
    odometer: job?.odometer || '',
    problemType: job?.problemType || '',
    problemDescription: job?.problemDescription || '',
    labourCost: job?.labourCost || 0,
    miscellaneousCost: job?.miscellaneousCost || 0,
  });

  const [materials, setMaterials] = useState(job?.materials || []);
  const [errors, setErrors] = useState({});

  // Customer/vehicle selection state
  const [customerSelectValue, setCustomerSelectValue] = useState(
    job ? { name: job.clientName || '', type: job.customerId ? 'registered' : 'walking' } : null
  );
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  // Before photos (uploaded to Cloudinary at selection time, saved on submit)
  const [beforePhotos, setBeforePhotos] = useState([]);  // [{ url, publicId }]
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const beforePhotoInputRef = useRef(null);

  const handleBeforePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be less than 5MB'); return; }
    setUploadingBefore(true);
    try {
      const url = await uploadToCloudinary(file);
      setBeforePhotos(prev => [...prev, { url, publicId: url.split('/').slice(-2).join('/') }]);
    } catch {
      toast.error('Photo upload failed. Please try again.');
    } finally {
      setUploadingBefore(false);
    }
  };

  // Reminder state
  const [reminderEnabled, setReminderEnabled] = useState(job?.reminderEnabled || false);
  const [reminderIntervalMonths, setReminderIntervalMonths] = useState(job?.reminderIntervalMonths || 3);
  const [reminderTypes, setReminderTypes] = useState(job?.reminderTypes || []);
  const [reminderChannels, setReminderChannels] = useState(['sms']);

  // Invoice pre-fill picker (create mode only)
  const [showInvoicePicker, setShowInvoicePicker] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // Fetch inventory materials
  const { data: materialsData } = useQuery({
    queryKey: ['materials', { status: 'active' }],
    queryFn: () => materialsApi.getMaterials({ status: 'active' }),
  });

  const { data: settingsData } = useQuery({
    queryKey: ['business-settings'],
    queryFn: settingsApi.getBusinessSettings,
  });

  // Fetch invoices for pre-fill (lazy: only when picker is open)
  const { data: invoicesResp } = useQuery({
    queryKey: ['invoices-for-prefill'],
    queryFn: () => invoicesApi.getInvoices({}),
    enabled: showInvoicePicker && !job, // only in create mode
    staleTime: 2 * 60 * 1000,
  });
  const allInvoices = invoicesResp?.data || [];
  const filteredInvoices = invoiceSearch.trim()
    ? allInvoices.filter(inv =>
        inv.invoiceNumber?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        inv.job?.clientName?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        inv.job?.vehicleRegNumber?.toLowerCase().includes(invoiceSearch.toLowerCase())
      )
    : allInvoices.slice(0, 20);

  const enabledJobTypes = settingsData?.data?.enabledJobTypes ?? ['mechanic', 'sprayer', 'bodyworks', 'other'];

  // Generate standalone invoice mutation
  const createQuoteMutation = useMutation({
    mutationFn: (data) => quotesApi.createQuote(data),
    onSuccess: (resp) => {
      const quoteNumber = resp?.data?.quoteNumber || 'invoice';
      toast.success(`Invoice ${quoteNumber} created`);
      onCancel();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to create invoice');
    },
  });

  const handleGenerateInvoice = () => {
    if (!formData.clientName?.trim()) {
      toast.error('Client name is required to generate an invoice');
      return;
    }
    const payload = {
      clientName: formData.clientName,
      clientPhone: formData.clientPhone,
      clientEmail: formData.clientEmail,
      vehicleMake: formData.vehicleMake,
      vehicleModel: formData.vehicleModel,
      vehicleRegNumber: formData.vehicleRegNumber,
      jobType: formData.jobType,
      problemType: formData.problemType,
      labourCost: parseFloat(formData.labourCost) || 0,
      miscellaneousCost: parseFloat(formData.miscellaneousCost) || 0,
      items: materials.map((m) => ({
        materialName: m.name || m.materialName || 'Item',
        quantity: parseFloat(m.quantity) || 1,
        unitPrice: parseFloat(m.unitPrice) || 0,
        isExternal: m.isExternal !== false,
      })),
    };
    createQuoteMutation.mutate(payload);
  };

  const inventoryMaterials = materialsData?.data || [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: null });
  };

  const handleCustomerSelect = (selected) => {
    setCustomerSelectValue(selected);
    if (!selected) {
      setFormData(prev => ({ ...prev, clientName: '' }));
      setAvailableVehicles([]);
      setSelectedVehicleId(null);
      return;
    }
    if (selected.type === 'registered') {
      const vehicles = selected.vehicles || [];
      setAvailableVehicles(vehicles);

      const baseUpdate = {
        clientName: selected.name,
        clientPhone: selected.phone || formData.clientPhone,
        clientEmail: selected.email || formData.clientEmail,
      };

      if (vehicles.length === 1) {
        // Single vehicle — auto-fill
        const v = vehicles[0];
        setSelectedVehicleId(v.id);
        setFormData(prev => ({
          ...prev,
          ...baseUpdate,
          vehicleMake: v.make || '',
          vehicleModel: v.model || '',
          vehicleRegNumber: v.regNumber || '',
          vehicleYear: v.year || '',
          odometer: v.mileage || prev.odometer,
        }));
      } else if (vehicles.length > 1) {
        // Multiple vehicles — clear vehicle fields, wait for picker
        setSelectedVehicleId(null);
        setFormData(prev => ({
          ...prev,
          ...baseUpdate,
          vehicleMake: '',
          vehicleModel: '',
          vehicleRegNumber: '',
          vehicleYear: '',
          odometer: '',
        }));
      } else {
        // No vehicles registered yet
        setFormData(prev => ({ ...prev, ...baseUpdate }));
      }
    } else {
      setAvailableVehicles([]);
      setSelectedVehicleId(null);
      setFormData(prev => ({ ...prev, clientName: selected.name }));
    }
    if (errors.clientName) setErrors(prev => ({ ...prev, clientName: null }));
  };

  const handleLoadFromInvoice = (inv) => {
    const j = inv.job || {};
    setFormData(prev => ({
      ...prev,
      clientName: j.clientName || prev.clientName,
      clientPhone: j.clientPhone || prev.clientPhone,
      clientEmail: j.clientEmail || prev.clientEmail,
      vehicleMake: j.vehicleMake || prev.vehicleMake,
      vehicleModel: j.vehicleModel || prev.vehicleModel,
      vehicleRegNumber: j.vehicleRegNumber || prev.vehicleRegNumber,
    }));
    if (j.clientName) {
      setCustomerSelectValue({ name: j.clientName, type: 'walking' });
    }
    setShowInvoicePicker(false);
    setInvoiceSearch('');
    toast.success(`Pre-filled from invoice ${inv.invoiceNumber}`);
  };

  const handleVehiclePick = (vehicleId) => {
    setSelectedVehicleId(vehicleId);
    const v = availableVehicles.find(v => v.id === parseInt(vehicleId));
    if (v) {
      setFormData(prev => ({
        ...prev,
        vehicleMake: v.make || '',
        vehicleModel: v.model || '',
        vehicleRegNumber: v.regNumber || '',
        vehicleYear: v.year || '',
        odometer: v.mileage || prev.odometer,
      }));
    }
  };

  const toggleReminderType = (type) => {
    setReminderTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const addMaterial = () => {
    setMaterials([
      ...materials,
      { id: Date.now(), isExternal: false, materialId: '', materialName: '', quantity: 0, unitPrice: 0, subtotal: 0, baseUnit: '' },
    ]);
  };

  const removeMaterial = (id) => {
    setMaterials(materials.filter((m) => m.id !== id));
  };

  const updateMaterial = (id, field, value) => {
    setMaterials(
      materials.map((m) => {
        if (m.id === id) {
          const updated = { ...m, [field]: value };

          if (field === 'materialId' && value) {
            const material = inventoryMaterials.find((inv) => inv.id === parseInt(value));
            if (material) {
              updated.materialName = material.name;
              updated.unitPrice = material.sellingPrice;
              updated.subtotal = material.sellingPrice * updated.quantity;
              updated.maxQuantity = material.quantity;
              updated.baseUnit = material.baseUnit || 'pcs';
            }
          }

          if (field === 'isExternal') {
            if (value) {
              updated.materialId = null;
              updated.maxQuantity = null;
              updated.baseUnit = '';
            } else {
              updated.materialName = '';
              updated.baseUnit = '';
            }
          }

          if (field === 'quantity' || field === 'unitPrice') {
            updated.subtotal = parseFloat(updated.unitPrice || 0) * parseFloat(updated.quantity || 0);
          }

          return updated;
        }
        return m;
      })
    );
  };

  const materialsCost = materials.reduce((sum, m) => sum + parseFloat(m.subtotal || 0), 0);
  const totalCost = materialsCost + parseFloat(formData.labourCost || 0) + parseFloat(formData.miscellaneousCost || 0);

  const validate = () => {
    const newErrors = {};

    if (!formData.clientName.trim()) newErrors.clientName = 'Client name is required';
    if (!formData.clientPhone) {
      newErrors.clientPhone = 'Client phone is required';
    } else if (!isValidPhone(formData.clientPhone)) {
      newErrors.clientPhone = 'Please enter a valid phone number';
    }
    if (!formData.problemType.trim()) newErrors.problemType = 'Problem type is required';

    if (formData.vehicleYear) {
      const y = parseInt(formData.vehicleYear, 10);
      if (isNaN(y) || y < 1886 || y > CURRENT_YEAR) {
        newErrors.vehicleYear = `Year must be between 1886 and ${CURRENT_YEAR}`;
      }
    }

    if (formData.odometer && parseInt(formData.odometer, 10) < 0) {
      newErrors.odometer = 'Mileage cannot be negative';
    }

    for (const material of materials) {
      if (!material.isExternal && !material.materialId) {
        newErrors.materials = 'Please select material or mark as external';
        break;
      }
      if (material.isExternal && !material.materialName.trim()) {
        newErrors.materials = 'Please enter external material name';
        break;
      }
      if (material.quantity <= 0) {
        newErrors.materials = 'Material quantity must be greater than 0';
        break;
      }
    }

    if (reminderEnabled && reminderTypes.length === 0) {
      newErrors.reminderTypes = 'Select at least one reminder type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...formData,
        vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear, 10) : undefined,
        labourCost: parseFloat(formData.labourCost),
        miscellaneousCost: parseFloat(formData.miscellaneousCost || 0),
        materials: materials.map((m) => ({
          materialId: m.isExternal ? undefined : parseInt(m.materialId),
          materialName: m.materialName,
          quantity: parseFloat(m.quantity),
          unitPrice: parseFloat(m.unitPrice),
          isExternal: m.isExternal,
        })),
        beforePhotos,
        reminderEnabled,
        reminderIntervalMonths: reminderEnabled ? reminderIntervalMonths : undefined,
        reminderTypes: reminderEnabled ? reminderTypes : [],
        reminderChannels: reminderEnabled ? reminderChannels : [],
      });
    }
  };

  const inputClass = (hasError) => `w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-white border rounded-lg text-xs sm:text-sm transition-shadow focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
    hasError ? 'border-red-500' : 'border-gray-300'
  }`;

  return (
    <form onSubmit={handleSubmit} className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 h-full">

        {/* LEFT COLUMN: Data Entry */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">

          {/* 1. Job Type */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-5 shadow-sm">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">Job Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {enabledJobTypes.filter(type => isJobTypeAllowed(user?.role, type)).map((type) => {
                const allowed = true;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => allowed && setFormData({ ...formData, jobType: type })}
                    className={`px-4 py-3 rounded-md text-sm font-medium transition-all ${
                      formData.jobType === type
                        ? 'bg-black text-white border border-black shadow-md'
                        : allowed
                        ? 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
                        : 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed'
                    }`}
                    disabled={isLoading || !allowed}
                  >
                    {type === 'bodyworks' ? 'Body Works' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* LOAD FROM INVOICE — create mode only */}
          {!job && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-blue-900">Load from Past Invoice</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInvoicePicker(p => !p)}
                  className="text-xs text-blue-700 underline hover:text-blue-900"
                >
                  {showInvoicePicker ? 'Hide' : 'Show'}
                </button>
              </div>

              {showInvoicePicker && (
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Search by client name, reg number, or invoice #..."
                    value={invoiceSearch}
                    onChange={e => setInvoiceSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                    {filteredInvoices.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-3">No invoices found.</p>
                    ) : (
                      filteredInvoices.map(inv => (
                        <button
                          key={inv.id}
                          type="button"
                          onClick={() => handleLoadFromInvoice(inv)}
                          className="w-full text-left px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        >
                          <span className="font-mono text-xs text-gray-500">{inv.invoiceNumber}</span>
                          {' — '}
                          <span className="text-sm font-medium text-gray-900">{inv.job?.clientName || '—'}</span>
                          {inv.job?.vehicleRegNumber && (
                            <span className="text-xs text-gray-500 ml-2">· {inv.job.vehicleRegNumber}</span>
                          )}
                          {inv.job?.vehicleMake && (
                            <span className="text-xs text-gray-400 ml-1">({inv.job.vehicleMake} {inv.job.vehicleModel})</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Client & Vehicle */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-5 shadow-sm space-y-4 sm:space-y-6">

            {/* Client Section */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Client Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <CustomerSelect
                    value={customerSelectValue}
                    onChange={handleCustomerSelect}
                    label="Name *"
                  />
                  {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
                  <PhoneInput
                    value={formData.clientPhone}
                    onChange={(v) => {
                      setFormData(prev => ({ ...prev, clientPhone: v }));
                      if (errors.clientPhone) setErrors(prev => ({ ...prev, clientPhone: null }));
                    }}
                    disabled={isLoading}
                    placeholder="Local number"
                    error={errors.clientPhone}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    name="clientEmail"
                    value={formData.clientEmail}
                    onChange={handleChange}
                    className={inputClass(false)}
                    placeholder="client@example.com"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100"></div>

            {/* Vehicle Section */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                Vehicle Information
              </h3>

              {/* Multi-vehicle picker */}
              {availableVehicles.length > 1 && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-xs font-semibold text-blue-700 mb-1.5">Select Vehicle</label>
                  <div className="relative">
                    <select
                      value={selectedVehicleId || ''}
                      onChange={(e) => handleVehiclePick(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                    >
                      <option value="">— Choose a vehicle —</option>
                      {availableVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {[v.regNumber, v.make, v.model, v.year].filter(Boolean).join(' · ')}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">This customer has {availableVehicles.length} vehicles. Select one or fill in manually below.</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Make</label>
                  <input type="text" name="vehicleMake" value={formData.vehicleMake} onChange={handleChange}
                    className={inputClass(false)} placeholder="e.g. Toyota" disabled={isLoading} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
                  <input type="text" name="vehicleModel" value={formData.vehicleModel} onChange={handleChange}
                    className={inputClass(false)} placeholder="e.g. Camry" disabled={isLoading} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Registration</label>
                  <input type="text" name="vehicleRegNumber" value={formData.vehicleRegNumber} onChange={handleChange}
                    className={inputClass(false)} placeholder="e.g. GR-2345-24" disabled={isLoading} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                  <select
                    name="vehicleYear"
                    value={formData.vehicleYear}
                    onChange={handleChange}
                    className={inputClass(errors.vehicleYear)}
                    disabled={isLoading}
                  >
                    <option value="">Select year</option>
                    {Array.from({ length: CURRENT_YEAR - 1886 + 1 }, (_, i) => CURRENT_YEAR - i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  {errors.vehicleYear && <p className="text-xs text-red-500 mt-1">{errors.vehicleYear}</p>}
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mileage (km)</label>
                  <input type="number" name="odometer" value={formData.odometer} onChange={handleChange}
                    className={inputClass(errors.odometer)} placeholder="e.g. 85000" min="0" disabled={isLoading} />
                  {errors.odometer && <p className="text-xs text-red-500 mt-1">{errors.odometer}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Problem Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3 sm:mb-4">Problem Details</h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Issue Summary *</label>
                <input type="text" name="problemType" value={formData.problemType} onChange={handleChange}
                  className={inputClass(errors.problemType)} placeholder="e.g. Brake Failure" disabled={isLoading} />
                {errors.problemType && <p className="text-xs text-red-500 mt-1">{errors.problemType}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Detailed Description</label>
                <textarea name="problemDescription" value={formData.problemDescription} onChange={handleChange}
                  rows={4} className={inputClass(false)} placeholder="Describe the issue in detail..." disabled={isLoading} />
              </div>

              {/* Before Photos */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Before Photos
                  <span className="ml-1 text-gray-400 font-normal">(optional — document the problem)</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {beforePhotos.map((photo, idx) => (
                    <div key={photo.url} className="relative w-16 h-16 shrink-0">
                      <img src={photo.url} alt="Before" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => setBeforePhotos(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-gray-300 rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 text-gray-500 hover:text-red-500 text-xs leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {uploadingBefore && (
                    <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <svg className="animate-spin w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => beforePhotoInputRef.current?.click()}
                  disabled={uploadingBefore || isLoading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {uploadingBefore ? 'Uploading…' : 'Add Photo'}
                </button>
                <input
                  ref={beforePhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBeforePhotoSelect}
                />
              </div>
            </div>
          </div>

          {/* 4. Reminders */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                Reminders
              </h3>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setReminderEnabled(!reminderEnabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${reminderEnabled ? 'bg-black' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${reminderEnabled ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-xs text-gray-600">{reminderEnabled ? 'On' : 'Off'}</span>
              </label>
            </div>

            <p className="text-xs text-gray-500 mb-3 bg-gray-50 px-3 py-2 rounded border border-gray-100">
              A 1-week check-in is sent automatically after every completed job.
            </p>

            {reminderEnabled && (
              <div className="space-y-4">
                {/* Interval */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Reminder Interval</label>
                  <div className="grid grid-cols-4 gap-2">
                    {REMINDER_INTERVALS.map(({ label, value }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReminderIntervalMonths(value)}
                        className={`py-2 text-xs font-medium rounded-md border transition-all ${
                          reminderIntervalMonths === value
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Types */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Reminder Types</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {REMINDER_TYPES.map(({ value, label }) => {
                      const checked = reminderTypes.includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleReminderType(value)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all ${
                            checked ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-colors ${
                            checked ? 'bg-white border-white' : 'border-gray-300'
                          }`}>
                            {checked && (
                              <svg className="w-2.5 h-2.5 text-gray-900" fill="currentColor" viewBox="0 0 12 12">
                                <path d="M3.707 5.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L5 6.586 3.707 5.293z" />
                              </svg>
                            )}
                          </span>
                          <span className="text-xs font-medium">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.reminderTypes && <p className="text-xs text-red-500 mt-1">{errors.reminderTypes}</p>}
                </div>

                {/* Channels */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Send Via</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'email', label: 'Email' },
                      { value: 'sms', label: 'SMS' },
                      { value: 'whatsapp', label: 'WhatsApp' },
                    ].map(({ value, label }) => {
                      const active = reminderChannels.includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReminderChannels(prev =>
                            active ? prev.filter(c => c !== value) : [...prev, value]
                          )}
                          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                            active ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Reminders will repeat every <strong>{REMINDER_INTERVALS.find(i => i.value === reminderIntervalMonths)?.label}</strong> indefinitely until cancelled.
                </p>
              </div>
            )}
          </div>

          {/* 5. Materials List */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
              <h3 className="text-sm font-bold text-gray-900">Materials Used</h3>
              <button type="button" onClick={addMaterial} disabled={isLoading}
                className="text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-black transition-colors whitespace-nowrap">
                + Add Item
              </button>
            </div>

            {errors.materials && (
              <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 border border-red-100 rounded text-xs text-red-600">
                {errors.materials}
              </div>
            )}

            <div className="space-y-2 sm:space-y-3">
              {materials.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded border border-dashed border-gray-300">
                  <p className="text-sm text-gray-500">No materials added.</p>
                </div>
              ) : (
                materials.map((material, index) => (
                  <div key={material.id} className="bg-gray-50 p-2 sm:p-3 rounded border border-gray-200">
                    {/* Row 1: Controls */}
                    <div className="flex justify-between items-center mb-2 gap-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Item {index + 1}</span>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <label className="flex items-center gap-1 sm:gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={material.isExternal}
                            onChange={(e) => updateMaterial(material.id, 'isExternal', e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-gray-900 focus:ring-black border-gray-300" disabled={isLoading} />
                          <span className="text-xs text-gray-600">External</span>
                        </label>
                        <button type="button" onClick={() => removeMaterial(material.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Name | Qty | Unit | Price | Total */}
                    <div className="grid grid-cols-12 gap-1 sm:gap-2 items-center">
                      {/* Name / Select — 4 cols */}
                      <div className="col-span-4">
                        {material.isExternal ? (
                          <input value={material.materialName}
                            onChange={(e) => updateMaterial(material.id, 'materialName', e.target.value)}
                            placeholder="Item Name" className={inputClass(false)} />
                        ) : (
                          <div className="relative">
                            <select value={material.materialId}
                              onChange={(e) => updateMaterial(material.id, 'materialId', e.target.value)}
                              className={`${inputClass(false)} appearance-none`}>
                              <option value="">Select...</option>
                              {inventoryMaterials.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Qty — 2 cols */}
                      <div className="col-span-2">
                        <input type="number" step="0.1" value={material.quantity}
                          onChange={(e) => updateMaterial(material.id, 'quantity', e.target.value)}
                          placeholder="Qty" className={inputClass(false)} />
                      </div>

                      {/* Unit — 1 col */}
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="text-xs text-gray-400 font-medium truncate" title={material.baseUnit || '—'}>
                          {material.baseUnit || '—'}
                        </span>
                      </div>

                      {/* Price — 2 cols */}
                      <div className="col-span-2 flex items-stretch border border-gray-300 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-black focus-within:border-black bg-white">
                        <span className="flex items-center px-1.5 text-gray-400 text-xs bg-gray-50 border-r border-gray-200 select-none">₵</span>
                        <input type="number" value={material.unitPrice}
                          onChange={(e) => updateMaterial(material.id, 'unitPrice', e.target.value)}
                          className="flex-1 min-w-0 px-1.5 py-1.5 text-xs sm:text-sm bg-white focus:outline-none"
                          disabled={!material.isExternal && material.materialId} />
                      </div>

                      {/* Total — 3 cols */}
                      <div className="col-span-3 flex flex-col items-end justify-center">
                        <span className="text-xs text-gray-400 leading-none mb-0.5">Total</span>
                        <span className="text-sm font-bold text-gray-900">
                          ₵{parseFloat(material.subtotal || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Summary & Actions */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-3 sm:space-y-4">

            <div className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
              <div className="bg-gray-50 px-3 sm:px-5 py-2 sm:py-3 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-900">Cost Breakdown</h3>
              </div>

              <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-gray-500">Materials Total</span>
                  <span className="font-medium text-gray-900">GH₵{materialsCost.toFixed(2)}</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 sm:mb-1.5">Labour Cost</label>
                  <div className="relative">
                    <span className="absolute left-2 sm:left-3 top-2 sm:top-2.5 text-gray-500 text-xs sm:text-sm">GH₵</span>
                    <input type="number" name="labourCost" value={formData.labourCost} onChange={handleChange}
                      placeholder="0.00" min="0"
                      className={`${inputClass(false)} pl-8 sm:pl-10 font-medium text-right`} disabled={isLoading} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 sm:mb-1.5">Miscellaneous</label>
                  <div className="relative">
                    <span className="absolute left-2 sm:left-3 top-2 sm:top-2.5 text-gray-500 text-xs sm:text-sm">GH₵</span>
                    <input type="number" name="miscellaneousCost" value={formData.miscellaneousCost} onChange={handleChange}
                      placeholder="0.00" min="0"
                      className={`${inputClass(false)} pl-8 sm:pl-10 font-medium text-right`} disabled={isLoading} />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 sm:pt-4 mt-2">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-gray-900">Grand Total</span>
                    <span className="text-xl sm:text-2xl font-bold text-black tracking-tight">
                      GH₵{totalCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 sm:p-4 bg-gray-50 border-t border-gray-200 space-y-2">
                <Button type="submit" variant="primary" loading={isLoading}
                  className="w-full justify-center bg-black hover:bg-gray-800 text-white text-xs sm:text-sm">
                  {job ? 'Save Changes' : 'Create Job'}
                </Button>
                {!job && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={handleGenerateInvoice}
                      loading={createQuoteMutation.isPending} disabled={isLoading}
                      className="w-full justify-center border-amber-400 text-amber-700 hover:bg-amber-50 text-xs sm:text-sm">
                      Generate Invoice
                    </Button>
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || createQuoteMutation.isPending}
                      className="w-full justify-center border-gray-300 text-gray-700 hover:bg-gray-100 text-xs sm:text-sm">
                      Cancel
                    </Button>
                  </div>
                )}
                {job && (
                  <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}
                    className="w-full justify-center border-gray-300 text-gray-700 hover:bg-gray-100 text-xs sm:text-sm">
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-100">
              <p className="text-xs text-gray-500 leading-relaxed">
                <span className="font-semibold text-gray-900 block mb-1">Note:</span>
                Materials are for reference and cost tracking only — stock is not deducted. External materials require manual price entry.
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function getDefaultJobType(role) {
  const roleMap = { mechanic: 'mechanic', sprayer: 'sprayer', bodyworks: 'bodyworks' };
  return roleMap[role] || 'mechanic';
}

function isJobTypeAllowed(role, type) {
  if (!role || role === 'admin') return true;
  const myType = { mechanic: 'mechanic', sprayer: 'sprayer', bodyworks: 'bodyworks' }[role];
  if (!myType) return true;
  return type === myType || type === 'other';
}
