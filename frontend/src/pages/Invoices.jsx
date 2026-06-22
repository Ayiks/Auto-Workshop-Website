// src/pages/Invoices.jsx
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi, quotesApi } from '@api/jobs';
import { useAuthStore } from '@stores/authStore';
import Button from '@components/common/Button';
import Table from '@components/common/Table';
import Modal from '@components/common/Modal';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '@components/common/LoadingSpinner';
import EmptyState from '@components/common/EmptyState';
import GenerateInvoiceModal from '@components/features/invoices/GenerateInvoiceModal';
import InvoiceDetails from '@components/features/invoices/InvoiceDetails';
import QuoteDetails from '@components/features/invoices/QuoteDetails';
import StandaloneInvoiceModal from '@components/features/invoices/StandaloneInvoiceModal';
import { format } from 'date-fns';

const PAYMENT_STATUS_STYLES = {
  unpaid:  'bg-red-50 text-red-700 border border-red-200',
  partial: 'bg-orange-50 text-orange-700 border border-orange-200',
  paid:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const PAYMENT_STATUS_LABELS = {
  unpaid:  'Unpaid',
  partial: 'Partially Paid',
  paid:    'Paid',
};

export default function Invoices() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('job'); // 'job' | 'standalone'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [quoteSearch, setQuoteSearch] = useState('');
  const [showStandaloneModal, setShowStandaloneModal] = useState(false);
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const invoiceDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (invoiceDropdownRef.current && !invoiceDropdownRef.current.contains(e.target)) {
        setShowInvoiceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch job invoices
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', { status: statusFilter !== 'all' ? statusFilter : undefined }],
    queryFn: () => invoicesApi.getInvoices({
      paymentStatus: statusFilter !== 'all' ? statusFilter : undefined,
    }),
    enabled: activeTab === 'job',
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: () => invoicesApi.getInvoiceStats(),
    enabled: activeTab === 'job',
  });

  // Fetch quotes (standalone invoices)
  const { data: quotesData, isLoading: quotesLoading } = useQuery({
    queryKey: ['quotes', { search: quoteSearch || undefined }],
    queryFn: () => quotesApi.getQuotes({ search: quoteSearch || undefined }),
    enabled: activeTab === 'standalone',
  });

  const invoices = invoicesData?.data || [];
  const rawStats = statsData?.data || {};
  const quotes = quotesData?.data || [];

  // Derive per-status counts from invoicesByStatus array
  const byStatus = {};
  (rawStats.invoicesByStatus || []).forEach((s) => {
    byStatus[s.paymentStatus] = s._count;
  });
  const stats = {
    total: rawStats.totalInvoices || 0,
    totalInvoiced: rawStats.totalAmount || 0,
    totalCollected: rawStats.totalPaid || 0,
    totalOutstanding: rawStats.totalOutstanding || 0,
    unpaid: byStatus.unpaid || 0,
    partial: byStatus.partial || 0,
    paid: byStatus.paid || 0,
  };

  // Generate invoice mutation (from job)
  const generateMutation = useMutation({
    mutationFn: invoicesApi.generateInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['invoice-stats']);
      queryClient.invalidateQueries(['jobs']);
      setShowGenerateModal(false);
      toast.success('Invoice generated successfully');
    },
    onError: (error) => toast.error(error.response?.data?.error?.message || 'Failed to generate invoice'),
  });

  // Filter job invoices by search term
  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
      invoice.job?.clientName?.toLowerCase().includes(searchLower) ||
      (invoice.job?.vehicleRegNumber && invoice.job.vehicleRegNumber.toLowerCase().includes(searchLower))
    );
  });

  const handleViewDetails = async (invoice) => {
    try {
      const response = await invoicesApi.getInvoice(invoice.id);
      setSelectedInvoice(response.data);
      setShowDetailsModal(true);
    } catch (error) {
      toast.error('Failed to load invoice details');
    }
  };

  const handleViewQuote = async (quote) => {
    try {
      const response = await quotesApi.getQuote(quote.id);
      setSelectedQuote(response.data);
      setShowQuoteModal(true);
    } catch {
      toast.error('Failed to load quote details');
    }
  };

  const jobColumns = [
    {
      header: 'Invoice #',
      accessor: 'invoiceNumber',
      render: (invoice) => (
        <span className="font-mono font-medium text-gray-900">{invoice.invoiceNumber}</span>
      ),
    },
    {
      header: 'Job / Client',
      accessor: 'job',
      render: (invoice) => (
        <div>
          <div className="font-medium text-gray-900 text-sm">
            Job #{String(invoice.jobId).substring(0, 6)} — {invoice.job?.clientName}
          </div>
          <div className="text-xs text-gray-500 capitalize mt-0.5">
            {invoice.job?.jobType?.replace('_', ' ')}
          </div>
        </div>
      ),
    },
    {
      header: 'Vehicle',
      accessor: 'vehicle',
      render: (invoice) => (
        <div className="text-sm">
          {invoice.job?.vehicleMake && invoice.job?.vehicleModel ? (
            <>
              <div className="text-gray-900">{invoice.job.vehicleMake} {invoice.job.vehicleModel}</div>
              {invoice.job?.vehicleRegNumber && (
                <div className="text-xs text-gray-500 uppercase mt-0.5">{invoice.job.vehicleRegNumber}</div>
              )}
            </>
          ) : (
            <span className="text-gray-400">N/A</span>
          )}
        </div>
      ),
    },
    {
      header: 'Total',
      accessor: 'totalAmount',
      render: (invoice) => (
        <span className="font-semibold text-gray-900 font-mono">
          GH₵{parseFloat(invoice.totalAmount).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Paid',
      accessor: 'amountPaid',
      render: (invoice) => (
        <span className="text-sm font-medium text-green-700 font-mono">
          GH₵{parseFloat(invoice.amountPaid).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Due',
      accessor: 'amountDue',
      render: (invoice) => (
        <span className={`text-sm font-medium font-mono ${parseFloat(invoice.amountDue) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
          GH₵{parseFloat(invoice.amountDue).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: 'invoiceDate',
      render: (invoice) => (
        <span className="text-sm text-gray-900">{format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'paymentStatus',
      render: (invoice) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_STYLES[invoice.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
          {PAYMENT_STATUS_LABELS[invoice.paymentStatus] || invoice.paymentStatus}
        </span>
      ),
    },
    {
      header: '',
      accessor: 'actions',
      render: (invoice) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => handleViewDetails(invoice)}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title="View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          {invoice.paymentStatus !== 'paid' && (
            <button
              onClick={() => handleViewDetails(invoice)}
              className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-black hover:underline transition-colors"
              title="Record Payment"
            >
              Pay
            </button>
          )}
        </div>
      ),
    },
  ];

  const quoteColumns = [
    {
      header: 'Quote #',
      accessor: 'quoteNumber',
      render: (q) => <span className="font-mono font-medium text-gray-900">{q.quoteNumber}</span>,
    },
    {
      header: 'Client',
      accessor: 'clientName',
      render: (q) => (
        <div>
          <div className="font-medium text-gray-900 text-sm">{q.clientName}</div>
          {q.clientPhone && <div className="text-xs text-gray-500 mt-0.5">{q.clientPhone}</div>}
        </div>
      ),
    },
    {
      header: 'Vehicle',
      accessor: 'vehicle',
      render: (q) => (
        <div className="text-sm">
          {q.vehicleMake || q.vehicleModel ? (
            <>
              <div className="text-gray-900">{[q.vehicleMake, q.vehicleModel].filter(Boolean).join(' ')}</div>
              {q.vehicleRegNumber && <div className="text-xs text-gray-500 uppercase mt-0.5">{q.vehicleRegNumber}</div>}
            </>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>
      ),
    },
    {
      header: 'Total',
      accessor: 'totalAmount',
      render: (q) => (
        <span className="font-semibold text-gray-900 font-mono">
          GH₵{parseFloat(q.totalAmount).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: 'quoteDate',
      render: (q) => (
        <span className="text-sm text-gray-900">{format(new Date(q.quoteDate), 'MMM d, yyyy')}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (q) => q.convertedJobId ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          Converted → Job #{q.convertedJobId}
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          Quote
        </span>
      ),
    },
    {
      header: '',
      accessor: 'actions',
      render: (q) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => handleViewQuote(q)}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title="View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  const isLoading = activeTab === 'job' ? invoicesLoading : quotesLoading;

  if (isLoading && (activeTab === 'job' ? invoices.length === 0 : quotes.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Invoices</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage job invoices and track payments</p>
            </div>
            {/* Generate Invoice split dropdown — always visible in header */}
            <div className="relative" ref={invoiceDropdownRef}>
              <button
                onClick={() => setShowInvoiceDropdown((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-colors w-full sm:w-auto justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Generate Invoice
                <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showInvoiceDropdown && (
                <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => { setShowStandaloneModal(true); setShowInvoiceDropdown(false); }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="mt-0.5 p-1.5 bg-amber-100 rounded-lg shrink-0">
                      <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">New Invoice</p>
                      <p className="text-xs text-gray-500 mt-0.5">Create a standalone invoice</p>
                    </div>
                  </button>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => { setShowGenerateModal(true); setShowInvoiceDropdown(false); }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="mt-0.5 p-1.5 bg-blue-100 rounded-lg shrink-0">
                      <svg className="w-3.5 h-3.5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">From Job</p>
                      <p className="text-xs text-gray-500 mt-0.5">Invoice a completed job</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
          <button
            onClick={() => setActiveTab('job')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'job'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Job Invoices
          </button>
          <button
            onClick={() => setActiveTab('standalone')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'standalone'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Standalone Invoices
          </button>
        </div>

        {/* ── JOB INVOICES TAB ── */}
        {activeTab === 'job' && (
          <>
            {/* Stats Grid */}
            <div className="mb-6 sm:mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                  title="Total Invoices"
                  value={stats.total || 0}
                  subtitle={`GH₵${Number(stats.totalInvoiced || 0).toLocaleString()} invoiced`}
                  iconPath="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
                <StatCard
                  title="Unpaid"
                  value={stats.unpaid || 0}
                  subtitle="Awaiting payment"
                  iconPath="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <StatCard
                  title="Partially Paid"
                  value={stats.partial || 0}
                  subtitle="Pending balance"
                  iconPath="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <StatCard
                  title="Paid"
                  value={stats.paid || 0}
                  subtitle={`GH₵${Number(stats.totalCollected || 0).toLocaleString()} collected`}
                  iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </div>
            </div>

            {/* Filter + Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1 max-w-md w-full">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <input
                        type="text"
                        placeholder="Search by invoice #, client, or vehicle reg..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partially Paid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              {filteredInvoices.length === 0 ? (
                <div className="py-16">
                  <EmptyState
                    icon={<svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    title={searchTerm ? "No invoices found" : "No invoices yet"}
                    description={searchTerm ? "Try adjusting your search criteria" : "Generate your first invoice from a job"}
                    action={() => setShowGenerateModal(true)}
                    actionText="Generate Invoice"
                  />
                </div>
              ) : (
                <>
                  <Table columns={jobColumns} data={filteredInvoices} />
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                    <span>Showing {filteredInvoices.length} records</span>
                    <span className="font-medium">Outstanding: GH₵{Number(stats.totalOutstanding || 0).toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── STANDALONE INVOICES TAB ── */}
        {activeTab === 'standalone' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    type="text"
                    placeholder="Search by quote #, client, or vehicle..."
                    value={quoteSearch}
                    onChange={(e) => setQuoteSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {quotes.length === 0 ? (
              <div className="py-16">
                <EmptyState
                  icon={<svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                  title={quoteSearch ? "No quotes found" : "No standalone invoices yet"}
                  description={quoteSearch ? "Try a different search" : 'Click "New Invoice" above to create a standalone invoice'}
                  action={quoteSearch ? undefined : () => setShowStandaloneModal(true)}
                  actionText="New Invoice"
                />
              </div>
            ) : (
              <>
                <Table columns={quoteColumns} data={quotes} />
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                  Showing {quotes.length} record{quotes.length !== 1 ? 's' : ''}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Generate Invoice Modal (from job) */}
      <GenerateInvoiceModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSubmit={(data) => generateMutation.mutate(data)}
        isLoading={generateMutation.isPending}
      />

      {/* Job Invoice Details Modal */}
      {selectedInvoice && (
        <InvoiceDetails
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
        />
      )}

      {/* Quote / Standalone Invoice Details Modal */}
      {selectedQuote && (
        <QuoteDetails
          isOpen={showQuoteModal}
          onClose={() => {
            setShowQuoteModal(false);
            setSelectedQuote(null);
          }}
          quote={selectedQuote}
          onConverted={() => {
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
          }}
        />
      )}

      {/* New Standalone Invoice Modal — conditionally rendered to reset state on each open */}
      {showStandaloneModal && (
        <StandaloneInvoiceModal
          isOpen={showStandaloneModal}
          onClose={() => setShowStandaloneModal(false)}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, iconPath }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</span>
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} /></svg>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 tracking-tight">{value}</div>
      <div className="text-xs text-gray-400 font-medium mt-1">{subtitle}</div>
    </div>
  );
}
