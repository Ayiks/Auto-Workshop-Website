import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@api/settings";
import { X, Save, AlertCircle } from "lucide-react";

export default function UnitFormModal({ isOpen, onClose, editData = null, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ name: "", abbreviation: "" });
  const [error, setError] = useState("");

  // Pre-fill form if editing
  useEffect(() => {
    if (editData) {
      setFormData({ name: editData.name, abbreviation: editData.abbreviation });
    } else {
      setFormData({ name: "", abbreviation: "" }); // Reset for add mode
    }
    setError("");
  }, [editData, isOpen]);

  const mutation = useMutation({
    mutationFn: (data) => {
      return editData 
        ? settingsApi.updateUnit(editData.id, data)
        : settingsApi.addUnit(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["units"]); // Refresh list automatically
      if (onSuccess) onSuccess(); // Callback for parent
      onClose();
    },
    onError: (err) => {
      setError(err.response?.data?.message || "Failed to save unit");
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 text-lg">
            {editData ? "Edit Unit" : "Add New Unit"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Name</label>
            <input
              type="text"
              placeholder="e.g. Kilogram, Box, Piece"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Abbreviation</label>
            <input
              type="text"
              placeholder="e.g. kg, bx, pcs"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={formData.abbreviation}
              onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">Used in receipts and short displays.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate(formData)}
            disabled={mutation.isPending || !formData.name || !formData.abbreviation}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {mutation.isPending ? "Saving..." : <><Save size={16} /> Save Unit</>}
          </button>
        </div>
      </div>
    </div>
  );
}