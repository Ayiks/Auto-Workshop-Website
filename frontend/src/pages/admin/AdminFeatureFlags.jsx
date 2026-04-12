import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X } from 'lucide-react';
import { adminApi } from '@api/admin';
import toast from 'react-hot-toast';

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-indigo-600' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

function NewFlagModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ key: '', name: '', description: '', isGloballyEnabled: false });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.key || !form.name) return;
    onCreate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">New Feature Flag</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1">Key (snake_case)</label>
            <input
              type="text"
              value={form.key}
              onChange={(e) => setForm((p) => ({ ...p, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
              required
              placeholder="e.g. sms_module"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder="SMS Module"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-1">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="What does this flag control?"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Enable Globally</span>
            <Toggle checked={form.isGloballyEnabled} onChange={() => setForm((p) => ({ ...p, isGloballyEnabled: !p.isGloballyEnabled }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm py-2 rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm py-2 rounded-lg transition-colors">Create Flag</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminFeatureFlags() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [businessIdInput, setBusinessIdInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: () => adminApi.getFeatureFlags(),
    staleTime: 0,
  });

  const flags = data?.data || [];

  const createMutation = useMutation({
    mutationFn: (form) => adminApi.createFeatureFlag(form),
    onSuccess: () => {
      toast.success('Feature flag created');
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      setShowModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateFeatureFlag(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      setSelected(res.data);
      toast.success('Updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteFeatureFlag(id),
    onSuccess: () => {
      toast.success('Flag deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      setSelected(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleBizMutation = useMutation({
    mutationFn: ({ flagId, businessId }) => adminApi.toggleFlagForBusiness(flagId, businessId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      setSelected(res.data);
      setBusinessIdInput('');
      toast.success('Updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const selectedFlag = selected ? flags.find((f) => f.id === selected.id) || selected : null;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Feature Flags</h1>
          <p className="text-gray-500 text-sm mt-0.5">Toggle features globally or per business</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={14} />
          New Flag
        </button>
      </div>

      {showModal && (
        <NewFlagModal
          onClose={() => setShowModal(false)}
          onCreate={(form) => createMutation.mutate(form)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Flag list */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          {isLoading && <p className="text-gray-500 text-sm p-5">Loading...</p>}
          {!isLoading && flags.length === 0 && (
            <p className="text-gray-500 text-sm p-5">No feature flags yet. Create one to get started.</p>
          )}
          {flags.map((flag) => (
            <div
              key={flag.id}
              onClick={() => setSelected(flag)}
              className={`flex items-center justify-between px-4 py-3.5 border-b border-gray-700/50 last:border-0 cursor-pointer transition-colors ${
                selectedFlag?.id === flag.id ? 'bg-indigo-600/10' : 'hover:bg-gray-700/30'
              }`}
            >
              <div className="min-w-0">
                <p className="text-white text-sm font-mono font-medium truncate">{flag.key}</p>
                <p className="text-gray-500 text-xs truncate">{flag.name}</p>
              </div>
              <div className="flex items-center gap-3 ml-3 shrink-0">
                {flag.enabledBusinessIds?.length > 0 && !flag.isGloballyEnabled && (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    {flag.enabledBusinessIds.length} biz
                  </span>
                )}
                <Toggle
                  checked={flag.isGloballyEnabled}
                  onChange={(e) => {
                    e.stopPropagation?.();
                    updateMutation.mutate({ id: flag.id, data: { isGloballyEnabled: !flag.isGloballyEnabled } });
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Right: Flag detail */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          {!selectedFlag ? (
            <p className="text-gray-500 text-sm">Select a flag to manage per-business overrides</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-mono font-semibold">{selectedFlag.key}</p>
                  <p className="text-gray-400 text-sm">{selectedFlag.name}</p>
                  {selectedFlag.description && (
                    <p className="text-gray-500 text-xs mt-1">{selectedFlag.description}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete flag "${selectedFlag.key}"? This cannot be undone.`)) {
                      deleteMutation.mutate(selectedFlag.id);
                    }
                  }}
                  className="text-gray-600 hover:text-red-400 transition-colors"
                  title="Delete flag"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-gray-700">
                <span className="text-gray-300 text-sm">Globally Enabled</span>
                <Toggle
                  checked={selectedFlag.isGloballyEnabled}
                  onChange={() => updateMutation.mutate({ id: selectedFlag.id, data: { isGloballyEnabled: !selectedFlag.isGloballyEnabled } })}
                />
              </div>

              {/* Per-business overrides */}
              <div>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
                  Per-Business Overrides {selectedFlag.isGloballyEnabled && <span className="text-gray-600 normal-case">(global is on — overrides apply when you disable globally)</span>}
                </p>

                {selectedFlag.enabledBusinessIds?.length === 0 ? (
                  <p className="text-gray-600 text-xs italic">No per-business overrides</p>
                ) : (
                  <div className="space-y-1 mb-3">
                    {selectedFlag.enabledBusinessIds.map((bizId) => (
                      <div key={bizId} className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2">
                        <span className="text-gray-300 text-xs font-mono truncate">{bizId}</span>
                        <button
                          onClick={() => toggleBizMutation.mutate({ flagId: selectedFlag.id, businessId: bizId })}
                          className="text-gray-600 hover:text-red-400 transition-colors ml-2"
                          title="Remove"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={businessIdInput}
                    onChange={(e) => setBusinessIdInput(e.target.value)}
                    placeholder="Business ID (UUID)"
                    className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => {
                      if (businessIdInput.trim()) {
                        toggleBizMutation.mutate({ flagId: selectedFlag.id, businessId: businessIdInput.trim() });
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
