// src/components/features/invoices/InvoiceDetails.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@api/settings';
import Modal from '@components/common/Modal';
import RecordPaymentModal from '@components/features/invoices/RecordPaymentModal';
import Invoice from '@components/features/jobs/Invoice';

export default function InvoiceDetails({ isOpen, onClose, invoice }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: settingsData } = useQuery({
    queryKey: ['business-settings'],
    queryFn: settingsApi.getBusinessSettings,
    staleTime: 10 * 60 * 1000,
  });
  const businessSettings = settingsData?.data;

  if (!invoice) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Invoice ${invoice.invoiceNumber}`}
        size="large"
      >
        <Invoice
          invoice={invoice}
          onRecordPayment={() => setShowPaymentModal(true)}
          businessSettings={businessSettings}
        />
      </Modal>

      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={invoice}
      />
    </>
  );
}
