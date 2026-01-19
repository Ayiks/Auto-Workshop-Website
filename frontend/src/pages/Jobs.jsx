import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@api/jobs';
import { useAuthStore } from '@stores/authStore';
import Button from '@components/common/Button';
import Card from '@components/common/Card';
import Table from '@components/common/Table';
import Modal from '@components/common/Modal';
import LoadingSpinner from '@components/common/LoadingSpinner';
import EmptyState from '@components/common/EmptyState';
import JobForm from '@components/features/jobs/JobForm';
import JobDetailsWithInvoice from '@components/features/jobs/JobDetailsWithInvoice';

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
};

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const INVOICE_STATUS_COLORS = {
  unpaid: 'bg-red-50 text-red-700',
  partial: 'bg-amber-50 text-amber-700',
  paid: 'bg-green-50 text-green-700',
};

const INVOICE_STATUS_LABELS = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
};

export default function Jobs() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [statusFilter, setStatusFilter] = useState('all');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // Determine user's job type based on role
  const userJobType = 
    user?.role === 'mechanic' ? 'mechanic' :
    user?.role === 'sprayer' ? 'sprayer' :
    user?.role === 'bodyworks' ? 'bodyworks' :
    null;

  // Fetch jobs
  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs', { 
      status: statusFilter !== 'all' ? statusFilter : undefined, 
      jobType: userJobType 
    }],
    queryFn: () => jobsApi.getJobs({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      jobType: userJobType,
    }),
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['jobs-stats'],
    queryFn: () => jobsApi.getJobStats(),
  });

  const jobs = jobsData?.data || [];
  const stats = statsData?.data || {};

  // Parse jobsByStatus to get individual status counts
  const statusCounts = {};
  if (stats.jobsByStatus && Array.isArray(stats.jobsByStatus)) {
    stats.jobsByStatus.forEach(item => {
      statusCounts[item.status] = item._count;
    });
  }

  // Create job mutation
  const createMutation = useMutation({
    mutationFn: jobsApi.createJob,
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['jobs-stats']);
      setShowCreateModal(false);
      alert('Job created successfully! Please generate an invoice before starting work.');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to create job');
    },
  });

  // Update job mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => jobsApi.updateJob(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      setShowEditModal(false);
      setSelectedJob(null);
      alert('Job updated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to update job');
    },
  });

  // Delete job mutation
  const deleteMutation = useMutation({
    mutationFn: jobsApi.deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['jobs-stats']);
      setShowDetailsModal(false);
      setSelectedJob(null);
      alert('Job deleted successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to delete job');
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => jobsApi.updateJobStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['jobs-stats']);
      alert('Job status updated successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to update status');
    },
  });

  // Complete job mutation
  const completeMutation = useMutation({
    mutationFn: jobsApi.completeJob,
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['jobs-stats']);
      alert('Job completed successfully!');
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Failed to complete job');
    },
  });

  // Filter jobs by search term and invoice status
  const filteredJobs = jobs.filter((job) => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      job.clientName.toLowerCase().includes(searchLower) ||
      job.problemType.toLowerCase().includes(searchLower) ||
      (job.vehicleRegNumber && job.vehicleRegNumber.toLowerCase().includes(searchLower))
    );

    // Invoice filter
    let matchesInvoice = true;
    if (invoiceFilter === 'not_invoiced') {
      matchesInvoice = !job.invoice;
    } else if (invoiceFilter === 'invoiced') {
      matchesInvoice = !!job.invoice;
    } else if (invoiceFilter === 'unpaid' || invoiceFilter === 'partial' || invoiceFilter === 'paid') {
      matchesInvoice = job.invoice && job.invoice.paymentStatus === invoiceFilter;
    }

    return matchesSearch && matchesInvoice;
  });

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
    if (window.confirm('Are you sure you want to delete this job?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdateStatus = (id, status) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleComplete = (id) => {
    if (window.confirm('Mark this job as completed?')) {
      completeMutation.mutate(id);
    }
  };

  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      render: (row) => (
        <span className="font-mono text-sm text-gray-900">#{row.id}</span>
      ),
    },
    {
      header: 'Client',
      accessor: 'client',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.clientName}</p>
          {row.clientPhone && (
            <p className="text-xs text-gray-500 mt-0.5">{row.clientPhone}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Vehicle',
      accessor: 'vehicle',
      render: (row) => (
        <div className="text-sm">
          {row.vehicleMake && row.vehicleModel ? (
            <>
              <p className="text-gray-900">{row.vehicleMake} {row.vehicleModel}</p>
              {row.vehicleRegNumber && (
                <p className="text-xs text-gray-500">{row.vehicleRegNumber}</p>
              )}
            </>
          ) : (
            <span className="text-gray-400">N/A</span>
          )}
        </div>
      ),
    },
    {
      header: 'Problem',
      accessor: 'problem',
      render: (row) => (
        <div className="text-sm">
          <p className="text-gray-900">{row.problemType.replace('_', ' ')}</p>
        </div>
      ),
    },
    {
      header: 'Cost',
      accessor: 'totalCost',
      render: (row) => (
        <span className="font-semibold text-gray-900">
          GH₵{parseFloat(row.totalCost).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Job Status',
      accessor: 'status',
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[row.status] || 'bg-gray-100 text-gray-700'}`}>
          {STATUS_LABELS[row.status]}
        </span>
      ),
    },
    {
      header: 'Invoice',
      accessor: 'invoice',
      render: (row) => {
        if (!row.invoice) {
          return (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              Not Invoiced
            </span>
          );
        }
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${INVOICE_STATUS_COLORS[row.invoice.paymentStatus]}`}>
            {INVOICE_STATUS_LABELS[row.invoice.paymentStatus]}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewDetails(row)}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View
          </button>
          
          {/* Start button */}
          {row.status === 'pending' && row.invoice && (
            <button
              onClick={() => handleUpdateStatus(row.id, 'in_progress')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start
            </button>
          )}
          
          {/* Complete button */}
          {row.status === 'in_progress' && (
            <button
              onClick={() => handleComplete(row.id)}
              className="text-sm text-green-600 hover:text-green-800 font-medium flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
              Complete
            </button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Loading jobs..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Jobs Management</h1>
              <p className="text-sm text-gray-500 mt-1">
                {userJobType ? `${userJobType.charAt(0).toUpperCase() + userJobType.slice(1)} Jobs` : 'All Jobs'}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
              className="shadow-sm hover:shadow transition-shadow"
            >
              Create Job
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Will be blurred when modal is open */}
      <div className={`p-6 transition-all duration-300 ${
        showCreateModal || showDetailsModal || showEditModal ? 'blur-sm saturate-50' : ''
      }`}>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Jobs */}
          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-lg mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">{stats.totalJobs || 0}</p>
              </div>
            </div>
          </Card>

          {/* Pending Jobs */}
          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center">
              <div className="p-3 bg-amber-50 rounded-lg mr-4">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">{statusCounts.pending || 0}</p>
              </div>
            </div>
          </Card>

          {/* In Progress */}
          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-lg mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">{statusCounts.in_progress || 0}</p>
              </div>
            </div>
          </Card>

          {/* Completed */}
          <Card className="bg-white border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-lg mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-gray-900 mt-0.5">{statusCounts.completed || statusCounts.invoiced || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters & Content */}
        <Card className="mb-6">
          <div className="p-5">
            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search clients, vehicles, or problems..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-full"
                  />
                  <svg className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>

                {/* Invoice Filter */}
                <select
                  value={invoiceFilter}
                  onChange={(e) => setInvoiceFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Invoices</option>
                  <option value="not_invoiced">Not Invoiced</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            {/* Jobs Table */}
            {filteredJobs.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
                title="No jobs found"
                description={searchTerm ? "Try adjusting your search" : "Create your first job to get started"}
                action={() => setShowCreateModal(true)}
                actionText="Create First Job"
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <Table columns={columns} data={filteredJobs} />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Create Job Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Job"
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

      {/* Edit Job Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedJob(null);
        }}
        title="Edit Job"
        size="lg"
      >
        <div className="p-1">
          <JobForm
            job={selectedJob}
            onSubmit={(data) => updateMutation.mutate({ id: selectedJob.id, data })}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedJob(null);
            }}
            isLoading={updateMutation.isPending}
          />
        </div>
      </Modal>

      {/* Job Details Modal */}
      {selectedJob && (
        <JobDetailsWithInvoice
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedJob(null);
          }}
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