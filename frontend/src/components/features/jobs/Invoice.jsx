import { format } from 'date-fns';
import Button from '@components/common/Button';

const NAVY = '#1B2A4A';
const YELLOW = '#FFC20E';
const TEAL = '#12B3B6';

const num = (n) =>
  parseFloat(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// e.g. "18TH AUGUST 2026"
const invoiceDateFmt = (d) => format(d, 'do MMMM yyyy').toUpperCase();

const JOB_TYPE_LABELS = {
  sprayer: 'FULL SPRAY',
  mechanic: 'MECHANICAL WORKS',
  bodyworks: 'BODY WORKS',
  other: 'WORKSHOP SERVICE',
};

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
    @page { size: A4; margin: 12mm; }
    html, body { margin: 0; padding: 0; background: white; font-family: Arial, Helvetica, sans-serif; }
    .print-hidden { display: none !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .invoice-print-root {
      max-width: none !important;
      box-shadow: none !important;
      border: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    /* Flow naturally across pages; just keep logical blocks intact */
    .invoice-keep-together { break-inside: avoid; page-break-inside: avoid; }
    tr { break-inside: avoid; page-break-inside: avoid; }
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

  const job = invoice.job || {};
  const vehicle = job.vehicle || {};
  const vehicleName = [job.vehicleMake, job.vehicleModel].filter(Boolean).join(' ').toUpperCase();
  const serviceLabel = (job.problemType || JOB_TYPE_LABELS[job.jobType] || job.jobType || '').toUpperCase();
  const invoiceDate = new Date(invoice.invoiceDate || invoice.createdAt || Date.now());

  const signatureName =
    businessSettings?.bankAccountName || businessSettings?.momoName || businessSettings?.name || '';

  const statusColors = {
    paid: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
    partial: 'bg-amber-100 text-amber-700 border border-amber-300',
    unpaid: 'bg-red-100 text-red-700 border border-red-300',
    quote: 'bg-amber-50 text-amber-700 border border-amber-200',
    converted: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };

  return (
    <>
      {/* On-screen payment status strip — never printed */}
      <div className="max-w-4xl mx-auto mb-3 flex items-center justify-between print-hidden">
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusColors[invoice.paymentStatus] || statusColors.unpaid}`}>
          {invoice.paymentStatus?.toUpperCase() || 'UNPAID'}
        </span>
        {amountPaid > 0 && (
          <span className="text-xs text-gray-500">
            Paid: <span className="font-semibold text-emerald-700">GHC {num(amountPaid)}</span>
            <span className="mx-2 text-gray-300">|</span>
            Balance: <span className={`font-semibold ${amountDue > 0 ? 'text-red-600' : 'text-emerald-700'}`}>GHC {num(amountDue)}</span>
          </span>
        )}
      </div>

      <div className="invoice-print-root max-w-4xl mx-auto bg-white font-sans shadow-sm">

        {/* ═══════════════════ PAGE 1 ═══════════════════ */}

        {/* Top accent bar */}
        <div className="flex items-center mb-8">
          <div className="w-4 h-4 shrink-0" style={{ backgroundColor: TEAL }} />
          <div className="h-4 flex-1" style={{ backgroundColor: NAVY }} />
        </div>

        {/* Header: INVOICE + logo */}
        <div className="flex justify-between items-start mb-10 px-1">
          <h1 className="text-5xl font-extrabold text-black tracking-tight">INVOICE</h1>
          <div className="text-right">
            {businessSettings?.logo ? (
              <img
                src={businessSettings.logo}
                alt={businessSettings?.name || 'Company Logo'}
                className="h-16 object-contain ml-auto"
              />
            ) : (
              <p className="text-sm font-extrabold uppercase tracking-wide" style={{ color: NAVY }}>
                {businessSettings?.name || 'Auto Workshop'}
              </p>
            )}
          </div>
        </div>

        {/* Bill To + Invoice meta */}
        <div className="px-1 mb-10">
          <h2 className="text-lg font-extrabold mb-3" style={{ color: NAVY }}>Bill To:</h2>
          <div className="flex justify-between items-start gap-8">
            <div className="text-sm text-gray-900 space-y-0.5">
              <p><span className="font-bold">Client Name:</span> {job.clientName || ''}</p>
              <p><span className="font-bold">Phone:</span> {job.clientPhone || ''}</p>
              <p><span className="font-bold">Email:</span> {job.clientEmail || ''}</p>
            </div>
            <div className="text-sm text-gray-900 space-y-0.5">
              <p><span className="font-bold">Invoice Number:</span> {invoice.invoiceNumber}</p>
              <p><span className="font-bold">Invoice Date:</span> {invoiceDateFmt(invoiceDate)}</p>
            </div>
          </div>
        </div>

        {/* Service details table */}
        <div className="px-1 mb-8">
          <h2 className="text-lg font-extrabold mb-4" style={{ color: NAVY }}>
            Service Details:{serviceLabel}
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: YELLOW, color: NAVY }}>
                <th className="py-2.5 px-3 text-left font-bold w-10">No</th>
                <th className="py-2.5 px-3 text-left font-bold">Description of Service</th>
                <th className="py-2.5 px-3 text-left font-bold w-24">Quantity</th>
                <th className="py-2.5 px-3 text-left font-bold w-24">Price (GHC)</th>
                <th className="py-2.5 px-3 text-left font-bold w-28">Total (GHC)</th>
              </tr>
            </thead>
            <tbody>
              {(job.materials || []).map((mat, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                  <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                  <td className="py-2 px-3 text-gray-900">
                    {mat.materialName}
                    {mat.isExternal && (
                      <span className="ml-2 text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded print-hidden">External</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-gray-900 font-semibold">{parseFloat(mat.quantity)}</td>
                  <td className="py-2 px-3 text-gray-900">{num(mat.unitPrice)}</td>
                  <td className="py-2 px-3 text-gray-900">{num(mat.subtotal)}</td>
                </tr>
              ))}

              {/* Summary rows */}
              {miscCost > 0 && (
                <tr className="border-t border-gray-200">
                  <td className="py-2 px-3" colSpan={2} />
                  <td className="py-2 px-3 font-bold text-gray-900 uppercase" colSpan={2}>Miscellaneous</td>
                  <td className="py-2 px-3 text-gray-900">{num(miscCost)}</td>
                </tr>
              )}
              <tr className="border-t border-gray-200">
                <td className="py-2 px-3" colSpan={2} />
                <td className="py-2 px-3 font-bold text-gray-900 uppercase" colSpan={2}>Material Cost</td>
                <td className="py-2 px-3 text-gray-900">{num(materialsCost)}</td>
              </tr>
              {labourCost > 0 && (
                <tr className="border-t border-gray-200">
                  <td className="py-2 px-3" colSpan={2} />
                  <td className="py-2 px-3 font-bold text-gray-900 uppercase" colSpan={2}>Labour</td>
                  <td className="py-2 px-3 text-gray-900">{num(labourCost)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-800">
                <td className="py-3 px-3" colSpan={2} />
                <td className="py-3 px-3 font-extrabold text-lg text-black" colSpan={2}>TOTAL</td>
                <td className="py-3 px-3 font-extrabold text-lg text-black whitespace-nowrap">{num(totalAmount)} GHC</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Car details + payment info — flows onto extra pages only when needed ── */}
        <div className="px-1 pt-2">

          {/* Car details */}
          <div className="invoice-keep-together mb-8">
            <h2 className="text-lg font-extrabold mb-4" style={{ color: NAVY }}>
              Car Details:{vehicleName}
            </h2>
            <div className="text-sm text-gray-900 space-y-0.5">
              <p><span className="font-semibold">Vin Number:</span> {vehicle.vin || ''}</p>
              <p><span className="font-semibold">Mileage:</span> {vehicle.mileage ?? job.odometer ?? ''}</p>
              <p><span className="font-semibold">Year:</span> {vehicle.year || ''}</p>
              {job.vehicleRegNumber && (
                <p><span className="font-semibold">Reg Number:</span> {job.vehicleRegNumber}</p>
              )}
            </div>
          </div>

          {/* Payment Information */}
          <div className="invoice-keep-together">
            <div className="text-white px-4 py-2.5 mb-4" style={{ backgroundColor: NAVY }}>
              <h2 className="text-lg font-extrabold">Payment Information:</h2>
            </div>

            <div className="text-sm text-gray-900 space-y-0.5 mb-2">
              <p><span className="font-bold">Payment Method:</span> Bank Transfer(Ghc)</p>
              {businessSettings?.bankName && (
                <>
                  <p><span className="font-bold">Bank Account:</span> {businessSettings.bankName}</p>
                  {businessSettings.bankAccountName && <p>{businessSettings.bankAccountName}</p>}
                  {businessSettings.bankAccountNumber && <p>{businessSettings.bankAccountNumber}</p>}
                </>
              )}
            </div>

            {(businessSettings?.momoNumber || businessSettings?.momoName) && (
              <div className="text-sm text-gray-900 space-y-0.5 mt-4 mb-4">
                <p className="font-bold">MOMO:</p>
                {businessSettings.momoNumber && <p>{businessSettings.momoNumber}</p>}
                {businessSettings.momoName && <p>{businessSettings.momoName}</p>}
              </div>
            )}

            {businessSettings?.invoicePaymentNote && (
              <p className="text-sm font-bold text-red-600 mt-4">{businessSettings.invoicePaymentNote}</p>
            )}
          </div>

          {/* Questions + signature */}
          <div className="invoice-keep-together">
            <h2 className="text-xl font-extrabold text-gray-900 mt-2 mb-4">Questions</h2>
            <div className="flex justify-between items-end mb-8">
              <div className="text-sm text-gray-900 space-y-0.5">
                {businessSettings?.email && <p><span className="font-bold">Email US:</span> {businessSettings.email}</p>}
                {businessSettings?.phone && <p><span className="font-bold">Call US:</span> {businessSettings.phone}</p>}
              </div>
              <div className="text-right text-sm text-gray-900">
                <p className="border-b border-gray-400 pb-1 px-8">Date : {format(invoiceDate, 'MMMM d, yyyy')}</p>
                <p className="pt-1">{signatureName}</p>
              </div>
            </div>

            {/* Bottom accent bar */}
            <div className="flex items-center">
              <div className="w-4 h-4 shrink-0" style={{ backgroundColor: TEAL }} />
              <div className="h-4 flex-1" style={{ backgroundColor: NAVY }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment History (on-screen only) ─────────────────── */}
      {invoice.payments?.length > 0 && (
        <div className="max-w-4xl mx-auto mt-6 mb-6 border border-gray-200 rounded-lg p-4 print-hidden">
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
                  <span className="font-semibold text-gray-900">GHC {num(payment.amount)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Footer actions (on-screen only) ──────────────────── */}
      <div className="max-w-4xl mx-auto flex justify-end items-center gap-3 border-t border-gray-200 pt-4 mt-4 print-hidden">
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
    </>
  );
}
