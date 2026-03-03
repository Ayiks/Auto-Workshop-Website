// src/components/features/sales/SaleForm.jsx
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { materialsApi } from "@api/materials";
import { settingsApi } from "@api/settings";
import Button from "@components/common/Button";
import CustomerSelect from "@components/common/CustomerSelect"; 
import { format } from "date-fns";

const getItemColor = (id) => {
  const colors = ["bg-gray-800", "bg-gray-600", "bg-gray-700", "bg-black", "bg-gray-500"];
  return colors[id % colors.length];
};

export default function SaleForm({ onSubmit, onCancel, isLoading }) {
  // --- STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [saleType, setSaleType] = useState("counter"); 
  const [items, setItems] = useState([]); 
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleDate, setSaleDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Customer
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Payment & Discount
  const [paymentStatus, setPaymentStatus] = useState("paid"); 
  const [discount, setDiscount] = useState(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  
  // Amount Paid (For partial payments)
  const [partialAmount, setPartialAmount] = useState(""); 

  // Booth
  const [serviceCategory, setServiceCategory] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [boothPrice, setBoothPrice] = useState(0);
  const [selectedService, setSelectedService] = useState(null);

  // --- API ---
  const { data: materialsData } = useQuery({
    queryKey: ["materials", { status: "active" }],
    queryFn: () => materialsApi.getMaterials({ status: "active" }),
    enabled: saleType === "counter",
  });

  const { data: serviceCategoriesData } = useQuery({
    queryKey: ["booth-service-categories"],
    queryFn: () => settingsApi.getServiceCategories(),
    enabled: saleType === "booth",
  });

  const { data: itemCategoriesData } = useQuery({
    queryKey: ["booth-item-categories", serviceCategory],
    queryFn: () => settingsApi.getItemCategories(serviceCategory),
    enabled: saleType === "booth" && !!serviceCategory,
  });

  const materials = materialsData?.data || [];
  const serviceCategories = serviceCategoriesData?.data || [];
  const itemCategories = itemCategoriesData?.data || [];

  const filteredMaterials = useMemo(() => {
    if (!searchTerm) return materials;
    return materials.filter((m) => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [materials, searchTerm]);

  // --- CART ACTIONS ---
  const addToCart = (material) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.materialId === material.id);
      if (existingItem) {
        if (existingItem.quantity + 1 > material.quantity) {
          alert("Max stock reached!");
          return prevItems;
        }
        return prevItems.map((i) =>
          i.materialId === material.id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitPrice }
            : i
        );
      } else {
        return [...prevItems, {
          id: Date.now(),
          itemType: "material",
          materialId: material.id,
          materialName: material.name,
          quantity: 1, // Default to 1 instead of 0 for better UX
          maxQuantity: material.quantity,
          unitPrice: Number(material.sellingPrice),
          subtotal: Number(material.sellingPrice),
          imageUrl: material.imageUrl,
        }];
      }
    });
  };

  // 1. Handle Button Clicks (+/-)
  const updateQuantity = (itemId, change) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          // Fix JavaScript float precision issues (e.g. 0.1 + 0.2 = 0.3000004)
          const newQty = parseFloat((item.quantity + change).toFixed(2));
          
          if (newQty <= 0) return item; 
          if (newQty > item.maxQuantity) {
            alert("Stock limit reached");
            return item;
          }
          return { ...item, quantity: newQty, subtotal: newQty * item.unitPrice };
        }
        return item;
      })
    );
  };

  // 2. NEW: Handle Direct Input (Typing)
  const handleQuantityInput = (itemId, value) => {
    // If empty string (user deleting), allow it temporarily or set to 0
    if (value === "") {
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: "" } : item));
        return;
    }

    const newQty = parseFloat(value);
    
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
           if (newQty > item.maxQuantity) {
               // Optional: Clamp to max or alert
               // alert(`Max stock is ${item.maxQuantity}`);
               return { ...item, quantity: item.maxQuantity, subtotal: item.maxQuantity * item.unitPrice };
           }
           if (newQty < 0) return item; // No negative numbers

           // Update quantity and subtotal
           return { 
               ...item, 
               quantity: newQty, 
               subtotal: newQty * item.unitPrice 
           };
        }
        return item;
      })
    );
  };

  const removeItem = (id) => setItems(items.filter((item) => item.id !== id));

  const clearAll = () => {
    setItems([]);
    setBoothPrice(0);
    setDiscount(0);
    setSelectedCustomer(null);
    setServiceCategory("");
    setItemCategory("");
    setPaymentStatus("paid");
    setPartialAmount("");
  };

  useEffect(() => {
    if (serviceCategory && itemCategory) {
      const selected = itemCategories.find((i) => i.itemCategory === itemCategory);
      if (selected) {
        setBoothPrice(parseFloat(selected.price));
        setSelectedService(selected);
      }
    } else {
        setBoothPrice(0);
        setSelectedService(null);
    }
  }, [serviceCategory, itemCategory, itemCategories]);

  // --- TOTALS ---
  // Ensure quantity is treated as 0 if empty string for calculation
  const itemsTotal = items.reduce((sum, item) => {
      const qty = item.quantity === "" ? 0 : parseFloat(item.quantity);
      return sum + (qty * item.unitPrice);
  }, 0);

  const subTotal = saleType === "counter" ? itemsTotal : boothPrice;
  const grandTotal = Math.max(0, subTotal - parseFloat(discount || 0));

  // --- SUBMIT ---
  const handleFinalSubmit = (e) => {
    e.preventDefault();
    
    if (saleType === "counter" && items.length === 0) return alert("Cart is empty");
    // Validate empty quantities
    if (saleType === "counter" && items.some(i => i.quantity === "" || i.quantity <= 0)) {
        return alert("Please enter valid quantities for all items");
    }

    if (saleType === "booth" && !selectedService?.id) return alert("Invalid Service");
    if (paymentStatus === "partially" && (!partialAmount || partialAmount <= 0)) return alert("Please enter the amount paid");

    const now = new Date();
    const formattedDateTime = new Date(`${saleDate}T${format(now, "HH:mm:ss")}`).toISOString();

    let finalAmountPaid = 0;
    if (paymentStatus === 'paid') {
        finalAmountPaid = grandTotal;
    } else if (paymentStatus === 'unpaid') {
        finalAmountPaid = 0;
    } else {
        finalAmountPaid = parseFloat(partialAmount);
    }

    const commonData = {
        paymentMethod,
        saleDate: formattedDateTime,
        customerId: selectedCustomer?.type === 'registered' ? selectedCustomer.id : null,
        customerName: selectedCustomer?.name || 'Walking Customer',
        customerPhone: selectedCustomer?.phone || '',
        paymentStatus, 
        discount: parseFloat(discount || 0),
        amountPaid: finalAmountPaid,
        totalAmount: grandTotal
    };

    if (saleType === "counter") {
      const saleItems = items.map((item) => ({
        itemType: "material",
        materialId: Number(item.materialId),
        quantity: parseFloat(item.quantity),
      }));
      onSubmit({ ...commonData, items: saleItems });
    } else {
      onSubmit({ ...commonData, items: [{ itemType: "booth", serviceId: selectedService.id }] });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-4 sm:gap-6">
      
      {/* LEFT COLUMN: PRODUCTS */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
        {/* Toggle Header */}
        <div className="p-3 sm:p-4 border-b border-gray-100 bg-white z-10 space-y-3 sm:space-y-4">
          <div className="flex p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSaleType("counter")}
              className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${saleType === "counter" ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700"}`}
            >
              Materials
            </button>
            <button
              type="button"
              onClick={() => setSaleType("booth")}
              className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${saleType === "booth" ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700"}`}
            >
              Booth Services
            </button>
          </div>
          {saleType === "counter" && (
            <div className="relative">
                <svg className="absolute left-3 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                type="text"
                placeholder="Search inventory..."
                className="block w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
          {saleType === "counter" ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
              {filteredMaterials.map((material) => (
                <div key={material.id} className="group bg-white p-2 sm:p-3 rounded-xl border border-gray-200 hover:border-gray-300 shadow-sm transition-all flex flex-col relative">
                  <div className={`aspect-square rounded-lg mb-3 flex items-center justify-center text-white font-bold text-xl relative overflow-hidden ${material.imageUrl ? "" : getItemColor(material.id)}`}>
                    {material.imageUrl ? <img src={material.imageUrl} alt={material.name} className="w-full h-full object-cover" /> : <span>{material.name.substring(0, 2).toUpperCase()}</span>}
                    {material.quantity < 10 && material.quantity > 0 && <span className="absolute top-2 right-2 bg-black/75 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-medium">{material.quantity} left</span>}
                  </div>
                  
                  <div className="flex flex-col flex-1">
                    <h3 className="font-medium text-gray-900 text-sm mb-1 truncate" title={material.name}>{material.name}</h3>
                    <div className="flex items-end justify-between mt-auto">
                      <div className="flex flex-col">
                          <span className="font-bold text-gray-900">₵{Number(material.sellingPrice).toFixed(2)}</span>
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={() => addToCart(material)} 
                        disabled={material.quantity <= 0} 
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${material.quantity > 0 ? "bg-black text-white hover:bg-gray-800 shadow-sm active:scale-95" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                      >
                          {material.quantity > 0 ? (
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          ) : (
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredMaterials.length === 0 && <div className="col-span-full text-center text-gray-400 py-12 text-sm">No materials found.</div>}
            </div>
          ) : (
            // BOOTH LAYOUT (Unchanged)
            <div className="flex flex-col  justify-center items-center p-6">
                <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
                   <div className="text-center mb-8">
                       <div className="w-12 h-12 bg-gray-50 rounded-xl mx-auto flex items-center justify-center mb-4 border border-gray-100">
                           <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                       </div>
                       <h3 className="text-lg font-bold text-gray-900">Service Configuration</h3>
                       <p className="text-gray-500 text-sm mt-1">Configure the booth session details below.</p>
                   </div>

                   <div className="space-y-5">
                       <div className="space-y-1.5">
                           <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide ml-1">Service Type</label>
                           <div className="relative">
                                <select 
                                    className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none transition-shadow" 
                                    value={serviceCategory} 
                                    onChange={(e) => { setServiceCategory(e.target.value); setItemCategory(""); }}
                                >
                                    <option value="">Select Category</option>
                                    {serviceCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                           </div>
                       </div>

                       <div className="space-y-1.5">
                           <label className={`text-xs font-semibold uppercase tracking-wide ml-1 transition-colors ${!serviceCategory ? 'text-gray-300' : 'text-gray-700'}`}>Vehicle Category</label>
                           <div className="relative">
                                <select 
                                    className={`w-full pl-4 pr-10 py-3 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none transition-all ${!serviceCategory ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200'}`} 
                                    value={itemCategory} 
                                    disabled={!serviceCategory} 
                                    onChange={(e) => setItemCategory(e.target.value)}
                                >
                                    <option value="">Select Option</option>
                                    {itemCategories.map((i) => <option key={i.id} value={i.itemCategory}>{i.itemCategory}</option>)}
                                </select>
                                <svg className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${!serviceCategory ? 'text-gray-200' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                           </div>
                       </div>
                   </div>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: CHECKOUT */}
      <div className="w-full lg:w-[380px] sm:w-[350px] flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 h-full relative">
        <div className="p-3 sm:p-4 border-b border-gray-100 bg-white rounded-t-xl flex justify-between items-center">
           <h2 className="font-bold text-sm sm:text-base text-gray-900">Current Order</h2>
           <button onClick={clearAll} className="text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-colors">Clear</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3">
          {saleType === 'counter' && items.length === 0 && (
             <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <svg className="w-10 h-10 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                <span className="text-sm">Cart is empty</span>
             </div>
          )}
          {saleType === "counter" && items.map((item) => (
              <div key={item.id} className="flex gap-2 sm:gap-3 bg-white group hover:bg-gray-50 border border-gray-100 p-2 sm:p-2.5 rounded-lg transition-colors">
                <div className={`w-10 h-10 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0 ${item.imageUrl ? "" : getItemColor(item.materialId)}`}>
                  {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover rounded-md" alt="" /> : item.materialName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-sm text-gray-900 truncate pr-2">{item.materialName}</h4>
                      {/* Calculate subtotal based on dynamic input */}
                      <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                        ₵{((item.quantity === "" ? 0 : parseFloat(item.quantity)) * item.unitPrice).toFixed(2)}
                      </span>
                  </div>
                  <div className="flex justify-between items-center">
                    
                    {/* QUANTITY INPUT SECTION */}
                    <div className="flex items-center border border-gray-200 rounded bg-white h-7 overflow-hidden">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)} 
                        className="px-2 bg-gray-50 text-gray-500 hover:text-gray-900 hover:bg-gray-100 h-full transition-colors border-r border-gray-100"
                        tabIndex={-1} // Skip tab index so user can tab through inputs easily
                      >-</button>
                      
                      {/* EDITABLE INPUT */}
                      <input 
                        type="number"
                        min="0"
                        step="0.01" // Allows decimals
                        value={item.quantity}
                        onChange={(e) => handleQuantityInput(item.id, e.target.value)}
                        className="w-14 text-center text-xs text-gray-900 focus:outline-none focus:bg-gray-50 h-full no-spinners appearance-none"
                        placeholder="0"
                      />

                      <button 
                        onClick={() => updateQuantity(item.id, 1)} 
                        className="px-2 bg-gray-50 text-gray-500 hover:text-gray-900 hover:bg-gray-100 h-full transition-colors border-l border-gray-100"
                        tabIndex={-1}
                      >+</button>
                    </div>

                    <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          {saleType === "booth" && serviceCategory && itemCategory && (
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <h4 className="font-bold text-gray-900">{serviceCategory}</h4>
                <p className="text-gray-600 text-sm mt-0.5">{itemCategory}</p>
                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-xs text-gray-500">Service Fee</span>
                    <span className="font-bold text-gray-900">GH₵ {boothPrice.toFixed(2)}</span>
                </div>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION */}
        <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200 space-y-3 sm:space-y-4 text-sm rounded-b-xl">
          
          {/* CUSTOMER SELECT */}
          <div className="relative z-20">
            <CustomerSelect value={selectedCustomer} onChange={setSelectedCustomer} label="Customer (Optional)" />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 z-10 relative">
             <div>
                 <label className="text-xs sm:text-sm font-semibold text-gray-500 mb-1 block">Date</label>
                 <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="w-full p-1.5 sm:p-2 border border-gray-300 rounded-lg text-xs sm:text-sm bg-white focus:ring-1 focus:ring-gray-900 focus:border-gray-900" />
             </div>
             <div>
                <label className="text-xs sm:text-sm font-semibold text-gray-500 mb-1 block">Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-1.5 sm:p-2 border border-gray-300 rounded-lg text-xs sm:text-sm bg-white focus:ring-1 focus:ring-gray-900 focus:border-gray-900">
                  <option value="cash">Cash</option>
                  <option value="momo">MoMo</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                </select>
             </div>
          </div>

          {/* PAYMENT STATUS */}
          <div className="z-0 relative">
             <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Status</label>
             <div className="grid grid-cols-3 gap-1 p-1 bg-gray-200 rounded-lg">
                {['paid', 'partially', 'unpaid'].map(status => (
                   <button key={status} type="button" onClick={() => setPaymentStatus(status)} className={`py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md capitalize transition-all ${paymentStatus === status ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{status}</button>
                ))}
             </div>
             
             {/* PARTIAL AMOUNT INPUT */}
             {paymentStatus === 'partially' && (
                <div className="mt-2 sm:mt-3 animate-in fade-in slide-in-from-top-1 bg-white border border-gray-200 p-2 sm:p-3 rounded-lg">
                    <label className="text-xs sm:text-sm text-gray-700 font-semibold mb-1 block">Amount Paid:</label>
                    <div className="relative">
                        <span className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs sm:text-sm">GH₵</span>
                        <input 
                            type="number" 
                            value={partialAmount} 
                            onChange={(e) => setPartialAmount(e.target.value)}
                            className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 outline-none"
                            placeholder="0.00"
                        />
                    </div>
                </div>
             )}
          </div>

          <div className="border-t border-gray-200 pt-2 sm:pt-3 space-y-1">
             <div className="flex justify-between text-xs sm:text-sm text-gray-600"><span>Subtotal</span><span>GH₵ {subTotal.toFixed(2)}</span></div>
             <button type="button" onClick={() => setShowDiscountInput(!showDiscountInput)} className="text-xs text-orange-500 hover:text-gray-900 hover:underline text-left transition-colors">Add Discount?</button>
             {showDiscountInput && (
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">Disc:</span>
                    <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-24 p-1 text-xs border border-gray-300 rounded focus:border-gray-900 focus:ring-0" placeholder="0.00" />
                </div>
             )}
             <div className="flex justify-between text-lg sm:text-xl font-bold text-gray-900 pt-2"><span>Total</span><span>GH₵ {grandTotal.toFixed(2)}</span></div>
          </div>

          <Button onClick={handleFinalSubmit} variant="primary" className="w-full py-2 sm:py-3 text-sm sm:text-base bg-gray-900 hover:bg-black text-white rounded-lg shadow-sm" loading={isLoading} disabled={grandTotal < 0 || (saleType === "counter" && items.length === 0)}>
            Complete Order
          </Button>
        </div>
      </div>
    </div>
  );
}