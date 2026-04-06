import prisma from '../config/database.js';
import { normalizePhone } from '../utils/sendSMS.js';

/**
 * POST /api/webhooks/arkesel/dlr
 *
 * Public endpoint — Arkesel's servers POST here when a carrier delivers (or fails to deliver) an SMS.
 * DLR payload format is not publicly documented; raw body is logged on every call so the exact
 * field names can be confirmed from the first real callback and hardened below.
 *
 * Common Arkesel DLR field names to try: recipient, phone, msisdn, number, status, delivery_status, dlr_status
 */
export const handleArkeselDLR = async (req, res) => {
  console.log('[DLR] Arkesel callback raw payload:', JSON.stringify(req.body));

  try {
    const rawPhone  = req.body.recipient || req.body.phone || req.body.msisdn || req.body.number;
    const rawStatus = req.body.status    || req.body.delivery_status || req.body.dlr_status;

    if (rawPhone && rawStatus) {
      const phone = normalizePhone(String(rawPhone));
      const statusLower = String(rawStatus).toLowerCase();
      const isDelivered = ['delivered', 'success', 'ok', 'delivrd'].some(s => statusLower.includes(s));

      if (isDelivered) {
        const updated = await prisma.messageRecipient.updateMany({
          where: { phone, channel: 'sms', status: 'sent' },
          data: { status: 'delivered', deliveredAt: new Date() },
        });
        console.log(`[DLR] Marked ${updated.count} recipient(s) as delivered for ${phone}`);
      } else {
        console.log(`[DLR] Non-delivery status "${rawStatus}" for ${rawPhone} — no action taken`);
      }
    } else {
      console.warn('[DLR] Could not extract phone/status from payload — check field names above');
    }
  } catch (err) {
    console.error('[DLR] Error processing callback:', err.message);
  }

  // Always 200 so Arkesel stops retrying
  res.status(200).json({ success: true });
};
