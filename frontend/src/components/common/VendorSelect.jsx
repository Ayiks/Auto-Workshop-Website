import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Building2, X, Loader2 } from 'lucide-react';
import { vendorsApi } from '@api/vendors';
import { useQuery } from '@tanstack/react-query';

export default function VendorSelect({ value, onChange, label = "Vendor" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['allVendors'],
    queryFn: () => vendorsApi.getVendors({ isActive: true }),
    staleTime: 1000 * 60 * 5,
    enabled: isOpen,
  });

  const filteredResults = useMemo(() => {
    const allVendors = Array.isArray(apiData) ? apiData : (apiData?.data || []);

    if (!searchTerm) return allVendors.slice(0, 50);

    const lower = searchTerm.toLowerCase();
    return allVendors.filter(v =>
      (v.companyName || '').toLowerCase().includes(lower) ||
      (v.contactName || '').toLowerCase().includes(lower) ||
      (v.phone || '').toLowerCase().includes(lower)
    ).slice(0, 50);
  }, [apiData, searchTerm]);

  // Close on outside click — revert input to selected vendor's name if user typed but didn't pick
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        if (value) setSearchTerm(value.name);
        else setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  // Sync display when parent sets/clears value (e.g. edit mode pre-fill or form reset)
  useEffect(() => {
    if (value?.name) {
      if (value.name !== searchTerm) setSearchTerm(value.name);
    } else if (!value) {
      if (searchTerm !== '') setSearchTerm('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleSelect = (vendor) => {
    setSearchTerm(vendor.companyName);
    setIsOpen(false);
    onChange({
      id: vendor.id,
      name: vendor.companyName,
      contactName: vendor.contactName || null,
      phone: vendor.phone || null,
      email: vendor.email || null,
      whatsappNumber: vendor.whatsappNumber || null,
    });
  };

  const handleTextChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    // Clear parent selection while user is typing
    if (value) onChange(null);
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    setSearchTerm('');
    onChange(null);
    setIsOpen(false);
  };

  const isSelected = !!value?.id;

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-xs font-semibold text-gray-500 mb-1">
        {label}
      </label>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSelected ? (
            <Building2 className="h-4 w-4 text-green-600" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>

        <input
          type="text"
          className={`block w-full pl-9 pr-9 py-2 border rounded-lg text-sm outline-none transition-colors ${
            isSelected
              ? 'border-green-500 bg-green-50 text-green-800'
              : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
          }`}
          placeholder="Search vendor name or phone..."
          value={searchTerm}
          onChange={handleTextChange}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          autoComplete="off"
        />

        {searchTerm && (
          <button
            onClick={clearSelection}
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white shadow-xl rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-hidden sm:text-sm">
          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-3 text-gray-500 flex items-center gap-2 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading vendors...
              </div>
            ) : filteredResults.length > 0 ? (
              filteredResults.map((vendor) => (
                <div
                  key={vendor.id}
                  className="cursor-pointer py-2.5 px-3 hover:bg-blue-50 border-b border-gray-50 last:border-0"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(vendor)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{vendor.companyName}</span>
                    {vendor.phone && (
                      <span className="text-gray-400 text-xs">{vendor.phone}</span>
                    )}
                  </div>
                  {vendor.contactName && (
                    <p className="text-xs text-gray-500 mt-0.5">{vendor.contactName}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {searchTerm ? `No vendors found for "${searchTerm}"` : 'Type to search vendors...'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
