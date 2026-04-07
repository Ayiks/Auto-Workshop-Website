import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehiclesApi } from '@api/vehicles';
import Button from '@components/common/Button';
import { toast } from 'react-hot-toast';

const EMPTY_VEHICLE = { make: '', model: '', year: '', regNumber: '', color: '', vin: '', mileage: '' };

export default function VehicleList({ customerId, canEdit }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState(EMPTY_VEHICLE);

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', customerId],
    queryFn: () => vehiclesApi.getVehicles(customerId),
    enabled: !!customerId,
  });

  // vehiclesApi returns the array directly (axios interceptor already unwraps response.data)
  const vehicles = data || [];

  const createMutation = useMutation({
    mutationFn: (d) => vehiclesApi.createVehicle({ ...d, customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicles', customerId]);
      queryClient.invalidateQueries(['allCustomers']);
      resetForm();
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed to add vehicle'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => vehiclesApi.updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicles', customerId]);
      resetForm();
      toast.success('Vehicle updated');
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed to update vehicle'),
  });

  const deleteMutation = useMutation({
    mutationFn: vehiclesApi.deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicles', customerId]);
      queryClient.invalidateQueries(['allCustomers']);
      toast.success('Vehicle removed');
    },
    onError: (e) => toast.error(e.response?.data?.error?.message || 'Failed to remove vehicle'),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingVehicle(null);
    setFormData(EMPTY_VEHICLE);
  };

  const handleEdit = (v) => {
    setEditingVehicle(v);
    setFormData({ make: v.make || '', model: v.model || '', year: v.year || '', regNumber: v.regNumber || '', color: v.color || '', vin: v.vin || '', mileage: v.mileage || '' });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Remove this vehicle?')) deleteMutation.mutate(id);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const inputClass = 'block w-full rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-xs sm:text-sm shadow-sm focus:border-gray-900 focus:ring-gray-900 transition-shadow';

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicles</h4>
        {canEdit && !showForm && (
          <button
            type="button"
            onClick={() => { setEditingVehicle(null); setFormData(EMPTY_VEHICLE); setShowForm(true); }}
            className="text-xs font-medium text-gray-600 hover:text-black underline decoration-dotted transition-colors"
          >
            + Add Vehicle
          </button>
        )}
      </div>

      {/* Vehicle form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">Make</label>
              <input type="text" className={inputClass} placeholder="Toyota" value={formData.make} onChange={e => setFormData(p => ({ ...p, make: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">Model</label>
              <input type="text" className={inputClass} placeholder="Camry" value={formData.model} onChange={e => setFormData(p => ({ ...p, model: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">Year</label>
              <input type="number" className={inputClass} placeholder="2019" value={formData.year} onChange={e => setFormData(p => ({ ...p, year: e.target.value }))} min="1900" max="2099" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">Reg Number</label>
              <input type="text" className={inputClass} placeholder="GR-2345-24" value={formData.regNumber} onChange={e => setFormData(p => ({ ...p, regNumber: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">Color</label>
              <input type="text" className={inputClass} placeholder="Silver" value={formData.color} onChange={e => setFormData(p => ({ ...p, color: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">VIN</label>
              <input type="text" className={inputClass} placeholder="Optional" value={formData.vin} onChange={e => setFormData(p => ({ ...p, vin: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">Mileage (km)</label>
              <input type="number" className={inputClass} placeholder="e.g. 85000" value={formData.mileage} onChange={e => setFormData(p => ({ ...p, mileage: e.target.value }))} min="0" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" size="sm" onClick={resetForm} disabled={isMutating}>Cancel</Button>
            <Button variant="primary" type="submit" size="sm" loading={isMutating} className="bg-gray-900 hover:bg-black text-white">
              {editingVehicle ? 'Update' : 'Add Vehicle'}
            </Button>
          </div>
        </form>
      )}

      {/* Vehicle list */}
      {isLoading ? (
        <p className="text-xs text-gray-400 py-2">Loading vehicles...</p>
      ) : vehicles.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-1">No vehicles on record.</p>
      ) : (
        <div className="space-y-2">
          {vehicles.map((v) => (
            <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-medium text-gray-900">
                  {[v.year, v.make, v.model].filter(Boolean).join(' ') || 'Unknown vehicle'}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  {v.regNumber && (
                    <span className="text-[10px] font-mono font-semibold text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded uppercase">
                      {v.regNumber}
                    </span>
                  )}
                  {v.color && <span className="text-[10px] text-gray-400">{v.color}</span>}
                  {v.mileage != null && (
                    <span className="text-[10px] text-gray-400">{v.mileage.toLocaleString()} km</span>
                  )}
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(v)}
                    className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Remove"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
