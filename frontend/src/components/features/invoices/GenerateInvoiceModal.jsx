// src/components/features/invoices/GenerateInvoiceModal.jsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@api/jobs';
import Modal from '@components/common/Modal';
import Button from '@components/common/Button';
import Select from '@components/common/Select';
import { Textarea } from '@components/common/Input';
import LoadingSpinner from '@components/common/LoadingSpinner';

export default function GenerateInvoiceModal({ isOpen, onClose, onSubmit, isLoading }) {
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  // Fetch completed jobs (not yet invoiced)
  const { data: jobsData, isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs', { status: 'completed' }],
    queryFn: () => jobsApi.getJobs({ status: 'completed' }),
    enabled: isOpen,
  });

  const completedJobs = jobsData?.data || [];

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedJobId('');
      setSelectedJob(null);
      setNotes('');
      setErrors({});
    }
  }, [isOpen]);

  // Fetch job details when selected
  useEffect(() => {
    const fetchJobDetails = async () => {
      if (selectedJobId) {
        try {
          const response = await jobsApi.getJob(selectedJobId);
          setSelectedJob(response.data);
        } catch (error) {
          console.error('Error fetching job details:', error);
        }
      } else {
        setSelectedJob(null);
      }
    };

    fetchJobDetails();
  }, [selectedJobId]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!selectedJobId) {
      newErrors.jobId = 'Please select a job';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      jobId: parseInt(selectedJobId),
      notes: notes.trim() || undefined,
    });
  };

  const materialsCost = selectedJob?.materials?.reduce((sum, m) => sum + parseFloat(m.subtotal), 0) || 0;
  const labourCost = parseFloat(selectedJob?.labourCost || 0);
  const totalAmount = materialsCost + labourCost;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Invoice"
      size="large"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Job Selection */}
        <div>
          <Select
            label="Select Completed Job"
            value={selectedJobId}
            onChange={(e) => {
              setSelectedJobId(e.target.value);
              if (errors.jobId) setErrors({ ...errors, jobId: null });
            }}
            options={completedJobs.map((job) => ({
              value: job.id,
              label: `Job #${job.id} - ${job.clientName} (${job.jobType})`,
            }))}
            placeholder="-- Select a job --"
            required
            disabled={isLoading || loadingJobs}
            error={errors.jobId}
          />

          {loadingJobs && (
            <div className="mt-1.5 sm:mt-2">
              <LoadingSpinner size="sm" text="Loading completed jobs..." />
            </div>
          )}

          {!loadingJobs && completedJobs.length === 0 && (
            <div className="mt-1.5 sm:mt-2 p-2.5 sm:p-3 bg-warning-50 border border-warning-200 rounded-lg">
              <p className="text-xs sm:text-sm text-warning-700">
                No completed jobs available for invoicing. Complete a job first.
              </p>
            </div>
          )}
        </div>

        {/* Job Details Preview */}
        {selectedJob && (
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">Job Details</h3>

            {/* Client Info */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-gray-600">Client:</span>
                <p className="font-medium text-gray-900">{selectedJob.clientName}</p>
              </div>
              <div>
                <span className="text-gray-600">Phone:</span>
                <p className="font-medium text-gray-900">{selectedJob.clientPhone || 'N/A'}</p>
              </div>
            </div>

            {/* Vehicle Info */}
            {(selectedJob.vehicleMake || selectedJob.vehicleModel) && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-600">Vehicle:</span>
                  <p className="font-medium text-gray-900">
                    {selectedJob.vehicleMake} {selectedJob.vehicleModel}
                  </p>
                </div>
                {selectedJob.vehicleRegNumber && (
                  <div>
                    <span className="text-gray-600">Registration:</span>
                    <p className="font-medium text-gray-900">{selectedJob.vehicleRegNumber}</p>
                  </div>
                )}
              </div>
            )}

            {/* Problem */}
            <div className="text-xs sm:text-sm">
              <span className="text-gray-600">Problem:</span>
              <p className="font-medium text-gray-900 capitalize">{selectedJob.problemType.replace('_', ' ')}</p>
            </div>

            {/* Materials */}
            {selectedJob.materials && selectedJob.materials.length > 0 && (
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">Materials</h4>
                <div className="space-y-0.5 sm:space-y-1">
                  {selectedJob.materials.map((material, index) => (
                    <div key={index} className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-700">
                        {material.materialName} x {material.quantity}
                        {material.isExternal && (
                          <span className="ml-2 text-[10px] sm:text-xs text-warning-600">(External)</span>
                        )}
                      </span>
                      <span className="font-medium text-gray-900">
                        GH₵{parseFloat(material.subtotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cost Breakdown */}
            <div className="border-t pt-2 sm:pt-3 space-y-1.5 sm:space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Materials Cost:</span>
                <span className="font-medium text-gray-900">GH₵{materialsCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Labour Cost:</span>
                <span className="font-medium text-gray-900">GH₵{labourCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base sm:text-lg font-bold border-t pt-1.5 sm:pt-2">
                <span className="text-gray-900">Total Invoice Amount:</span>
                <span className="text-primary-700">GH₵{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Inventory Warning */}
            {selectedJob.materials?.some(m => !m.isExternal) && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-2.5 sm:p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-4 sm:w-5 h-4 sm:h-5 text-primary-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-xs sm:text-sm">
                    <p className="font-medium text-primary-900">Inventory Deduction</p>
                    <p className="text-primary-700 mt-0.5 sm:mt-1">
                      Generating this invoice will automatically deduct materials from inventory.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <Textarea
          label="Notes (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional notes for this invoice..."
          rows={3}
          disabled={isLoading}
        />

        {/* Actions */}
        <div className="flex justify-end gap-2 sm:gap-3 border-t pt-3 sm:pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            disabled={!selectedJobId || loadingJobs}
          >
            Generate Invoice
          </Button>
        </div>
      </form>
    </Modal>
  );
}