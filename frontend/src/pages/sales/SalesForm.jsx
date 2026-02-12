import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { materialsApi } from "@api/materials";
import { settingsApi } from "@api/settings";
import { salesApi } from "@api/sales";
import Button from "@components/common/Button";
import CustomerSelect from "@components/common/CustomerSelect"; 
import { format } from "date-fns";
import { 
  Trash2, Plus, Minus, Search, 
  ShoppingCart, ArrowRight, ArrowLeft, CreditCard,
  User, Calendar, CheckCircle, Package, Tag, X
} from "lucide-react";

// Monochrome placeholders
const getItemColor = (id) => {
  const grays = ["bg-gray-800", "bg-gray-600", "bg-gray-700", "bg-black", "bg-gray-500"];
  return grays[id % grays.length];
};

export default function SaleForm({ onCancel, isLoading }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- STATE ---
  const [step, setStep] = useState(0); 
  const [searchTerm, setSearchTerm] = useState("");
  const [saleType, setSaleType] = useState("counter"); 
  const [items, setItems] = useState([]); 
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  
  // Payment Details
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleDate, setSaleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("paid"); 
  
  // Discount State
  const [discount, setDiscount] = useState("");
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  
  const [partialAmount, setPartialAmount] = useState(""); 

  // Booth Services
  const [serviceCategory, setServiceCategory] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [boothPrice, setBoothPrice] = useState(0);
  const [selectedService, setSelectedService] = useState(null);

  // --- API ---
  const { data: materialsData, isPending: isMaterialsLoading } = useQuery({
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

  const createSaleMutation = useMutation({
    mutationFn: (data) => salesApi.createSale(data),
    onSuccess: (response) => {
        // 1. Invalidate queries to refresh lists (inventory, sales history)
        queryClient.invalidateQueries({ queryKey: ["materials"] });
        queryClient.invalidateQueries({ queryKey: ["sales"] });
        
        // 2. Alert or Toast
        alert("Sale created successfully!");
        
        // 3. Navigate away or reset
        if (onCancel) onCancel(); 
        else navigate("/app/sales"); 
    },
    onError: (error) => {
        console.error("Sale Error:", error);
        alert(error.response?.data?.message || "Failed to create sale. Please try again.");
    }
  });

  const materials = materialsData?.data || [];
  const serviceCategories = serviceCategoriesData?.data || [];
  const itemCategories = itemCategoriesData?.data || [];

  const filteredMaterials = useMemo(() => {
    if (!searchTerm) return materials;
    return materials.filter((m) => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [materials, searchTerm]);

  // --- HELPER: GLOBAL STOCK CHECK ---
  // Calculates how many of a specific material are currently in the cart across ALL rows
  const getReservedStock = (materialId, cartItems, excludeItemId = null) => {
    return cartItems.reduce((total, item) => {
      // Skip the item we are currently editing (if provided)
      if (excludeItemId && item.id === excludeItemId) return total;
      
      if (item.materialId === materialId) {
        // Calculate based on unit factor (e.g., if item is a 'Box' of 10, it counts as 10)
        return total + (item.quantity * (item.unitFactor || 1));
      }
      return total;
    }, 0);
  };

  // --- ACTIONS ---

  const handleGoBack = () => {
    if (step === 2) setStep(1);
    else if (step === 1) setStep(0);
    else {
      if (onCancel) onCancel();
      else navigate(-1);
    }
  };

  const handleReset = () => {
    if (items.length > 0 || boothPrice > 0) {
        if (!window.confirm("Are you sure you want to clear the entire cart?")) return;
    }
    setItems([]);
    setStep(0);
    setBoothPrice(0);
    setDiscount("");
    setShowDiscountInput(false);
    setSelectedCustomer(null);
    setPartialAmount("");
    setPaymentStatus("paid");
    setServiceCategory("");
    setItemCategory("");
  };

  const addToCart = (material) => {

    setSelectedMaterialId(material.id);
    // Check Global Stock Availability
    const currentReserved = getReservedStock(material.id, items);
    
    // We are trying to add 1 base unit
    if (currentReserved + 1 > material.quantity) {
        alert(`Insufficient Stock! You have ${material.quantity} available, and ${currentReserved} are already in the cart.`);
        return;
    }

    // ALWAYS create a new item (Distinct Row)
    setItems((prevItems) => [
      ...prevItems, 
      {
        id: Date.now() + Math.random(), // Unique Row ID
        itemType: "material",
        materialId: material.id,
        materialName: material.name,
        quantity: 1,
        maxStock: material.quantity,
        baseUnit: material.baseUnit,
        basePrice: Number(material.sellingPrice),
        availableUnits: material.alternateUnits || [],
        unitId: null, // Base Unit
        unitFactor: 1, 
        unitPrice: Number(material.sellingPrice),
        subtotal: Number(material.sellingPrice),
        imageUrl: material.imageUrl,
      }
    ]);
  };

  const handleUnitChange = (itemId, newUnitId) => {
    setItems(prev => {
        const itemIndex = prev.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return prev;
        
        const item = prev[itemIndex];
        let newPrice = item.basePrice;
        let newFactor = 1;
        let newUnitIdVal = null;

        if (newUnitId !== "base") {
          const unit = item.availableUnits.find(u => u.id === parseInt(newUnitId));
          if (unit) {
             newPrice = Number(unit.price);
             newFactor = Number(unit.factor);
             newUnitIdVal = unit.id;
          }
        }

        // Check if changing the unit violates global stock
        const otherReserved = getReservedStock(item.materialId, prev, itemId);
        const requiredForThisItem = item.quantity * newFactor;

        if (otherReserved + requiredForThisItem > item.maxStock) {
            alert("Changing unit would exceed total available stock.");
            return prev;
        }

        const newItems = [...prev];
        newItems[itemIndex] = {
          ...item,
          unitId: newUnitIdVal,
          unitFactor: newFactor,
          unitPrice: newPrice,
          subtotal: item.quantity * newPrice
        };
        return newItems;
    });
  };

  const updateQuantity = (itemId, change) => {
    setItems((prevItems) => {
      const itemIndex = prevItems.findIndex(i => i.id === itemId);
      if (itemIndex === -1) return prevItems;

      const item = prevItems[itemIndex];
      const newQty = parseFloat((item.quantity + change).toFixed(2));
      
      // Auto-remove if 0
      if (newQty <= 0) {
          return prevItems.filter(i => i.id !== itemId);
      }

      // GLOBAL Stock Check
      const otherReserved = getReservedStock(item.materialId, prevItems, itemId);
      const requiredForThisItem = newQty * (item.unitFactor || 1);

      if (otherReserved + requiredForThisItem > item.maxStock) {
         // Optionally trigger a toast/alert here
         return prevItems;
      }

      const newItems = [...prevItems];
      newItems[itemIndex] = { ...item, quantity: newQty, subtotal: newQty * item.unitPrice };
      return newItems;
    });
  };

  const handleQuantityInput = (itemId, value) => {
    if (value === "") {
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: "" } : item));
        return;
    }
    const newQty = parseFloat(value);
    
    setItems(prevItems => {
        const itemIndex = prevItems.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return prevItems;
        
        // Remove on 0 or negative
        if (newQty < 0) return prevItems.filter(i => i.id !== itemId);

        const item = prevItems[itemIndex];
        
        // GLOBAL Stock Check
        const otherReserved = getReservedStock(item.materialId, prevItems, itemId);
        const requiredForThisItem = newQty * (item.unitFactor || 1);

        if (otherReserved + requiredForThisItem > item.maxStock) return prevItems;

        const newItems = [...prevItems];
        newItems[itemIndex] = { ...item, quantity: newQty, subtotal: newQty * item.unitPrice };
        return newItems;
    });
  };

  const removeItem = (id) => setItems(items.filter((item) => item.id !== id));
  
  // Booth Logic
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

  // Totals
  const itemsTotal = items.reduce((sum, item) => sum + ((item.quantity === "" ? 0 : parseFloat(item.quantity)) * item.unitPrice), 0);
  const subTotal = saleType === "counter" ? itemsTotal : boothPrice;
  
  // Discount Validation: Ensure discount doesn't exceed subtotal
  const validDiscount = Math.min(parseFloat(discount || 0), subTotal);
  const grandTotal = Math.max(0, subTotal - validDiscount);

  // --- SUBMIT ---
  const handleFinalSubmit = (asDraft = false) => {
    if (saleType === "counter" && items.length === 0) return alert("Cart is empty");
    
    const now = new Date();
    const formattedDateTime = new Date(`${saleDate}T${format(now, "HH:mm:ss")}`).toISOString();

    let finalAmountPaid = 0;
    if (paymentStatus === 'paid') finalAmountPaid = grandTotal;
    else if (paymentStatus === 'partially') finalAmountPaid = parseFloat(partialAmount || 0);

    const commonData = {
        paymentMethod,
        saleDate: formattedDateTime,
        customerId: selectedCustomer?.type === 'registered' ? selectedCustomer.id : null,
        customerName: selectedCustomer?.name || 'Walking Customer',
        customerPhone: selectedCustomer?.phone || '',
        paymentStatus, 
        discount: validDiscount,
        amountPaid: finalAmountPaid,
        totalAmount: grandTotal,
        isDraft: asDraft
    };

    let payload;
    if (saleType === "counter") {
      const saleItems = items.map((item) => ({
        itemType: "material",
        materialId: Number(item.materialId),
        quantity: parseFloat(item.quantity),
        unitId: item.unitId,
      }));
      payload = ({ ...commonData, items: saleItems });
    } else {
      payload = ({ ...commonData, items: [{ itemType: "booth", serviceId: selectedService.id }] });
    }

    createSaleMutation.mutate(payload);
  };

  const showCartPanel = step > 0; 

  return (
    <div className="flex h-full gap-6 font-sans text-gray-900 relative">
      
      {/* -----------------------------
          LEFT COLUMN: INVENTORY
          ----------------------------- */}
      <div className={`flex-1 flex flex-col bg-white md:rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full w-full absolute inset-0 z-10 md:relative md:z-0 md:w-auto ${step > 0 ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-white space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button 
                        type="button"
                        onClick={handleGoBack}
                        className="p-2 -ml-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-md transition-colors"
                        title="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold tracking-tight text-black">New Sale</h1>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-md">
                    <button onClick={() => setSaleType("counter")} className={`px-3 sm:px-4 py-1.5 rounded text-xs font-bold transition-all ${saleType === 'counter' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Materials</button>
                    <button onClick={() => setSaleType("booth")} className={`px-3 sm:px-4 py-1.5 rounded text-xs font-bold transition-all ${saleType === 'booth' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Booth</button>
                </div>
            </div>

            {saleType === "counter" && (
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search inventory..." 
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            )}
        </div>

        {/* Inventory Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 pb-24 md:pb-4">
          {saleType === "counter" ? (
             isMaterialsLoading ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading inventory...</div>
             ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredMaterials.map((material) => 
                  {

                    const isSelected = selectedMaterialId === material.id;
                    const availableQty = Number(material.quantity) % 1 !== 0 ? Number(material.quantity).toFixed(1) : Math.floor(Number(material.quantity));
                    return (
                    <button 
                      key={material.id} 
                      onClick={() => addToCart(material)}
                      disabled={material.quantity <= 0}
                      className={`group bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col h-full shadow-sm hover:border-black transition-all text-left
                        ${isSelected ? "border-2 border-black ring-1 ring-black scale-[1.02] shadow-md z-10"
                            : "border border-gray-200 hover:border-black"
                        }
                        `}
                    >
                      <div className={`h-32 w-full flex items-center justify-center text-white font-bold text-xl relative overflow-hidden ${material.imageUrl ? "" : getItemColor(material.id)}`}>
                        {material.imageUrl ? <img src={material.imageUrl} alt="" className="w-full h-full object-cover" /> : <span>{material.name.substring(0, 2).toUpperCase()}</span>}
                        {material.quantity <= 0 && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><span className="bg-gray-100 border border-gray-200 text-gray-500 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">Out of Stock</span></div>}
                      
                        {/* NEW: Optional Checkmark for Selected State */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-black text-white rounded-full p-1 shadow-sm">
                              <CheckCircle size={14} />
                            </div>
                          )}
                      </div>
                      
                      <div className="p-3 flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-2">
                             <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{material.name}</h3>
                        </div>
                        <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
                             <span className="font-bold text-gray-900 text-base">₵{Number(material.sellingPrice).toFixed(2)}</span>
                            <span className="text-[10px] text-gray-400 font-medium">{availableQty} avail</span>
                        </div>
                      </div>
                    </button>
                  )
                  }
                )
                  }
                  {filteredMaterials.length === 0 && <div className="col-span-full text-center text-gray-400 py-10 text-sm">No items found</div>}
                </div>
             )
          ) : (
            /* Booth UI omitted for brevity, same as before */
            <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-white p-6 rounded-lg border border-gray-200 w-full max-w-sm text-center shadow-sm">
                    <div className="w-12 h-12 bg-gray-100 rounded mx-auto mb-4 flex items-center justify-center text-black border border-gray-200">
                        <Package size={24} />
                    </div>
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Booth Configuration</h2>
                    {/* ... (Booth Selectors) ... */}
                    <div className="space-y-4 text-left">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Service Type</label>
                            <select className="w-full p-2 bg-white border border-gray-300 rounded text-sm focus:border-black focus:ring-1 focus:ring-black outline-none" value={serviceCategory} onChange={(e) => { setServiceCategory(e.target.value); setItemCategory(""); }}>
                                <option value="">Select Category</option>
                                {serviceCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Vehicle Size</label>
                            <select className="w-full p-2 bg-white border border-gray-300 rounded text-sm focus:border-black focus:ring-1 focus:ring-black outline-none" value={itemCategory} disabled={!serviceCategory} onChange={(e) => setItemCategory(e.target.value)}>
                                <option value="">Select Size</option>
                                {itemCategories.map(i => <option key={i.id} value={i.itemCategory}>{i.itemCategory}</option>)}
                            </select>
                        </div>
                        {boothPrice > 0 && (
                            <button onClick={() => setStep(1)} className="w-full py-3 bg-black text-white rounded font-bold text-sm mt-4">
                                Add Service (₵{boothPrice})
                            </button>
                        )}
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* MOBILE FLOATING BAR */}
        {items.length > 0 && step === 0 && (
            <div className="md:hidden absolute bottom-4 left-4 right-4 bg-black text-white p-4 rounded-xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-4 cursor-pointer" onClick={() => setStep(1)}>
                 <div className="flex items-center gap-3">
                     <div className="relative">
                         <ShoppingCart size={20} />
                         <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-black">{items.length}</span>
                     </div>
                     <span className="text-sm font-medium">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <span className="font-bold text-lg">₵{grandTotal.toFixed(2)}</span>
                     <ArrowRight size={20} className="ml-2" />
                 </div>
            </div>
        )}
      </div>

      {/* -----------------------------
          RIGHT COLUMN: CART & CHECKOUT
          ----------------------------- */}
      <div className={`
         md:w-[400px] flex flex-col bg-white md:rounded-lg shadow-sm border border-gray-200 h-full overflow-hidden 
         absolute inset-0 z-20 md:relative md:z-0
         ${step === 0 ? 'hidden md:flex' : 'flex'}
      `}>
        
        {/* VIEW 1: CART */}
        {(step === 1 || (step === 0 && window.innerWidth >= 768)) && (
          <>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white h-[72px]">
                <div className="flex items-center gap-2">
                    <button onClick={() => setStep(0)} className="md:hidden p-1.5 -ml-1 hover:bg-gray-100 rounded text-gray-500">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="font-bold text-lg text-gray-900">Cart</h2>
                </div>
                <Button variant="outline" onClick={handleReset} className="h-8 text-xs border-gray-200 hover:bg-gray-50 text-gray-700">Reset</Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
               {items.length === 0 && !boothPrice ? (
                   <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400">
                       <ShoppingCart className="w-10 h-10 mb-2 opacity-20" />
                       <p className="text-sm font-medium">Cart is empty</p>
                   </div>
               ) : (
                  <>
                    {saleType === 'counter' && items.map((item) => (
                        <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start relative">
                                <div className="flex gap-3">
                                    <div className={`w-12 h-12 rounded flex items-center justify-center text-white text-xs font-bold shrink-0 ${item.imageUrl ? "" : getItemColor(item.materialId)}`}>
                                        {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover rounded" /> : item.materialName.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm leading-tight">{item.materialName}</h4>
                                        <span className="text-indigo-600 font-bold text-xs">₵{item.unitPrice.toFixed(2)} / unit</span>
                                    </div>
                                </div>
                                <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                            </div>

                            <div className="flex items-center justify-between">
                                {/* Unit Select */}
                                {item.availableUnits?.length > 0 ? (
                                    <select 
                                        value={item.unitId || "base"} 
                                        onChange={(e) => handleUnitChange(item.id, e.target.value)}
                                        className="text-xs bg-gray-50 border border-gray-200 rounded py-1 px-2 font-medium text-gray-700 outline-none"
                                    >
                                        <option value="base">{item.baseUnit}</option>
                                        {item.availableUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                ) : (
                                    <span className="text-xs text-gray-500 font-medium px-2">{item.baseUnit}</span>
                                )}

                                {/* Black Qty Buttons */}
                                <div className="flex items-center gap-0">
                                    <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-l hover:bg-gray-800 transition-colors"><Minus size={14} /></button>
                                    <input type="number" value={item.quantity} onChange={(e) => handleQuantityInput(item.id, e.target.value)} className="w-12 h-8 text-center border-y border-black text-sm font-bold p-0 focus:ring-0 z-10" />
                                    <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-r hover:bg-gray-800 transition-colors"><Plus size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {saleType === "booth" && serviceCategory && itemCategory && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">{serviceCategory}</h4>
                                <p className="text-xs text-gray-500">{itemCategory}</p>
                            </div>
                            <span className="font-bold text-lg text-black">₵{boothPrice.toFixed(2)}</span>
                        </div>
                    )}
                  </>
               )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex justify-between items-end mb-4">
                    <span className="text-sm text-gray-500 font-medium">Subtotal</span>
                    <span className="text-2xl font-bold text-gray-900">₵{subTotal.toFixed(2)}</span>
                </div>
                <Button onClick={() => setStep(2)} disabled={subTotal <= 0} className="w-full py-4 text-sm font-bold bg-black hover:bg-gray-900 text-white rounded-md shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    Proceed to Payment <ArrowRight size={16} />
                </Button>
            </div>
          </>
        )}

        {/* VIEW 2: PAYMENT */}
        {step === 2 && (
            <>
                <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white h-[72px]">
                    <button onClick={() => setStep(1)} className="p-2 -ml-2 hover:bg-gray-100 rounded text-black bg-black text-white transition-colors">
                        <ArrowLeft size={16} />
                    </button>
                    <h2 className="font-bold text-lg text-gray-900">Payment</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white">
                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900">Sales date</label>
                        <div className="relative">
                            <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="w-full p-3 bg-gray-100 border-none rounded text-sm font-medium focus:ring-2 focus:ring-black" />
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                        </div>
                    </div>

                    {/* Customer Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900">Customer</label>
                        <CustomerSelect value={selectedCustomer} onChange={setSelectedCustomer} />
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900">Payment method</label>
                        <div className="flex flex-wrap gap-2">
                            {['Cash', 'Card', 'Mobile Money'].map(m => {
                                const val = m.toLowerCase().replace(" ", "");
                                return (
                                    <button key={val} onClick={() => setPaymentMethod(val)} className={`py-2 px-4 rounded border text-sm font-medium transition-all ${paymentMethod === val ? 'border-black bg-white text-black ring-1 ring-black' : 'border-gray-300 text-gray-600 bg-white hover:border-gray-400'}`}>
                                        {m}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Payment Status */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-900">Payment status</label>
                        <div className="flex gap-2">
                            {['Paid', 'Partially', 'Unpaid'].map(status => {
                                const val = status.toLowerCase();
                                return (
                                    <button key={val} onClick={() => setPaymentStatus(val)} className={`py-2 px-4 rounded border text-sm font-medium transition-all ${paymentStatus === val ? 'border-black bg-white text-black ring-1 ring-black' : 'border-gray-300 text-gray-600 bg-white hover:border-gray-400'}`}>
                                        {status}
                                    </button>
                                );
                            })}
                        </div>
                        {paymentStatus === 'partially' && (
                             <div className="animate-in fade-in pt-2">
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Amount Paid So Far</label>
                                <input type="number" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-black focus:ring-1 focus:ring-black outline-none" placeholder="0.00" />
                             </div>
                        )}
                    </div>

                    {/* DISCOUNT SECTION */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-900">Discount</span>
                            {!showDiscountInput && !discount ? (
                                <button onClick={() => setShowDiscountInput(true)} className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:underline">
                                    <Tag size={12} /> Add Discount
                                </button>
                            ) : (
                                <button onClick={() => { setDiscount(""); setShowDiscountInput(false); }} className="text-xs text-red-500 font-bold flex items-center gap-1 hover:underline">
                                    <X size={12} /> Remove
                                </button>
                            )}
                        </div>
                        
                        {(showDiscountInput || discount) && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                <div className="relative w-full">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₵</span>
                                    <input 
                                        type="number" 
                                        placeholder="0.00"
                                        value={discount}
                                        onChange={(e) => setDiscount(e.target.value)}
                                        className="w-full pl-7 p-2 border border-gray-300 rounded text-sm focus:border-black focus:ring-1 focus:ring-black outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Summary Lines */}
                    <div className="pt-4 border-t border-gray-100 space-y-2 text-sm">
                        <div className="flex justify-between text-gray-500">
                            <span>Subtotal</span>
                            <span>₵{subTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                            <span>Discount</span>
                            <span className="text-red-500">- ₵{validDiscount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-900 font-bold text-lg pt-2 border-t border-gray-100 mt-2">
                            <span>Total</span>
                            <span>₵{grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 bg-white space-y-3">
                    <Button onClick={() => handleFinalSubmit(false)} loading={createSaleMutation.isPending} className="w-full py-3 text-sm font-bold bg-gray-900 hover:bg-black text-white rounded-md shadow-sm">
                        Complete order
                    </Button>
                    <button onClick={() => handleFinalSubmit(true)} disabled={createSaleMutation.isPending} className="w-full py-3 text-sm font-bold bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 rounded-md">
                        Save as draft
                    </button>
                </div>
            </>
        )}
      </div>
    </div>
  );
}