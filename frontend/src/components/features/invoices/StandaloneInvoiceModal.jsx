import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { quotesApi } from '@api/jobs';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-white';
const labelClass = 'block text-xs font-medium text-gray-700 mb-1';
const fmt = (n) => `GH₵${parseFloat(n || 0).toFixed(2)}`;

const newItem = () => ({ description: '', quantity: 1, unitPrice: 0 });

export default function StandaloneInvoiceModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();

  const [client, setClient] = useState({ name: '', phone: '', email: '' });
  const [vehicle, setVehicle] = useState({ make: '', model: '', reg: '' });
  const [jobType, setJobType] = useState('');
  const [items, setItems] = useState([newItem()]);
  const [labourCost, setLabourCost] = useState('');
  const [miscCost, setMiscCost] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: (data) => quotesApi.createQuote(data),
    onSuccess: (resp) => {
      const num = resp?.data?.quoteNumber || 'invoice';
      toast.success(`Invoice ${num} created`);
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      handleClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to create invoice');
    },
  });

  const handleClose = () => {
    setClient({ name: '', phone: '', email: '' });
    setVehicle({ make: '', model: '', reg: '' });
    setJobType('');
    setItems([newItem()]);
    setLabourCost('');
    setMiscCost('');
    setNotes('');
    setErrors({});
    onClose();
  };

  // Item helpers
  const updateItem = (i, field, value) => {
    setItems((prev) =>
      prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item)
    );
  };
  const addItem = () => setItems((prev) => [...prev, newItem()]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  // Live totals
  const itemsTotal = items.reduce((sum, item) => {
    return sum + parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0);
  }, 0);
  const labour = parseFloat(labourCost || 0);
  const misc = parseFloat(miscCost || 0);
  const grandTotal = itemsTotal + labour + misc;

  const handleSubmit = () => {
    const newErrors = {};
    if (!client.name.trim()) newErrors.clientName = 'Client name is required';
    items.forEach((item, i) => {
      if (!item.description.trim()) newErrors[`item_${i}_desc`] = 'Required';
    });
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    mutation.mutate({
      clientName: client.name.trim(),
      clientPhone: client.phone.trim() || undefined,
      clientEmail: client.email.trim() || undefined,
      vehicleMake: vehicle.make.trim() || undefined,
      vehicleModel: vehicle.model.trim() || undefined,
      vehicleRegNumber: vehicle.reg.trim() || undefined,
      jobType: jobType || undefined,
      labourCost: labour,
      miscellaneousCost: misc,
      notes: notes.trim() || undefined,
      items: items
        .filter((item) => item.description.trim())
        .map((item) => ({
          materialName: item.description.trim(),
          quantity: parseFloat(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          subtotal: parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0),
          isExternal: true,
        })),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Invoice" size="lg">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

        {/* CLIENT */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Client Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Client Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={`${inputClass} ${errors.clientName ? 'border-red-400' : ''}`}
                placeholder="e.g. John Mensah"
                value={client.name}
                onChange={(e) => { setClient((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, clientName: null })); }}
              />
              {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="text" className={inputClass} placeholder="0XX XXX XXXX"
                value={client.phone} onChange={(e) => setClient((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" className={inputClass} placeholder="client@example.com"
                value={client.email} onChange={(e) => setClient((p) => ({ ...p, email: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* VEHICLE */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Vehicle <span className="font-normal normal-case text-gray-400">(optional)</span></h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelClass}>Make</label>
              <input type="text" className={inputClass} placeholder="Toyota"
                value={vehicle.make} onChange={(e) => setVehicle((p) => ({ ...p, make: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Model</label>
              <input type="text" className={inputClass} placeholder="Camry"
                value={vehicle.model} onChange={(e) => setVehicle((p) => ({ ...p, model: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Registration</label>
              <input type="text" className={inputClass} placeholder="GR-1234-24"
                value={vehicle.reg} onChange={(e) => setVehicle((p) => ({ ...p, reg: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Job Type</label>
              <select className={inputClass} value={jobType} onChange={(e) => setJobType(e.target.value)}>
                <option value="">— select —</option>
                <option value="mechanic">Mechanic</option>
                <option value="sprayer">Sprayer</option>
                <option value="bodyworks">Body Works</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* ITEMS */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Items / Services</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-2 px-3 text-left text-xs font-semibold text-gray-600 w-6">#</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold text-gray-600">Description</th>
                  <th className="py-2 px-3 text-right text-xs font-semibold text-gray-600 w-20">Qty</th>
                  <th className="py-2 px-3 text-right text-xs font-semibold text-gray-600 w-28">Unit Price</th>
                  <th className="py-2 px-3 text-right text-xs font-semibold text-gray-600 w-28">Subtotal</th>
                  <th className="py-2 px-3 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const subtotal = parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0);
                  return (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-1.5 px-3 text-gray-500 text-xs">{i + 1}</td>
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-gray-900 focus:border-gray-900 ${errors[`item_${i}_desc`] ? 'border-red-400' : 'border-gray-200'}`}
                          placeholder="Service or part description"
                          value={item.description}
                          onChange={(e) => { updateItem(i, 'description', e.target.value); setErrors((p) => ({ ...p, [`item_${i}_desc`]: null })); }}
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <input type="number" min="0" step="0.01"
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded text-right focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, 'quantity', e.target.value)} />
                      </td>
                      <td className="py-1.5 px-3">
                        <input type="number" min="0" step="0.01"
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded text-right focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} />
                      </td>
                      <td className="py-1.5 px-3 text-right text-sm font-medium text-gray-900">
                        {subtotal.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        {items.length > 1 && (
                          <button onClick={() => removeItem(i)}
                            className="text-gray-400 hover:text-red-500 transition-colors text-xs">✕</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
              <button onClick={addItem}
                className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors">
                <span className="text-base leading-none">+</span> Add Item
              </button>
            </div>
          </div>
        </div>

        {/* COSTS + NOTES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Labour Cost (GH₵)</label>
              <input type="number" min="0" step="0.01" className={inputClass} placeholder="0.00"
                value={labourCost} onChange={(e) => setLabourCost(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Miscellaneous Cost (GH₵)</label>
              <input type="number" min="0" step="0.01" className={inputClass} placeholder="0.00"
                value={miscCost} onChange={(e) => setMiscCost(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <textarea rows={3} className={inputClass} placeholder="Any additional notes..."
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          {/* TOTALS */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 self-start">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Summary</h3>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Items sub-total</span>
              <span className="font-medium">{fmt(itemsTotal)}</span>
            </div>
            {labour > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Labour</span>
                <span className="font-medium">{fmt(labour)}</span>
              </div>
            )}
            {misc > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Miscellaneous</span>
                <span className="font-medium">{fmt(misc)}</span>
              </div>
            )}
            <div className="border-t border-gray-300 pt-2 flex justify-between text-base font-bold text-gray-900">
              <span>Total</span>
              <span>{fmt(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
        <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={mutation.isPending}
          className="bg-gray-900 hover:bg-black text-white"
        >
          Create Invoice
        </Button>
      </div>
    </Modal>
  );
}
