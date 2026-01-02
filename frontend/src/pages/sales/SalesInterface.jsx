import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

// Icons/Assets (Assumed to be available or replaceable with SVGs)
const CartIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>;
const TrashIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

export default function SalesInterface() {
  const { user } = useAuthStore();
  const [materials, setMaterials] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    const suspended = localStorage.getItem('suspended_sale');
    if (suspended) {
      const data = JSON.parse(suspended);
      setCart(data.cart || []);
      setPaymentMethod(data.paymentMethod || 'cash');
    }
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await api.get('/materials');
      setMaterials(response.materials.filter(m => m.isActive && m.quantity > 0));
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (material) => {
    const existingItem = cart.find(item => item.materialId === material.id);
    if (existingItem) {
      if (existingItem.quantity >= material.quantity) {
        alert(`Only ${material.quantity} units available`);
        return;
      }
      setCart(cart.map(item => item.materialId === material.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, {
        materialId: material.id,
        name: material.name,
        unitPrice: parseFloat(material.sellingPrice),
        costPrice: parseFloat(material.costPrice),
        quantity: 1,
        availableStock: material.quantity,
      }]);
    }
  };

  const updateQuantity = (materialId, newQuantity) => {
    const item = cart.find(i => i.materialId === materialId);
    if (newQuantity > item.availableStock) return;
    if (newQuantity <= 0) {
      removeFromCart(materialId);
      return;
    }
    setCart(cart.map(item => item.materialId === materialId ? { ...item, quantity: newQuantity } : item));
  };

  const removeFromCart = (materialId) => setCart(cart.filter(item => item.materialId !== materialId));

  const clearCart = () => {
    if (window.confirm('Clear all items?')) {
      setCart([]);
      localStorage.removeItem('suspended_sale');
    }
  };

  const suspendSale = () => {
    if (cart.length === 0) return;
    localStorage.setItem('suspended_sale', JSON.stringify({ cart, paymentMethod, timestamp: new Date().toISOString() }));
    setCart([]);
    alert('Sale suspended');
  };

  const resumeSale = () => {
    const suspended = localStorage.getItem('suspended_sale');
    if (suspended) {
      const data = JSON.parse(suspended);
      setCart(data.cart || []);
      setPaymentMethod(data.paymentMethod || 'cash');
      localStorage.removeItem('suspended_sale');
    }
  };

  const calculateTotal = () => cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const calculateProfit = () => cart.reduce((sum, item) => sum + ((item.unitPrice - item.costPrice) * item.quantity), 0);

  const completeSale = async () => {
    if (cart.length === 0) return;
    try {
      setProcessing(true);
      const saleData = { items: cart.map(item => ({ materialId: item.materialId, quantity: item.quantity })), paymentMethod };
      const response = await api.post('/sales', saleData);
      setLastSale(response.sale);
      setShowSuccess(true);
      localStorage.removeItem('suspended_sale');
      setCart([]);
      fetchMaterials();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      alert(error.error?.message || 'Sale failed');
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = () => {
    setShowReceipt(true);
    setTimeout(() => { window.print(); setShowReceipt(false); }, 500);
  };

  const filteredMaterials = materials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-120px)]">
          
          {/* LEFT: Material Selection (7 columns) */}
          <div className="lg:col-span-7 flex flex-col h-full overflow-hidden">
            <header className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New Sale</h1>
                <p className="text-sm text-slate-500 mt-1">Select materials to build a customer order.</p>
              </div>
              {localStorage.getItem('suspended_sale') && (
                <button onClick={resumeSale} className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full hover:bg-amber-100 transition-colors">
                  Resume Pending Sale
                </button>
              )}
            </header>

            <div className="relative mb-6">
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 transition-all text-slate-700"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
                  {filteredMaterials.map((material) => (
                    <button
                      key={material.id}
                      onClick={() => addToCart(material)}
                      className="group p-5 bg-white border border-slate-100 rounded-2xl text-left hover:border-slate-300 hover:shadow-sm transition-all relative overflow-hidden active:scale-[0.98]"
                    >
                      <span className="block text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">In Stock: {material.quantity}</span>
                      <h3 className="text-slate-900 font-semibold mb-3 leading-snug">{material.name}</h3>
                      <p className="text-xl font-bold text-slate-900">GH₵ {parseFloat(material.sellingPrice).toFixed(2)}</p>
                      <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white rounded-full p-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Cart (5 columns) */}
          <div className="lg:col-span-5 flex flex-col h-full">
            <div className="bg-white border border-slate-200 rounded-3xl flex flex-col h-full shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <CartIcon />
                  <span className="font-semibold text-slate-900">Order Summary</span>
                </div>
                {cart.length > 0 && (
                  <div className="flex gap-4">
                    <button onClick={suspendSale} className="text-xs font-medium text-slate-500 hover:text-slate-800 uppercase tracking-widest">Suspend</button>
                    <button onClick={clearCart} className="text-xs font-medium text-red-400 hover:text-red-600 uppercase tracking-widest">Clear</button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <CartIcon />
                    </div>
                    <p className="text-sm">No items in cart</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.materialId} className="flex items-center gap-4 group">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-slate-900">{item.name}</h4>
                        <p className="text-xs text-slate-500">GH₵ {item.unitPrice.toFixed(2)} / unit</p>
                      </div>
                      <div className="flex items-center bg-slate-50 rounded-lg p-1">
                        <button onClick={() => updateQuantity(item.materialId, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">−</button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.materialId, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">+</button>
                      </div>
                      <div className="w-20 text-right">
                        <p className="text-sm font-semibold text-slate-900">{(item.unitPrice * item.quantity).toFixed(2)}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.materialId)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                        <TrashIcon />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Payment via</span>
                    <select 
                      value={paymentMethod} 
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="bg-transparent font-medium text-slate-900 text-right outline-none cursor-pointer"
                    >
                      <option value="cash">Cash</option>
                      <option value="momo">Mobile Money</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Est. Profit</span>
                    <span className="text-emerald-600 font-medium">+ GH₵ {calculateProfit().toFixed(2)}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="text-lg font-semibold text-slate-900">Total Due</span>
                    <span className="text-3xl font-bold tracking-tight text-slate-900">GH₵ {calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={completeSale}
                  disabled={processing || cart.length === 0}
                  className="w-full bg-slate-900 text-white rounded-2xl py-4 font-semibold text-lg hover:bg-slate-800 transition-all disabled:bg-slate-200 disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  {processing ? 'Processing...' : 'Complete Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Overlay Success */}
      {showSuccess && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-10 text-center shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Sale Success</h2>
            <p className="text-slate-500 mb-8">Transaction completed for GH₵ {parseFloat(lastSale?.totalAmount).toFixed(2)}</p>
            <div className="space-y-3">
              <button onClick={printReceipt} className="w-full bg-slate-900 text-white rounded-xl py-3 font-medium hover:bg-slate-800 transition-all">Print Receipt</button>
              <button onClick={() => setShowSuccess(false)} className="w-full bg-slate-100 text-slate-600 rounded-xl py-3 font-medium hover:bg-slate-200 transition-all">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt styles handled via local className logic as before, but with updated styling for the template */}
      {showReceipt && lastSale && (
        <div className="hidden print:block p-10 font-mono text-xs">
          <div className="text-center border-b pb-4 mb-4 uppercase tracking-tighter">
            <h1 className="text-xl font-bold">Auto Workshop</h1>
            <p>Accra, Ghana</p>
          </div>
          <div className="mb-4">
            <p>Date: {new Date(lastSale.saleDate).toLocaleString()}</p>
            <p>Receipt ID: {lastSale.id}</p>
            <p>Operator: {lastSale.soldBy?.fullName || user?.fullName}</p>
          </div>
          <table className="w-full mb-4">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2">Item</th>
                <th className="text-right pb-2">Qty</th>
                <th className="text-right pb-2">Amt</th>
              </tr>
            </thead>
            <tbody>
              {lastSale.items?.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1">{item.material?.name}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">{parseFloat(item.subtotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t pt-2 text-right">
            <p className="text-lg font-bold">TOTAL: GH₵ {parseFloat(lastSale.totalAmount).toFixed(2)}</p>
          </div>
          <p className="mt-10 text-center">THANK YOU</p>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        @media print {
          body * { visibility: hidden; }
          .print\:block, .print\:block * { visibility: visible; }
          .print\:block { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </DashboardLayout>
  );
}