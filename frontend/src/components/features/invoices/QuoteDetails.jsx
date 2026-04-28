import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { settingsApi } from '@api/settings';
import { quotesApi } from '@api/jobs';
import Modal from '@components/common/Modal';
import Invoice from '@components/features/jobs/Invoice';
import Button from '@components/common/Button';

// Map a Quote into the shape Invoice.jsx expects
function quoteToInvoiceShape(quote) {
  return {
    invoiceNumber: quote.quoteNumber,
    invoiceDate: quote.quoteDate || quote.createdAt,
    paymentStatus: quote.convertedJobId ? 'converted' : 'quote',
    materialsCost: quote.materialsCost,
    labourCost: quote.labourCost,
    miscellaneousCost: quote.miscellaneousCost,
    totalAmount: quote.totalAmount,
    amountPaid: 0,
    amountDue: quote.totalAmount,
    payments: [],
    notes: quote.notes,
    job: {
      clientName: quote.clientName,
      clientPhone: quote.clientPhone,
      clientEmail: quote.clientEmail,
      vehicleMake: quote.vehicleMake,
      vehicleModel: quote.vehicleModel,
      vehicleRegNumber: quote.vehicleRegNumber,
      jobType: quote.jobType,
      materials: (quote.items || []).map((item) => ({
        materialName: item.materialName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        isExternal: item.isExternal,
      })),
    },
  };
}

export default function QuoteDetails({ isOpen, onClose, quote, onConverted }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: settingsData } = useQuery({
    queryKey: ['business-settings'],
    queryFn: settingsApi.getBusinessSettings,
    staleTime: 10 * 60 * 1000,
  });
  const businessSettings = settingsData?.data;

  const convertMutation = useMutation({
    mutationFn: () => quotesApi.convertToJob(quote.id),
    onSuccess: (resp) => {
      toast.success('Quote converted to job successfully');
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      onClose();
      if (onConverted) onConverted(resp?.data?.jobId);
      else navigate('/jobs');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to convert quote');
    },
  });

  if (!quote) return null;

  const invoiceShape = quoteToInvoiceShape(quote);
  const isConverted = Boolean(quote.convertedJobId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Quote ${quote.quoteNumber}`}
      size="large"
    >
      {/* Convert to Job banner */}
      {!isConverted && (
        <div className="mb-4 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 print-hidden">
          <p className="text-sm text-amber-800">
            This is a standalone invoice. Convert it to a job to track work progress.
          </p>
          <Button
            type="button"
            variant="primary"
            loading={convertMutation.isPending}
            onClick={() => convertMutation.mutate()}
            className="ml-4 text-xs bg-amber-500 hover:bg-amber-600 text-white whitespace-nowrap"
          >
            Convert to Job
          </Button>
        </div>
      )}

      {isConverted && (
        <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 print-hidden">
          <span className="text-emerald-700 text-sm font-medium">Converted to Job #{quote.convertedJobId}</span>
        </div>
      )}

      <Invoice
        invoice={invoiceShape}
        businessSettings={businessSettings}
        // no onRecordPayment — quotes don't have payments
      />
    </Modal>
  );
}
