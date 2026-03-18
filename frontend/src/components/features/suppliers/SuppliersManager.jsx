import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorsApi } from '@/api/vendors';
import Modal from '@components/common/Modal';
import SupplierForm from './SupplierForm';

export default function SuppliersManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['allVendors'],
    queryFn: () => vendorsApi.getVendors(),
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => vendorsApi.createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['allVendors']);
      setShowAdd(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => vendorsApi.updateVendor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['allVendors']);
      setEditVendor(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => vendorsApi.deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['allVendors']);
      setDeleteConfirm(null);
    },
  });

  const vendors = data?.data?.data || data?.data || [];
  const filtered = vendors.filter(v =>
    v.companyName.toLowerCase().includes(search.toLowerCase()) ||
    (v.contactName || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.phone || '').includes(search)
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search suppliers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white transition-all"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Supplier
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading suppliers…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">{search ? 'No suppliers match your search' : 'No suppliers yet'}</p>
          {!search && <p className="text-xs text-gray-400 mt-1">Add your first supplier to get started.</p>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs text-gray-500 uppercase font-medium">
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Contact Person</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Channels</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{v.companyName}</td>
                  <td className="px-4 py-3 text-gray-600">{v.contactName || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600">{v.phone || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{v.email || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{v.location || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {v.phone && <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-full">SMS</span>}
                      {v.whatsappNumber && <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full">WA</span>}
                      {v.email && <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded-full">Email</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setEditVendor(v)}
                        className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(v)}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Supplier" size="md">
        <SupplierForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowAdd(false)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editVendor} onClose={() => setEditVendor(null)} title="Edit Supplier" size="md">
        <SupplierForm
          vendor={editVendor}
          onSubmit={(data) => updateMutation.mutate({ id: editVendor.id, data })}
          onCancel={() => setEditVendor(null)}
          isLoading={updateMutation.isPending}
        />
      </Modal>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-bold text-gray-900 mb-2">Delete Supplier?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Remove <span className="font-semibold text-gray-800">{deleteConfirm.companyName}</span> from your supplier list? This won't affect existing restock orders.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
