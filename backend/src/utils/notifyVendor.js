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
 * Send a purchase order / delivery notification to a vendor.
 * Fires ALL available channels independently: WhatsApp, Email, SMS.
 * Never throws — all errors are logged only.
 */
export const notifyVendor = async (vendor, { items, totalCost, businessName, orderedBy, businessId, customMessage }) => {
  if (!vendor) return;

  // Full message — used for WhatsApp and email (no length limit)
  let message;
  if (customMessage) {
    message = customMessage;
  } else {
    const itemLines = (items || [])
      .map(i => `• ${i.materialName} — ${i.quantityOrdered} ${i.unit || ''} @ GHC${parseFloat(i.unitCost).toFixed(2)}`)
      .join('\n');

    message =
      `Purchase Order from ${businessName}\n\n` +
      `Items ordered:\n${itemLines}\n\n` +
      `Total: GHC${parseFloat(totalCost).toFixed(2)}\n` +
      `Ordered by: ${orderedBy}\n\n` +
      `Please confirm receipt of this order.`;
  }

  // SMS-specific message — kept short and GSM-safe (no Unicode) to stay within 1 segment
  const smsMessage = customMessage
    ? customMessage.replace(/GH₵/g, 'GHC')
    : `You have an Order from ${businessName}, Ordered by ${orderedBy}. Please Check`;

  // ── SMS ──────────────────────────────────────────────────────────────────────
  if (vendor.phone) {
    try {
      const config = await getBusinessMessagingConfig(businessId);
      if (config) {
        await sendViaBusiness(vendor.phone, smsMessage, 'sms', config);
      }
    } catch (err) {
      console.error('[notifyVendor] SMS failed:', err.message);
    }
  }

  // ── WhatsApp ─────────────────────────────────────────────────────────────────
  if (vendor.whatsappNumber) {
    try {
      const config = await getBusinessMessagingConfig(businessId);
      if (config?.whatsappStatus === 'active') {
        await sendViaBusiness(vendor.whatsappNumber, message, 'whatsapp', config);
      }
    } catch (err) {
      console.error('[notifyVendor] WhatsApp failed:', err.message);
    }
  }

  // ── Email ────────────────────────────────────────────────────────────────────
  if (vendor.email) {
    try {
      const transporter = createTransporter();
      const htmlItems = (items || [])
        .map(i => `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${i.materialName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${i.quantityOrdered} ${i.unit || ''}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">GH₵${parseFloat(i.unitCost).toFixed(2)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">GH₵${parseFloat(i.totalItemCost || parseFloat(i.unitCost) * parseFloat(i.quantityOrdered)).toFixed(2)}</td>
        </tr>`)
        .join('');

      const subject = customMessage
        ? `Delivery Update from ${businessName}`
        : `Purchase Order from ${businessName}`;

      const htmlBody = customMessage
        ? `<p style="font-size:15px;color:#374151;">${customMessage}</p>`
        : `
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
                <td style="padding:10px 12px;font-weight:bold;">GH₵${parseFloat(totalCost || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          <p style="font-size:13px;color:#6b7280;">Ordered by: ${orderedBy}</p>
          <p>Please confirm receipt of this order.</p>
        `;

      await transporter.sendMail({
        from: `"${businessName || 'The Workshop'}" <${process.env.EMAIL_USER}>`,
        to: vendor.email,
        subject,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
            <div style="background:#111827;padding:20px 28px;border-radius:8px 8px 0 0;">
              <h2 style="color:#fff;margin:0;font-size:18px;">${subject}</h2>
            </div>
            <div style="padding:24px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
              <p>Dear ${vendor.contactName || vendor.companyName},</p>
              ${htmlBody}
            </div>
          </div>
        `,
      });
    } catch (err) {
      console.error('[notifyVendor] Email failed:', err.message);
    }
  }
};
