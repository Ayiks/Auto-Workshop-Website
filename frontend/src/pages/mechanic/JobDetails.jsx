import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { format } from 'date-fns';

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [labourCost, setLabourCost] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/jobs/${id}`);
      setJob(response.job);
    } catch (error) {
      console.error('Error fetching job:', error);
      alert('Failed to load job details');
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      await api.put(`/jobs/${id}`, { status: newStatus });
      fetchJob();
    } catch (error) {
      alert(error.error?.message || 'Failed to update status');
    }
  };

  const handleGenerateInvoice = async () => {
    if (!labourCost || parseFloat(labourCost) < 0) {
      alert('Please enter a valid labour cost');
      return;
    }

    try {
      setProcessing(true);
      const response = await api.post('/invoices', {
        jobId: parseInt(id),
        labourCost: parseFloat(labourCost),
        notes: invoiceNotes,
      });

      alert('Invoice generated successfully! You can now print it for the client.');
      setShowInvoiceModal(false);
      
      // Redirect to invoice and trigger print
      navigate(`/invoices/${response.invoice.id}`);
      setTimeout(() => window.print(), 500);
    } catch (error) {
      alert(error.error?.message || 'Failed to create invoice');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      invoiced: 'bg-purple-100 text-purple-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const calculateMaterialsCost = () => {
    if (!job?.materials) return 0;
    return job.materials.reduce((sum, m) => sum + parseFloat(m.subtotal), 0);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Job not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">Job #{job.id}</h1>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(job.status)}`}>
                {getStatusLabel(job.status)}
              </span>
            </div>
            <p className="text-gray-600 mt-1">
              Created {format(new Date(job.createdAt), 'MMMM dd, yyyy')}
            </p>
          </div>
          <Link to="/jobs" className="btn-secondary btn-touch">
            ← Back to Jobs
          </Link>
        </div>

        {/* Status Actions */}
        {job.status !== 'invoiced' && (
          <div className="card">
            <h3 className="font-medium mb-3">Job Actions:</h3>
            <div className="flex flex-wrap gap-2">
              {job.status === 'pending' && !job.invoice && (
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="btn-primary"
                >
                  Generate Invoice & Quote
                </button>
              )}
              {job.invoice && job.status === 'pending' && (
                <button
                  onClick={() => updateStatus('in_progress')}
                  className="btn-success"
                >
                  Start Working on Job
                </button>
              )}
              {job.status === 'in_progress' && (
                <button
                  onClick={() => updateStatus('completed')}
                  className="btn-success"
                >
                  Mark as Completed
                </button>
              )}
            </div>
          </div>
        )}

        {/* Client Information */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Client Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium">{job.clientName}</p>
            </div>
            {job.clientPhone && (
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{job.clientPhone}</p>
              </div>
            )}
            {job.clientEmail && (
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{job.clientEmail}</p>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Information */}
        {(job.carMake || job.carModel || job.carRegNumber) && (
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Vehicle Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {job.carMake && (
                <div>
                  <p className="text-sm text-gray-600">Make</p>
                  <p className="font-medium">{job.carMake}</p>
                </div>
              )}
              {job.carModel && (
                <div>
                  <p className="text-sm text-gray-600">Model</p>
                  <p className="font-medium">{job.carModel}</p>
                </div>
              )}
              {job.carRegNumber && (
                <div>
                  <p className="text-sm text-gray-600">Registration</p>
                  <p className="font-medium">{job.carRegNumber}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Problem Description */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Problem Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{job.problemDescription}</p>
        </div>

        {/* Materials/Parts */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Materials/Parts Required</h2>
          {job.materials && job.materials.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Material
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Unit Price
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Subtotal
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {job.materials.map((material) => (
                    <tr key={material.id}>
                      <td className="px-4 py-3 font-medium">{material.materialName}</td>
                      <td className="px-4 py-3">{material.quantity}</td>
                      <td className="px-4 py-3">
                        {material.estimatedCost ? `GH₵ ${parseFloat(material.estimatedCost).toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          material.isPurchased
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {material.isPurchased ? 'Purchased' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="3" className="px-4 py-3 font-bold text-right">
                      Total Materials Cost:
                    </td>
                    <td colSpan="2" className="px-4 py-3 font-bold">
                      GH₵ {calculateMaterialsCost().toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No materials specified</p>
          )}
        </div>

        {/* Invoice Info */}
        {job.invoice && (
          <div className="card bg-purple-50 border-2 border-purple-200">
            <h2 className="text-xl font-bold mb-4">Invoice</h2>
            <p className="mb-2">
              <span className="font-medium">Invoice Number:</span> {job.invoice.invoiceNumber}
            </p>
            <p className="mb-2">
              <span className="font-medium">Materials Cost:</span> GH₵ {parseFloat(job.invoice.materialsCost).toFixed(2)}
            </p>
            <p className="mb-2">
              <span className="font-medium">Workmanship:</span> GH₵ {parseFloat(job.invoice.labourCost).toFixed(2)}
            </p>
            <p className="mb-4">
              <span className="font-medium">Total Amount:</span> GH₵ {parseFloat(job.invoice.totalAmount).toFixed(2)}
            </p>
            <div className="flex space-x-2">
              <Link
                to={`/invoices/${job.invoice.id}`}
                className="btn-primary inline-block"
              >
                View Invoice
              </Link>
              <button
                onClick={() => {
                  navigate(`/invoices/${job.invoice.id}`);
                  setTimeout(() => window.print(), 500);
                }}
                className="btn-secondary"
              >
                🖨️ Print Invoice
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Generate Invoice</h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Materials Cost:</span>
                  <span className="font-bold">GH₵ {calculateMaterialsCost().toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workmanship / Labour Cost (GH₵) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={labourCost}
                  onChange={(e) => setLabourCost(e.target.value)}
                  className="input"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Enter the labour/workmanship charges</p>
              </div>

              {labourCost && (
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Materials Subtotal:</span>
                      <span className="font-medium">GH₵ {calculateMaterialsCost().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Workmanship:</span>
                      <span className="font-medium">GH₵ {parseFloat(labourCost || 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t-2 border-green-300 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-bold text-lg">Total Invoice Amount:</span>
                        <span className="font-bold text-2xl text-primary-600">
                          GH₵ {(calculateMaterialsCost() + parseFloat(labourCost || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="input"
                  rows="3"
                  placeholder="Additional notes for the invoice..."
                ></textarea>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleGenerateInvoice}
                  disabled={processing || !labourCost}
                  className="flex-1 btn-success"
                >
                  {processing ? 'Creating...' : 'Generate Invoice'}
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}