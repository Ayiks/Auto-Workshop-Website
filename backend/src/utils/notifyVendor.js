import { getBusinessMessagingConfig, sendViaBusiness } from './sendSMS.js';
import nodemailer from 'nodemailer';

const createTransporter = () =>
  nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

/**
 * Send a purchase order notification to a vendor.
 * Tries channels in priority order: WhatsApp → Email → SMS.
 * Never throws — all errors are logged only.
 *
 * @param {object} vendor  - Vendor record from DB
 * @param {object} details - { items, totalCost, businessName, orderedBy, businessId }
 */
export const notifyVendor = async (vendor, { items, totalCost, businessName, orderedBy, businessId }) => {
  if (!vendor) return;

  const itemLines = items
    .map(i => `• ${i.materialName} — ${i.quantityOrdered} ${i.unit || ''} @ GH₵${parseFloat(i.unitCost).toFixed(2)}`)
    .join('\n');

  const message =
    `Purchase Order from ${businessName}\n\n` +
    `Items ordered:\n${itemLines}\n\n` +
    `Total: GH₵${parseFloat(totalCost).toFixed(2)}\n` +
    `Ordered by: ${orderedBy}\n\n` +
    `Please confirm receipt of this order.`;

  // Try WhatsApp first
  if (vendor.whatsappNumber) {
    try {
      const config = await getBusinessMessagingConfig(businessId);
      if (config?.whatsappStatus === 'active') {
        const result = await sendViaBusiness(vendor.whatsappNumber, message, 'whatsapp', config);
        if (result.success) return;
      }
    } catch (err) {
      console.error('[notifyVendor] WhatsApp failed:', err.message);
    }
  }

  // Try Email
  if (vendor.email) {
    try {
      const transporter = createTransporter();
      const htmlItems = items
        .map(i => `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${i.materialName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${i.quantityOrdered} ${i.unit || ''}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">GH₵${parseFloat(i.unitCost).toFixed(2)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">GH₵${parseFloat(i.totalItemCost || parseFloat(i.unitCost) * parseFloat(i.quantityOrdered)).toFixed(2)}</td>
        </tr>`)
        .join('');

      await transporter.sendMail({
        from: `"${businessName}" <${process.env.EMAIL_USER}>`,
        to: vendor.email,
        subject: `Purchase Order from ${businessName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
            <div style="background:#111827;padding:20px 28px;border-radius:8px 8px 0 0;">
              <h2 style="color:#fff;margin:0;font-size:18px;">Purchase Order — ${businessName}</h2>
            </div>
            <div style="padding:24px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
              <p>Dear ${vendor.contactName || vendor.companyName},</p>
              <p>Please find below the details of a new purchase order.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <thead>
                  <tr style="background:#f9fafb;font-size:13px;color:#6b7280;">
                    <th style="padding:8px 12px;text-align:left;">Item</th>
                    <th style="padding:8px 12px;text-align:left;">Qty</th>
                    <th style="padding:8px 12px;text-align:left;">Unit Cost</th>
                    <th style="padding:8px 12px;text-align:left;">Total</th>
                  </tr>
                </thead>
                <tbody>${htmlItems}</tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding:10px 12px;font-weight:bold;">Total</td>
                    <td style="padding:10px 12px;font-weight:bold;">GH₵${parseFloat(totalCost).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
              <p style="font-size:13px;color:#6b7280;">Ordered by: ${orderedBy}</p>
              <p>Please confirm receipt of this order.</p>
            </div>
          </div>
        `,
      });
      return;
    } catch (err) {
      console.error('[notifyVendor] Email failed:', err.message);
    }
  }

  // Try SMS last
  if (vendor.phone) {
    try {
      const config = await getBusinessMessagingConfig(businessId);
      if (config) {
        // Truncate SMS to fit limits
        const smsText = `PO from ${businessName}: ${items.length} item(s), Total GH₵${parseFloat(totalCost).toFixed(2)}. Ordered by ${orderedBy}. Please confirm.`;
        await sendViaBusiness(vendor.phone, smsText, 'sms', config);
      }
    } catch (err) {
      console.error('[notifyVendor] SMS failed:', err.message);
    }
  }
};
