import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, User, X, Loader2 } from 'lucide-react';
import { customersApi } from '@api/customers';
import { useQuery } from '@tanstack/react-query';

export default function CustomerSelect({ value, onChange, label = "Customer" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // --- 1. DATA FETCHING ---
  // Fetch ALL customers once and cache them. 
  // This makes filtering instant and supports "smart" search logic on the client side.
  const { data: apiData, isLoading } = useQuery({
    queryKey: ['allCustomers'], 
    queryFn: () => customersApi.getCustomers(), 
    staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
    enabled: isOpen, // Start fetching only when user interacts
  });

  // --- 2. SMART FILTERING ---
  const filteredResults = useMemo(() => {
    const allCustomers = Array.isArray(apiData) ? apiData : (apiData?.data || []);
    
    // If no search text, return the first 50 customers
    if (!searchTerm) return allCustomers.slice(0, 50);

    const lowerSearch = searchTerm.toLowerCase();

    return allCustomers.filter(customer => {
      const firstName = (customer.firstName || '').toLowerCase();
      const lastName = (customer.lastName || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`;
      const phone = (customer.phone || '').toLowerCase();

      // Match against Full Name, First Name, Last Name, or Phone
      return fullName.includes(lowerSearch) || phone.includes(lowerSearch);
    }).slice(0, 50); // Limit to top 50 results for performance
  }, [apiData, searchTerm]);

  // --- 3. HANDLE CLICKS OUTSIDE ---
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- 4. SYNC VALUE FROM PARENT (For Edit Mode) ---
  useEffect(() => {
    if (value && value.name) {
      // Only update if different to prevent typing glitches
      if (value.name !== searchTerm) {
        setSearchTerm(value.name);
      }
    } else if (!value) {
      // If parent clears value, clear input
      if (searchTerm !== '') {
        setSearchTerm('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // --- 5. HANDLERS ---
  const handleSelect = (customer) => {
    const fullName = `${customer.firstName} ${customer.lastName || ''}`.trim();
    setSearchTerm(fullName);
    setIsOpen(false);
    
    // Notify Parent: Registered Customer
    onChange({
      type: 'registered',
      id: customer.id,
      name: fullName,
      phone: customer.phone
    });
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setSearchTerm(text);
    setIsOpen(true);
    
    // Notify Parent: Walking Customer (Unregistered)
    onChange({
      type: 'walking',
      id: null,
      name: text,
      phone: '' 
    });
  };

  const clearSelection = (e) => {
    e.stopPropagation(); 
    setSearchTerm('');
    onChange(null); // Clear parent state
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-xs font-semibold text-gray-500 mb-1">
        {label}
      </label>
      
      <div className="relative">
        {/* Icon: Green User if Registered, Grey Search if Walking */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {value?.type === 'registered' ? (
            <User className="h-4 w-4 text-green-600" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
        
        <input
          type="text"
          className={`block w-full pl-9 pr-9 py-2 border rounded-lg text-sm outline-none transition-colors ${
            value?.type === 'registered' 
              ? 'border-green-500 bg-green-50 text-green-800' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
          }`}
          placeholder="Search name or phone..."
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
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* DROPDOWN RESULTS */}
      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white shadow-xl rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-hidden sm:text-sm">
          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-3 text-gray-500 flex items-center gap-2 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading customers...
              </div>
            ) : filteredResults.length > 0 ? (
              filteredResults.map((customer) => (
                <div
                  key={customer.id}
                  className="cursor-pointer py-2.5 px-3 hover:bg-blue-50 border-b border-gray-50 last:border-0"
                  onClick={() => handleSelect(customer)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">
                      {customer.firstName} {customer.lastName}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {customer.phone}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {searchTerm ? (
                  <>
                    No registered match found.<br/>
                    <span className="text-xs text-orange-600">
                      "{searchTerm}" will be saved as a Walking Customer.
                    </span>
                  </>
                ) : (
                   <span>Type name or phone to search...</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}