import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@api/settings";
import { Plus, Edit2, Trash2, Package } from "lucide-react"; // Added Package icon
import UnitFormModal from "@components/features/settings/UnitFormModal";

export default function UnitsManager() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["units"],
    queryFn: settingsApi.getUnits
  });

  const deleteMutation = useMutation({
    mutationFn: settingsApi.deleteUnit,
    onSuccess: () => queryClient.invalidateQueries(["units"]),
  });

  const handleEdit = (unit) => {
    setEditingUnit(unit);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingUnit(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure? This will remove the unit from future selections.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleModalSuccess = () => {
    queryClient.invalidateQueries(["units"]); // Refresh list
    setIsModalOpen(false); // Close modal
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading units...</div>;

  return (
    <div className="w-full"> {/* Changed from max-w-4xl to w-full to fit settings layout */}
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-xl font-bold text-gray-900">Units of Measure</h2>
            <p className="text-gray-500 text-sm">Manage global units (kg, liters, pcs) for your inventory.</p>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm text-sm"
        >
          <Plus size={16} /> Add Unit
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Abbreviation</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.data?.map((unit) => (
              <tr key={unit.id} className="hover:bg-gray-50 group transition-colors">
                <td className="px-6 py-3 text-gray-900 font-medium text-sm">{unit.name}</td>
                <td className="px-6 py-3">
                   <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-md font-mono">
                      {unit.abbreviation}
                   </span>
                </td>
                <td className="px-6 py-3 text-right space-x-2">
                  <button 
                    onClick={() => handleEdit(unit)}
                    className="p-1.5 text-gray-400 hover:bg-blue-50 rounded-md transition-colors"
                    title="Edit"
                  >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button 
                    onClick={() => handleDelete(unit.id)}
                    className="p-1.5 text-gray-400 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {(!data?.data || data.data.length === 0) && (
                <tr>
                    <td colSpan="3" className="text-center py-12 text-gray-400">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No units found. Create one to get started!</p>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reusable Modal */}
      <UnitFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleModalSuccess} // <--- Important: Refresh logic passed here
        editData={editingUnit}
      />
    </div>
  );
}