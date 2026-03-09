import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@api/jobs';
import { useAuthStore } from '@stores/authStore';
import { useResponsive } from '@hooks/useResponsive';
import { RESPONSIVE_SPACING } from '@utils/responsiveHelpers';
import Button from '@components/common/Button';
import Card from '@components/common/Card';
import Table from '@components/common/Table';
import Modal from '@components/common/Modal';
import LoadingSpinner from '@components/common/LoadingSpinner';
import EmptyState from '@components/common/EmptyState';
import JobForm from '@components/features/jobs/JobForm';
import JobDetailsWithInvoice from '@components/features/jobs/JobDetailsWithInvoice';

// We keep colors ONLY for status/invoice states (Trends/Data)
const STATUS_STYLES = {
  pending:     'bg-amber-50 text-amber-700 border border-amber-200',
  active:      'bg-blue-50 text-blue-700 border border-blue-200',
  in_progress: 'bg-blue-50 text-blue-700 border border-blue-200',
  completed:   'bg-green-50 text-green-700 border border-green-200',
  invoiced:    'bg-purple-50 text-purple-700 border border-purple-200',
  cancelled:   'bg-gray-100 text-gray-500 border border-gray-200',
};

const STATUS_LABELS = {
  pending:     'Pending',
  active:      'Active',
  in_progress: 'In Progress',
  completed:   'Completed',
  invoiced:    'Invoiced',
  cancelled:   'Cancelled',
};

const INVOICE_STYLES = {
  unpaid: 'bg-red-50 text-red-700 border border-red-200',
  partial: 'bg-orange-50 text-orange-700 border border-orange-200',
  paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const INVOICE_LABELS = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
};

export default function Jobs() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { isMobile } = useResponsive();

  const [statusFilter, setStatusFilter] = useState('all');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const userJobType = 
    user?.role === 'mechanic' ? 'mechanic' :
    user?.role === 'sprayer' ? 'sprayer' :
    user?.role === 'bodyworks' ? 'bodyworks' :
    null;

  // --- Queries & Mutations (Same logic as before) ---
  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs', { status: statusFilter !== 'all' ? statusFilter : undefined, jobType: userJobType }],
    queryFn: () => jobsApi.getJobs({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      jobType: userJobType,
    }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['jobs-stats'],
    queryFn: () => jobsApi.getJobStats(),
  });

  const jobs = jobsData?.data || [];
  const stats = statsData?.data || {};

  const statusCounts = {};
  if (stats.jobsByStatus && Array.isArray(stats.jobsByStatus)) {
    stats.jobsByStatus.forEach(item => {
      statusCounts[item.status] = item._count;
    });
  }

  // Mutations
  const createMutation = useMutation({
    mutationFn: jobsApi.createJob,
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['jobs-stats']);
      setShowCreateModal(false);
      alert('Job created successfully!');
    },
    onError: (e) => alert(e.response?.data?.error || 'Failed to create job'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => jobsApi.updateJob(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      setShowEditModal(false);
      setSelectedJob(null);
      alert('Job updated successfully!');
    },
    onError: (e) => alert(e.response?.data?.error || 'Failed to update job'),
  });

  const deleteMutation = useMutation({
    mutationFn: jobsApi.deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['jobs-stats']);
      setShowDetailsModal(false);
      setSelectedJob(null);
      alert('Job deleted successfully!');
    },
    onError: (e) => alert(e.response?.data?.error || 'Failed to delete job'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => jobsApi.updateJobStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['jobs-stats']);
    },
    onError: (e) => alert(e.response?.data?.error || 'Failed to update status'),
  });

  const completeMutation = useMutation({
    mutationFn: jobsApi.completeJob,
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['jobs-stats']);
    },
    onError: (e) => alert(e.response?.data?.error || 'Failed to complete job'),
  });

  // Filters
  const filteredJobs = jobs.filter((job) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      job.clientName.toLowerCase().includes(searchLower) ||
      job.problemType.toLowerCase().includes(searchLower) ||
      (job.vehicleRegNumber && job.vehicleRegNumber.toLowerCase().includes(searchLower))
    );

    let matchesInvoice = true;
    if (invoiceFilter === 'not_invoiced') matchesInvoice = !job.invoice;
    else if (invoiceFilter === 'invoiced') matchesInvoice = !!job.invoice;
    else if (['unpaid', 'partial', 'paid'].includes(invoiceFilter)) matchesInvoice = job.invoice && job.invoice.paymentStatus === invoiceFilter;

    let matchesDate = true;
    if (dateFrom || dateTo) {
      const jobDate = new Date(job.createdAt);
      if (dateFrom && jobDate < new Date(dateFrom)) matchesDate = false;
      if (dateTo && jobDate > new Date(dateTo + 'T23:59:59')) matchesDate = false;
    }

    return matchesSearch && matchesInvoice && matchesDate;
  });

  // Handlers
  const handleViewDetails = async (job) => {
    try {
      const response = await jobsApi.getJob(job.id);
      setSelectedJob(response.data);
      setShowDetailsModal(true);
    } catch (error) {
      alert('Failed to load job details');
    }
  };

  const handleEdit = (job) => {
    setSelectedJob(job);
    setShowDetailsModal(false);
    setShowEditModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this job?')) deleteMutation.mutate(id);
  };

  const handleUpdateStatus = (id, status) => updateStatusMutation.mutate({ id, status });
  const handleComplete = (id) => {
    if (window.confirm('Complete this job?')) completeMutation.mutate(id);
  };

  // --- Table Columns ---
  const columns = [
    {
      header: 'Job ID',
      accessor: 'id',
      render: (row) => <span className="font-mono text-xs text-gray-500">#{String(row.id).substring(0, 6)}</span>,
    },
    {
      header: 'Client',
      accessor: 'client',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.clientName}</p>
          {row.clientPhone && <p className="text-xs text-gray-500">{row.clientPhone}</p>}
        </div>
      ),
    },
    {
      header: 'Vehicle',
      accessor: 'vehicle',
      render: (row) => (
        <div>
          <p className="text-sm text-gray-900 font-medium">
            {row.vehicleMake} {row.vehicleModel}
          </p>
          <p className="text-xs text-gray-500 uppercase">{row.vehicleRegNumber || '-'}</p>
        </div>
      ),
    },
    {
      header: 'Problem',
      accessor: 'problem',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
          {row.problemType.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Cost',
      accessor: 'totalCost',
      render: (row) => (
        <span className="font-semibold text-gray-900">GH₵{parseFloat(row.totalCost).toFixed(2)}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[row.status] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
          {STATUS_LABELS[row.status] || row.status}
        </span>
      ),
    },
    {
      header: 'Invoice',
      accessor: 'invoice',
      render: (row) => {
        if (!row.invoice) return <span className="text-xs text-gray-400">N/A</span>;
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${INVOICE_STYLES[row.invoice.paymentStatus]}`}>
            {INVOICE_LABELS[row.invoice.paymentStatus]}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex justify-end items-center gap-3">
          {row.status === 'pending' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(row.id, 'in_progress'); }}
              className="text-xs font-medium text-gray-600 hover:text-black hover:underline transition-colors"
            >
              Start
            </button>
          )}
          
          {row.status === 'in_progress' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleComplete(row.id); }}
              className="text-xs font-medium text-gray-600 hover:text-black hover:underline transition-colors"
            >
              Complete
            </button>
          )}

          <button
            onClick={() => handleViewDetails(row)}
            className="p-1 text-gray-400 hover:text-black transition-colors"
            title="View Details"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  // --- Strict Monochrome Stat Card ---
  const StatCard = ({ label, value, icon }) => (
    <div className="bg-white p-4 sm:p-5 md:p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 hover:border-gray-300 transition-colors">
      <div>
        <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase">{label}</p>
        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mt-1">{value || 0}</p>
      </div>
      <div className="p-2 sm:p-3 rounded-md bg-gray-50 border border-gray-100 flex-shrink-0">
        <div className="w-4 sm:w-5 h-4 sm:h-5 text-gray-900">{icon}</div>
      </div>
    </div>
  );

  if (isLoading) return <LoadingSpinner fullScreen text="Loading jobs..." />;

  return (
    <div className="min-h-screen bg-white pb-8">
      
      {/* Header - Simple Black/White */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className={`max-w-7xl mx-auto ${RESPONSIVE_SPACING.container}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 py-4 sm:py-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Jobs</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {userJobType 
                  ? `${userJobType.charAt(0).toUpperCase() + userJobType.slice(1)} Department` 
                  : 'Overview of all workshop jobs'}
              </p>
            </div>
            
            {/* Primary Button - Strict Black */}
            <Button 
              onClick={() => setShowCreateModal(true)} 
              className="bg-gray-900 hover:bg-black text-white shadow-none border-transparent rounded-lg w-full sm:w-auto"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              New Job
            </Button>
          </div>
        </div>
      </div>

      <div className={`max-w-7xl mx-auto ${RESPONSIVE_SPACING.section} space-y-8`}>
        
        {/* Statistics Grid - Monochrome Icons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          <StatCard 
            label="Total Jobs" 
            value={stats.totalJobs} 
            icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
          />
          <StatCard 
            label="Pending" 
            value={statusCounts.pending} 
            icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard 
            label="In Progress" 
            value={statusCounts.in_progress} 
            icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          <StatCard 
            label="Completed" 
            value={statusCounts.invoiced} 
            icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>

        {/* Filters & Content Area */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 sm:p-5 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white transition-all"
                />
              </div>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white cursor-pointer"
                />
                <span className="text-gray-400 text-xs">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white cursor-pointer"
                />
                {(dateFrom || dateTo) && (
                  <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-1">
                    ✕
                  </button>
                )}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  value={invoiceFilter}
                  onChange={(e) => setInvoiceFilter(e.target.value)}
                  className="px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 bg-gray-50 focus:bg-white cursor-pointer"
                >
                  <option value="all">All Invoices</option>
                  <option value="not_invoiced">No Invoice</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Area */}
          {filteredJobs.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No jobs found"
                description={searchTerm ? "Try adjusting your search." : "Create a job to get started."}
                action={!searchTerm && (() => setShowCreateModal(true))}
                actionText="Create Job"
              />
            </div>
          ) : (
            <>
              <Table columns={columns} data={filteredJobs} />
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <span>Showing {filteredJobs.length} of {jobs.length} jobs</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals - Passed Logic (No style changes needed inside modals if components handle it) */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Job"
        size="lg"
      >
        <div className="p-1">
          <JobForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowCreateModal(false)}
            isLoading={createMutation.isPending}
          />
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedJob(null); }}
        title="Edit Job"
        size="lg"
      >
        <div className="p-1">
          <JobForm
            job={selectedJob}
            onSubmit={(data) => updateMutation.mutate({ id: selectedJob.id, data })}
            onCancel={() => { setShowEditModal(false); setSelectedJob(null); }}
            isLoading={updateMutation.isPending}
          />
        </div>
      </Modal>

      {selectedJob && (
        <JobDetailsWithInvoice
          isOpen={showDetailsModal}
          onClose={() => { setShowDetailsModal(false); setSelectedJob(null); }}
          job={selectedJob}
          onEdit={() => handleEdit(selectedJob)}
          onDelete={() => handleDelete(selectedJob.id)}
          onUpdateStatus={handleUpdateStatus}
          onComplete={handleComplete}
          onRefresh={async () => {
            const response = await jobsApi.getJob(selectedJob.id);
            setSelectedJob(response.data);
          }}
        />
      )}
    </div>
  );
}