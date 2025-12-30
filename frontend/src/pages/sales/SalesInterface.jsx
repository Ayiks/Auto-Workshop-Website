import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

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

  // Load suspended sale from localStorage
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
        alert(`Only ${material.quantity} units available in stock`);
        return;
      }
      setCart(cart.map(item =>
        item.materialId === material.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
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
    
    if (newQuantity > item.availableStock) {
      alert(`Only ${item.availableStock} units available`);
      return;
    }
    
    if (newQuantity <= 0) {
      removeFromCart(materialId);
      return;
    }
    
    setCart(cart.map(item =>
      item.materialId === materialId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (materialId) => {
    setCart(cart.filter(item => item.materialId !== materialId));
  };

  const clearCart = () => {
    if (confirm('Clear all items from cart?')) {
      setCart([]);
      setPaymentMethod('cash');
      localStorage.removeItem('suspended_sale');
    }
  };

  const suspendSale = () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }
    localStorage.setItem('suspended_sale', JSON.stringify({
      cart,
      paymentMethod,
      timestamp: new Date().toISOString(),
    }));
    alert('Sale suspended! You can resume it later.');
    setCart([]);
    setPaymentMethod('cash');
  };

  const resumeSale = () => {
    const suspended = localStorage.getItem('suspended_sale');
    if (suspended) {
      const data = JSON.parse(suspended);
      setCart(data.cart || []);
      setPaymentMethod(data.paymentMethod || 'cash');
      localStorage.removeItem('suspended_sale');
      alert('Sale resumed!');
    } else {
      alert('No suspended sale found.');
    }
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const calculateProfit = () => {
    return cart.reduce((sum, item) => 
      sum + ((item.unitPrice - item.costPrice) * item.quantity), 0
    );
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    if (!confirm(`Complete sale of GH₵ ${calculateTotal().toFixed(2)} via ${paymentMethod.toUpperCase()}?`)) {
      return;
    }

    try {
      setProcessing(true);
      
      const saleData = {
        items: cart.map(item => ({
          materialId: item.materialId,
          quantity: item.quantity,
        })),
        paymentMethod,
      };

      const response = await api.post('/sales', saleData);
      
      setLastSale(response.sale);
      setShowSuccess(true);
      localStorage.removeItem('suspended_sale');
      setCart([]);
      setPaymentMethod('cash');
      fetchMaterials();
      
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      alert(error.error?.message || 'Failed to complete sale');
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = () => {
    setShowReceipt(true);
    setTimeout(() => window.print(), 100);
  };

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasSuspendedSale = !!localStorage.getItem('suspended_sale');

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Material Selection */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Select Materials</h2>
              {hasSuspendedSale && (
                <button onClick={resumeSale} className="text-sm bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">
                  Resume Suspended Sale
                </button>
              )}
            </div>
            
            <input
              type="text"
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input mb-4"
              autoFocus
            />

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                {filteredMaterials.map((material) => (
                  <button
                    key={material.id}
                    onClick={() => addToCart(material)}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left btn-touch"
                  >
                    <h3 className="font-semibold text-gray-900">{material.name}</h3>
                    <p className="text-lg font-bold text-primary-600 mt-1">
                      GH₵ {parseFloat(material.sellingPrice).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Stock: {material.quantity}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Cart */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Cart</h2>
              {cart.length > 0 && (
                <div className="flex space-x-2">
                  <button onClick={suspendSale} className="text-yellow-600 text-sm hover:text-yellow-700">
                    Suspend
                  </button>
                  <button onClick={clearCart} className="text-red-600 text-sm hover:text-red-700">
                    Clear
                  </button>
                </div>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-2">🛒</p>
                <p>Cart is empty</p>
                <p className="text-sm mt-1">Select materials to add to cart</p>
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <div className="space-y-3 max-h-[35vh] overflow-y-auto mb-4">
                  {cart.map((item) => (
                    <div key={item.materialId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-600">
                          GH₵ {item.unitPrice.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.materialId, item.quantity - 1)}
                            className="w-8 h-8 btn-touch bg-gray-200 rounded hover:bg-gray-300 font-bold"
                          >
                            −
                          </button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.materialId, item.quantity + 1)}
                            className="w-8 h-8 btn-touch bg-gray-200 rounded hover:bg-gray-300 font-bold"
                          >
                            +
                          </button>
                        </div>
                        
                        <p className="w-24 text-right font-bold text-gray-900">
                          GH₵ {(item.unitPrice * item.quantity).toFixed(2)}
                        </p>
                        
                        <button
                          onClick={() => removeFromCart(item.materialId)}
                          className="text-red-600 hover:text-red-700 ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment Method */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="input"
                  >
                    <option value="cash">Cash</option>
                    <option value="momo">Mobile Money (Momo)</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                {/* Totals */}
                <div className="border-t-2 border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-lg">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-bold">GH₵ {calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Profit:</span>
                    <span className="font-medium text-green-600">
                      GH₵ {calculateProfit().toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Payment:</span>
                    <span className="font-medium uppercase">{paymentMethod}</span>
                  </div>
                  <div className="flex justify-between text-2xl font-bold text-primary-600 pt-2 border-t">
                    <span>TOTAL:</span>
                    <span>GH₵ {calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Complete Sale Button */}
                <button
                  onClick={completeSale}
                  disabled={processing}
                  className="w-full btn-success btn-touch text-lg py-4 mt-4"
                >
                  {processing ? 'Processing...' : '✓ Complete Sale'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal with Print Option */}
      {showSuccess && lastSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center max-w-md">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Sale Completed!</h2>
            <p className="text-gray-600 mb-4">GH₵ {parseFloat(lastSale.totalAmount).toFixed(2)}</p>
            <button
              onClick={printReceipt}
              className="btn-primary w-full mb-2"
            >
              🖨️ Print Receipt
            </button>
            <button
              onClick={() => setShowSuccess(false)}
              className="btn-secondary w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Receipt Template */}
      {showReceipt && lastSale && (
        <div className="hidden print:block">
          <div className="p-8 max-w-md mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">Auto Workshop</h1>
              <p className="text-sm">Sales Receipt</p>
            </div>

            <div className="mb-4 text-sm">
              <p><strong>Date:</strong> {new Date(lastSale.saleDate).toLocaleString()}</p>
              <p><strong>Receipt #:</strong> {lastSale.id}</p>
              <p><strong>Sold By:</strong> {lastSale.soldBy?.fullName || user?.fullName}</p>
              <p><strong>Payment:</strong> {lastSale.paymentMethod?.toUpperCase()}</p>
            </div>

            <table className="w-full mb-4 text-sm">
              <thead className="border-b-2 border-gray-300">
                <tr>
                  <th className="text-left py-2">Item</th>
                  <th className="text-center py-2">Qty</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {lastSale.items?.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-2">{item.material?.name}</td>
                    <td className="text-center py-2">{item.quantity}</td>
                    <td className="text-right py-2">GH₵ {parseFloat(item.unitPrice).toFixed(2)}</td>
                    <td className="text-right py-2">GH₵ {parseFloat(item.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t-2 border-gray-300 pt-2 mb-6">
              <div className="flex justify-between font-bold text-lg">
                <span>TOTAL:</span>
                <span>GH₵ {parseFloat(lastSale.totalAmount).toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center text-xs">
              <p>Thank you for your business!</p>
              <p className="mt-1">Accra, Ghana</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .hidden.print\\:block, .hidden.print\\:block * {
            visibility: visible;
          }
          .hidden.print\\:block {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}