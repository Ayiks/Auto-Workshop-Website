import { format } from 'date-fns';
import Button from '@components/common/Button';

const fmt = (n) => `GH₵${parseFloat(n || 0).toFixed(2)}`;

export default function Invoice({ invoice, onRecordPayment, businessSettings }) {
  const handlePrint = () => {
    const el = document.querySelector('.invoice-print-root');
    if (!el) { window.print(); return; }

    // Collect all Tailwind/Vite injected styles
    const styles = Array.from(document.querySelectorAll('style'))
      .map((s) => s.innerHTML)
      .join('\n');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>${styles}</style>
  <style>
    @page { size: A4; margin: 15mm; }
    html, body { margin: 0; padding: 0; background: white; font-family: sans-serif; }
    .print-hidden { display: none !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .invoice-print-root {
      max-width: none !important;
      box-shadow: none !important;
      border-left: 4px solid #14b8a6 !important;
      padding: 0 !important;
      margin: 0 !important;
    }
  </style>
</head>
<body>${el.outerHTML}</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=1200');
    if (!win) { window.print(); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const materialsCost = parseFloat(invoice.materialsCost || 0);
  const labourCost = parseFloat(invoice.labourCost || 0);
  const miscCost = parseFloat(invoice.miscellaneousCost || 0);
  const totalAmount = parseFloat(invoice.totalAmount || 0);
  const amountPaid = parseFloat(invoice.amountPaid || 0);
  const amountDue = parseFloat(invoice.amountDue || 0);

  const lastPayment = invoice.payments?.length > 0
    ? [...invoice.payments].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0]
    : null;
  const paymentMethod = lastPayment?.paymentMethod || 'Bank Transfer';

  const job = invoice.job || {};
  const vehicle = [job.vehicleMake, job.vehicleModel].filter(Boolean).join(' ');

  const statusColors = {
    paid: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
    partial: 'bg-amber-100 text-amber-700 border border-amber-300',
    unpaid: 'bg-red-100 text-red-700 border border-red-300',
    quote: 'bg-amber-50 text-amber-700 border border-amber-200',
    converted: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };

  return (
    <>
      <div className="invoice-print-root max-w-4xl mx-auto bg-white font-sans border-l-4 border-teal-500 shadow-sm">

        {/* ── Section A: Header ─────────────────────────────────── */}
        <div className="flex justify-between items-start pb-6 border-b-2 border-gray-800 mb-6">
          {/* Left: INVOICE title */}
          <div>
            <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">INVOICE</h1>
            <p className="text-sm text-gray-500 mt-2">Invoice #: <span className="font-semibold text-gray-800">{invoice.invoiceNumber}</span></p>
            <p className="text-sm text-gray-500">Date: <span className="font-semibold text-gray-800">{format(new Date(invoice.invoiceDate || invoice.createdAt || Date.now()), 'MMMM d, yyyy')}</span></p>
          </div>

          {/* Right: Company logo box */}
          <div className="border-2 border-gray-200 rounded-xl px-5 py-4 text-right min-w-[180px] shadow-sm">
            {businessSettings?.logo ? (
              <img
                src={businessSettings.logo}
                alt="Company Logo"
                className="h-12 object-contain ml-auto mb-2"
              />
            ) : (
              <div className="h-12 flex items-center justify-end mb-2">
                <span className="text-2xl font-bold text-gray-700">{businessSettings?.name?.[0] || 'W'}</span>
              </div>
            )}
            <p className="font-bold text-gray-800 text-sm leading-tight">{businessSettings?.name || 'Auto Workshop'}</p>
            {businessSettings?.address && (
              <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{businessSettings.address}</p>
            )}
            {businessSettings?.phone && (
              <p className="text-xs text-gray-500">{businessSettings.phone}</p>
            )}
            {businessSettings?.email && (
              <p className="text-xs text-gray-500">{businessSettings.email}</p>
            )}
          </div>
        </div>

        {/* ── Section B: Bill To + Invoice Meta ─────────────────── */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Bill To */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1">Bill To:</h2>
            <p className="font-semibold text-gray-900 text-sm">{job.clientName || '—'}</p>
            {vehicle && <p className="text-sm text-gray-600 mt-0.5">{vehicle}</p>}
            {job.vehicleRegNumber && <p className="text-sm text-gray-600">Reg: {job.vehicleRegNumber}</p>}
            {job.clientPhone && <p className="text-sm text-gray-600 mt-1">Phone: {job.clientPhone}</p>}
            {job.clientEmail && <p className="text-sm text-gray-600">Email: {job.clientEmail}</p>}
          </div>

          {/* Invoice Meta */}
          <div className="text-right">
            <div className="inline-block text-left">
              <div className="flex justify-between gap-8 mb-1">
                <span className="text-sm text-gray-500 font-medium">Invoice Number:</span>
                <span className="text-sm font-bold text-gray-900">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between gap-8 mb-3">
                <span className="text-sm text-gray-500 font-medium">Invoice Date:</span>
                <span className="text-sm font-semibold text-gray-800">
                  {format(new Date(invoice.invoiceDate || invoice.createdAt || Date.now()), 'MMMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-end">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusColors[invoice.paymentStatus] || statusColors.unpaid}`}>
                  {invoice.paymentStatus?.toUpperCase() || 'UNPAID'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section C: Service Details Table ──────────────────── */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Service Details:</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-amber-400 text-gray-900">
                <th className="py-2.5 px-3 text-left font-bold w-10">No</th>
                <th className="py-2.5 px-3 text-left font-bold">Description of Service</th>
                <th className="py-2.5 px-3 text-right font-bold w-20">Quantity</th>
                <th className="py-2.5 px-3 text-right font-bold w-32">Rate (GH₵)</th>
                <th className="py-2.5 px-3 text-right font-bold w-28">Total (GH₵)</th>
              </tr>
            </thead>
            <tbody>
              {(job.materials || []).map((mat, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-3 text-gray-700">{i + 1}</td>
                  <td className="py-2 px-3 text-gray-900 font-medium">
                    {mat.materialName}
                    {mat.isExternal && (
                      <span className="ml-2 text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">External</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-700">{mat.quantity}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{parseFloat(mat.unitPrice).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-semibold text-gray-900">{parseFloat(mat.subtotal).toFixed(2)}</td>
                </tr>
              ))}

              {/* Labour row */}
              {labourCost > 0 && (
                <tr className={(job.materials || []).length % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-3 text-gray-500">—</td>
                  <td className="py-2 px-3 text-gray-900 font-medium">Labour Charges</td>
                  <td className="py-2 px-3 text-right text-gray-500">—</td>
                  <td className="py-2 px-3 text-right text-gray-500">—</td>
                  <td className="py-2 px-3 text-right font-semibold text-gray-900">{labourCost.toFixed(2)}</td>
                </tr>
              )}

              {/* Misc row */}
              {miscCost > 0 && (
                <tr className="bg-gray-50">
                  <td className="py-2 px-3 text-gray-500">—</td>
                  <td className="py-2 px-3 text-gray-900 font-medium">Miscellaneous</td>
                  <td className="py-2 px-3 text-right text-gray-500">—</td>
                  <td className="py-2 px-3 text-right text-gray-500">—</td>
                  <td className="py-2 px-3 text-right font-semibold text-gray-900">{miscCost.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Section D: Terms + Totals ──────────────────────────── */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Terms */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Terms and Conditions:</h2>
            <ul className="space-y-1.5">
              <li className="text-xs text-gray-600 flex gap-2">
                <span className="text-gray-400 shrink-0">•</span>
                Payment is due within 30 days of invoice date.
              </li>
              <li className="text-xs text-gray-600 flex gap-2">
                <span className="text-gray-400 shrink-0">•</span>
                Please retain this invoice for warranty claims.
              </li>
              <li className="text-xs text-gray-600 flex gap-2">
                <span className="text-gray-400 shrink-0">•</span>
                Contact us within 7 days for any disputes or queries.
              </li>
            </ul>
          </div>

          {/* Totals */}
          <div>
            <div className="border border-gray-200 rounded-lg p-4 space-y-2 bg-gray-50">
              {materialsCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Materials Sub-total</span>
                  <span className="font-medium text-gray-800">{fmt(materialsCost)}</span>
                </div>
              )}
              {labourCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Labour</span>
                  <span className="font-medium text-gray-800">{fmt(labourCost)}</span>
                </div>
              )}
              {miscCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Miscellaneous</span>
                  <span className="font-medium text-gray-800">{fmt(miscCost)}</span>
                </div>
              )}
              <div className="border-t border-gray-300 pt-2 flex justify-between text-base font-bold">
                <span>Total Amount Due</span>
                <span className="text-gray-900">{fmt(totalAmount)}</span>
              </div>
              {amountPaid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600 font-medium">Amount Paid</span>
                  <span className="text-emerald-700 font-semibold">{fmt(amountPaid)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-gray-300 pt-2">
                <span className={amountDue > 0 ? 'text-red-600' : 'text-emerald-600'}>Balance Due</span>
                <span className={amountDue > 0 ? 'text-red-700' : 'text-emerald-700'}>{fmt(amountDue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section E: Payment Information Banner ─────────────── */}
        <div className="payment-banner bg-[#1B2A4A] text-white rounded-lg px-6 py-5 mb-6 grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-300 mb-3">Payment Information:</h2>
            <div className="space-y-1.5 text-sm">
              <p>
                <span className="font-semibold text-gray-300">Payment Method: </span>
                <span className="capitalize">{paymentMethod}</span>
              </p>
              <p>
                <span className="font-semibold text-gray-300">Due Date: </span>
                {format(new Date(invoice.invoiceDate || invoice.createdAt || Date.now()), 'MMMM d, yyyy')}
              </p>
              {businessSettings?.bankDetails ? (
                <p>
                  <span className="font-semibold text-gray-300">Bank Details: </span>
                  {businessSettings.bankDetails}
                </p>
              ) : (
                <p className="text-gray-400 text-xs">Contact workshop for bank payment details.</p>
              )}
            </div>
          </div>
          <div className="text-right flex flex-col justify-between">
            <p className="text-sm text-gray-300">
              Date: {format(new Date(), 'MMMM d, yyyy')}
            </p>
            <div className="mt-auto">
              <div className="border-b border-gray-500 mb-1 w-40 ml-auto" style={{ height: 32 }} />
              <p className="text-xs text-gray-400">Authorized Signature</p>
              <p className="text-xs text-gray-300 font-medium mt-0.5">{businessSettings?.name || ''}</p>
            </div>
          </div>
        </div>

        {/* ── Payment History ────────────────────────────────────── */}
        {invoice.payments?.length > 0 && (
          <div className="mb-6 border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">Payment History</h3>
            <div className="space-y-2">
              {[...invoice.payments]
                .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
                .map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center py-1.5 px-3 bg-gray-50 rounded text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-700">{format(new Date(payment.paymentDate), 'MMM d, yyyy')}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded uppercase">{payment.paymentMethod}</span>
                      {payment.receipt && (
                        <span className="text-xs text-gray-500">Receipt: {payment.receipt.receiptNumber}</span>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900">{fmt(payment.amount)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Footer: Questions + Actions ───────────────────────── */}
        <div className="flex justify-between items-center border-t border-gray-200 pt-4 print-hidden">
          <div className="text-xs text-gray-500">
            <p className="font-semibold text-gray-700 mb-0.5">Questions?</p>
            {businessSettings?.email && <p>Email: {businessSettings.email}</p>}
            {businessSettings?.phone && <p>Call: {businessSettings.phone}</p>}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handlePrint} className="invoice-print-btn">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Invoice
            </Button>
            {invoice.paymentStatus !== 'paid' && onRecordPayment && (
              <Button variant="success" onClick={onRecordPayment}>
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Record Payment
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
