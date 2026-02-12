import { format } from 'date-fns';

export default function Receipt({ receipt, sale }) {
  // Add null checks to prevent errors
  if (!receipt || !sale) {
    return (
      <div className="max-w-md mx-auto p-8">
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Receipt Not Available</h3>
          <p className="text-gray-600">The receipt data could not be loaded or has been closed.</p>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  // Helper to safely parse numbers
  const val = (num) => parseFloat(num || 0);

  // Calculate subtotal (Total + Discount) to show the value before savings
  const totalAmount = val(sale.totalAmount);
  const discount = val(sale.discount);
  const subtotal = totalAmount + discount;
  const amountPaid = val(sale.amountPaid);
  const balance = val(sale.balance);

  return (
    <div className="max-w-md mx-auto">
      {/* Receipt Content */}
      <div className="bg-white p-8 border border-gray-200 rounded-xl shadow-sm print:shadow-none print:border-0 print:p-0">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight uppercase">
              {receipt.businessName || 'Business Name'}
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              {receipt.businessAddress || 'Business Address'}
            </p>
            <p className="text-sm text-gray-600">
              {receipt.businessContact || 'Business Contact'}
            </p>
          </div>
          <div className="border-t border-b border-gray-200 py-2 mt-4">
            <p className="text-sm font-bold text-gray-800 uppercase tracking-widest">Sales Receipt</p>
          </div>
        </div>

        {/* Receipt Details & Customer Info Grid */}
        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Receipt Details</p>
            <p><span className="text-gray-600">No:</span> <span className="font-semibold text-gray-900">#{receipt.receiptNumber}</span></p>
            <p><span className="text-gray-600">Date:</span> <span className="text-gray-900">{receipt.issuedDate ? format(new Date(receipt.issuedDate), 'dd/MM/yy HH:mm') : 'N/A'}</span></p>
            <p><span className="text-gray-600">Pay Via:</span> <span className="font-medium uppercase text-gray-900">{receipt.paymentMethod}</span></p>
          </div>
          
          <div className="space-y-1 text-right">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Bill To</p>
            {sale.customerName ? (
              <>
                <p className="font-semibold text-gray-900">{sale.customerName}</p>
                {sale.customerPhone && <p className="text-gray-600">{sale.customerPhone}</p>}
              </>
            ) : (
              <p className="text-gray-500 italic">Walk-in Customer</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Cashier: {sale?.user?.username || 'Staff'}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <div className="overflow-hidden border-t border-b border-gray-200">
            <table className="w-full text-sm my-1">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 font-semibold text-gray-700">Item</th>
                  <th className="text-center py-2 font-semibold text-gray-700">Qty</th>
                  <th className="text-right py-2 font-semibold text-gray-700">Price</th>
                  <th className="text-right py-2 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale?.items?.map((item, index) => {
                const unitLabel = item.materialUnit;
                console.log('Rendering item:', item, 'with unit label:', unitLabel);
                return (
                  <tr key={index} className="border-b border-gray-50 last:border-b-0">
                    <td className="py-2 text-gray-900">
                      {item.itemType === 'material' ? item.materialName : 'Booth Service'}
                    </td>
                    <td className="text-center py-2 text-gray-600">{Number(item.quantity)} <span className="text-xs font-medium">{item.materialUnit?.name || 'Unit'}</span></td>
                    <td className="text-right py-2 text-gray-600">{val(item.unitPrice).toFixed(2)}</td>
                    <td className="text-right py-2 font-medium text-gray-900">{val(item.subtotal).toFixed(2)}</td>
                  </tr>
                )
              
              })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="flex justify-end mb-8">
          <div className="w-2/3 space-y-2 text-sm">
            {/* Subtotal (only show if discount exists to avoid redundancy) */}
            {discount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>GH₵{subtotal.toFixed(2)}</span>
              </div>
            )}
            
            {/* Discount */}
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>- GH₵{discount.toFixed(2)}</span>
              </div>
            )}

            {/* Total Amount */}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
              <span>Total Amount</span>
              <span>GH₵{totalAmount.toFixed(2)}</span>
            </div>

            {/* Amount Paid */}
            <div className="flex justify-between text-gray-700 pt-1">
              <span>Amount Paid</span>
              <span>GH₵{amountPaid.toFixed(2)}</span>
            </div>

            {/* Balance Due */}
            {balance > 0 ? (
              <div className="flex justify-between text-red-600 font-bold pt-1 border-t border-dashed border-gray-300 mt-2">
                <span>Balance Due</span>
                <span>GH₵{balance.toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-gray-500 italic pt-1 mt-2">
                <span>Balance</span>
                <span>GH₵0.00</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-gray-200">
          <p className="font-semibold text-gray-900 mb-1">Thank you for your business!</p>
          <p className="text-xs text-gray-500">Please keep this receipt for your records.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-center gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Receipt
        </button>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}