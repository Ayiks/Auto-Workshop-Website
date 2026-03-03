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
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Units of Measure</h2>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Manage global units (kg, liters, pcs) for your inventory.</p>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm text-xs sm:text-sm whitespace-nowrap"
        >
          <Plus size={14} /> Add Unit
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Abbreviation</th>
              <th className="px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.data?.map((unit) => (
              <tr key={unit.id} className="hover:bg-gray-50 group transition-colors">
                <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-900 font-medium text-xs sm:text-sm">{unit.name}</td>
                <td className="px-3 sm:px-4 py-2 sm:py-3">
                   <span className="px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-600 rounded-md font-mono inline-block">
                      {unit.abbreviation}
                   </span>
                </td>
                <td className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                  <div className="flex justify-end gap-1 sm:gap-2">
                    <button 
                      onClick={() => handleEdit(unit)}
                      className="p-1 sm:p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"
                      title="Edit"
                    >
                    <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button 
                      onClick={() => handleDelete(unit.id)}
                      className="p-1 sm:p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(!data?.data || data.data.length === 0) && (
                <tr>
                    <td colSpan="3" className="text-center py-8 sm:py-12 text-gray-400 text-xs sm:text-sm">
                        <Package className="w-8 sm:w-12 h-8 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-20" />
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
        onSuccess={handleModalSuccess}
        editData={editingUnit}
      />
    </div>
  );
}