// src/pages/Invoices.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi, jobsApi } from '@api/jobs';
import { useAuthStore } from '@stores/authStore';
import Button from '@components/common/Button';
import Card, { StatCard } from '@components/common/Card';
import Table from '@components/common/Table';
import Modal from '@components/common/Modal';
import LoadingSpinner from '@components/common/LoadingSpinner';
import EmptyState from '@components/common/EmptyState';
import GenerateInvoiceModal from '@components/features/invoices/GenerateInvoiceModal';
import InvoiceDetails from '@components/features/invoices/InvoiceDetails';
import { format } from 'date-fns';

const PAYMENT_STATUS_COLORS = {
  unpaid: 'danger',
  partial: 'warning',
  paid: 'success',
};

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Unpaid',
  partial: 'Partially Paid',
  paid: 'Paid',
};

export default function Invoices() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Fetch invoices
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', { status: statusFilter !== 'all' ? statusFilter : undefined }],
    queryFn: () => invoicesApi.getInvoices({
      paymentStatus: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: () => invoicesApi.getInvoiceStats,
  });

  const invoices = invoicesData?.data || [];
  const stats = statsData?.data || {};

  // Generate invoice mutation
  const generateMutation = useMutation({
    mutationFn: invoicesApi.generateInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['invoice-stats']);
      queryClient.invalidateQueries(['jobs']);
      setShowGenerateModal(false);
      alert('Invoice generated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to generate invoice');
    },
  });

  // Filter invoices by search term
  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
      invoice.job?.clientName.toLowerCase().includes(searchLower) ||
      (invoice.job?.vehicleRegNumber && invoice.job.vehicleRegNumber.toLowerCase().includes(searchLower))
    );
  });

  const handleViewDetails = async (invoice) => {
    try {
      const response = await invoicesApi.getInvoice(invoice.id);
      setSelectedInvoice(response.data);
      setShowDetailsModal(true);
    } catch (error) {
      alert('Failed to load invoice details');
    }
  };

  const columns = [
    {
      key: 'invoiceNumber',
      label: 'Invoice #',
      render: (invoice) => (
        <span className="font-mono font-medium text-gray-900">{invoice.invoiceNumber}</span>
      ),
    },
    {
      key: 'job',
      label: 'Job / Client',
      render: (invoice) => (
        <div>
          <div className="font-medium text-gray-900">
            Job #{invoice.jobId} - {invoice.job?.clientName}
          </div>
          <div className="text-sm text-gray-500 capitalize">
            {invoice.job?.jobType}
          </div>
        </div>
      ),
    },
    {
      key: 'vehicle',
      label: 'Vehicle',
      render: (invoice) => (
        <div className="text-sm">
          {invoice.job?.vehicleMake && invoice.job?.vehicleModel ? (
            <>
              <div className="text-gray-900">{invoice.job.vehicleMake} {invoice.job.vehicleModel}</div>
              {invoice.job?.vehicleRegNumber && (
                <div className="text-gray-500">{invoice.job.vehicleRegNumber}</div>
              )}
            </>
          ) : (
            <span className="text-gray-400">N/A</span>
          )}
        </div>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Total Amount',
      render: (invoice) => (
        <span className="font-medium text-gray-900">
          GH₵{parseFloat(invoice.totalAmount).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'amountPaid',
      label: 'Amount Paid',
      render: (invoice) => (
        <span className="text-success-600 font-medium">
          GH₵{parseFloat(invoice.amountPaid).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'amountDue',
      label: 'Amount Due',
      render: (invoice) => (
        <span className={`font-medium ${
          parseFloat(invoice.amountDue) > 0 ? 'text-danger-600' : 'text-gray-400'
        }`}>
          GH₵{parseFloat(invoice.amountDue).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'invoiceDate',
      label: 'Invoice Date',
      render: (invoice) => (
        <span className="text-sm text-gray-600">
          {format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      label: 'Status',
      render: (invoice) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${PAYMENT_STATUS_COLORS[invoice.paymentStatus]}-100 text-${PAYMENT_STATUS_COLORS[invoice.paymentStatus]}-800`}>
          {PAYMENT_STATUS_LABELS[invoice.paymentStatus]}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (invoice) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewDetails(invoice)}
          >
            View
          </Button>
          {invoice.paymentStatus !== 'paid' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                // Navigate to payments or open payment modal
                handleViewDetails(invoice);
              }}
            >
              Record Payment
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading invoices..." />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">
            Manage job invoices and track payments
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowGenerateModal(true)}>
          + Generate Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Invoices"
          value={stats.total || 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          color="primary"
        />
        <StatCard
          title="Unpaid"
          value={stats.unpaid || 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="danger"
        />
        <StatCard
          title="Partially Paid"
          value={stats.partial || 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="warning"
        />
        <StatCard
          title="Paid"
          value={stats.paid || 0}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="success"
        />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-sm text-gray-600">Total Invoiced</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            GH₵{Number(stats.totalInvoiced || 0).toLocaleString()}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Total Collected</div>
          <div className="text-2xl font-bold text-success-600 mt-1">
            GH₵{Number(stats.totalCollected || 0).toLocaleString()}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Outstanding Balance</div>
          <div className="text-2xl font-bold text-danger-600 mt-1">
            GH₵{Number(stats.totalOutstanding || 0).toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by invoice number, client name, or vehicle registration..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partially Paid</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </Card>

      {/* Invoices Table */}
      <Card>
        {filteredInvoices.length === 0 ? (
          <EmptyState
            title="No invoices found"
            description={searchTerm ? "Try adjusting your search" : "Generate your first invoice from a completed job"}
          />
        ) : (
          <Table columns={columns} data={filteredInvoices} />
        )}
      </Card>

      {/* Generate Invoice Modal */}
      <GenerateInvoiceModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSubmit={(data) => generateMutation.mutate(data)}
        isLoading={generateMutation.isPending}
      />

      {/* Invoice Details Modal */}
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
    </div>
  );
}