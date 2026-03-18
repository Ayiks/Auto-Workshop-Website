import prisma from '../config/database.js';
import { sendViaBusiness, getBusinessMessagingConfig } from '../utils/sendSMS.js';
import { sendReminderEmail } from '../utils/sendEmail.js';

/**
 * POST /api/messaging/bulk
 * Send SMS, WhatsApp, and/or email to a list of customers.
 *
 * Body:
 *   customerIds  {number[]}   - IDs of customers to message
 *   message      {string}     - Message body
 *   channels     {string[]}   - Array of 'sms' | 'whatsapp' | 'email'
 *   channel      {string?}    - Legacy single-channel fallback
 *   subject      {string?}    - Email subject (required when channels includes 'email')
 *   purpose      {string?}    - 'transactional' | 'marketing' (informational)
 */
export const bulkSend = async (req, res) => {
  try {
    const { customerIds, message, channels: channelsArr, channel, subject, purpose } = req.body;
    const businessId = req.user.businessId;

    // Normalise: accept either channels[] or legacy channel string
    const channelList = Array.isArray(channelsArr) && channelsArr.length
      ? channelsArr
      : (channel ? [channel] : []);

    const VALID = ['sms', 'whatsapp', 'email'];
    const invalidChannels = channelList.filter(c => !VALID.includes(c));

    if (!customerIds?.length) {
      return res.status(400).json({ success: false, message: 'customerIds is required' });
    }
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'message is required' });
    }
    if (!channelList.length) {
      return res.status(400).json({ success: false, message: 'At least one channel is required' });
    }
    if (invalidChannels.length) {
      return res.status(400).json({ success: false, message: `Invalid channels: ${invalidChannels.join(', ')}` });
    }
    if (channelList.includes('email') && !subject?.trim()) {
      return res.status(400).json({ success: false, message: 'subject is required when email is selected' });
    }

    // Fetch customers
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds.map(Number) }, businessId, isActive: true },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true },
    });

    if (!customers.length) {
      return res.status(404).json({ success: false, message: 'No matching customers found' });
    }

    // Fetch business settings once
    const businessSettings = await prisma.businessSettings.findFirst({
      where: { businessId },
      select: { name: true, email: true, arkeselSenderId: true, arkeselWhatsAppSenderId: true },
    });
    const businessName = businessSettings?.name || 'Your Workshop';
    const businessEmail = businessSettings?.email || null;

    // Fetch messaging config for SMS/WhatsApp channels
    let messagingConfig = null;
    const needsArkesel = channelList.some(c => c !== 'email');
    if (needsArkesel) {
      messagingConfig = await getBusinessMessagingConfig(businessId);
      if (!messagingConfig) {
        return res.status(400).json({
          success: false,
          message: 'SMS/WhatsApp is not configured for this business. Go to Settings → Messaging.',
        });
      }
    }

    // Send to each customer across all channels
    const results = await Promise.allSettled(
      customers.map(async (customer) => {
        const fullName = `${customer.firstName} ${customer.lastName || ''}`.trim();
        const perChannel = [];

        for (const ch of channelList) {
          if (ch === 'email') {
            if (!customer.email) {
              perChannel.push({ channel: ch, status: 'skipped', reason: 'No email address' });
              continue;
            }
            await sendReminderEmail(customer.email, { customerName: fullName, message, type: 'manual', businessName, businessEmail });
            perChannel.push({ channel: ch, status: 'sent' });
          } else {
            if (!customer.phone) {
              perChannel.push({ channel: ch, status: 'skipped', reason: 'No phone number' });
              continue;
            }
            const r = await sendViaBusiness(customer.phone, message, ch, messagingConfig);
            perChannel.push({ channel: ch, status: r.success ? 'sent' : 'failed', reason: r.error || null });
          }
        }

        // Roll-up: customer is 'sent' if any channel succeeded
        const anySent = perChannel.some(c => c.status === 'sent');
        const allSkipped = perChannel.every(c => c.status === 'skipped');
        return {
          customerId: customer.id,
          name: fullName,
          status: allSkipped ? 'skipped' : anySent ? 'sent' : 'failed',
          channels: perChannel,
          reason: allSkipped ? perChannel.map(c => c.reason).filter(Boolean).join('; ') : null,
        };
      })
    );

    const summary = results.map(r => r.status === 'fulfilled' ? r.value : { status: 'failed', reason: r.reason?.message });
    const sentCount    = summary.filter(r => r.status === 'sent').length;
    const failedCount  = summary.filter(r => r.status === 'failed').length;
    const skippedCount = summary.filter(r => r.status === 'skipped').length;

    res.json({
      success: true,
      summary: { sent: sentCount, failed: failedCount, skipped: skippedCount, total: customers.length },
      results: summary,
    });
  } catch (err) {
    console.error('bulkSend error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/messaging/single
 * Send a message to a single customer.
 *
 * Body:
 *   customerId   {number}
 *   message      {string}
 *   channels     {string[]}  - Array of 'sms' | 'whatsapp' | 'email'
 *   channel      {string?}   - Legacy fallback
 *   subject      {string?}   - Required for email
 */
export const singleSend = async (req, res) => {
  try {
    const { customerId, message, channels: channelsArr, channel, subject } = req.body;
    const businessId = req.user.businessId;

    const channelList = Array.isArray(channelsArr) && channelsArr.length
      ? channelsArr
      : (channel ? [channel] : []);

    if (!customerId) return res.status(400).json({ success: false, message: 'customerId is required' });
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'message is required' });
    if (!channelList.length) return res.status(400).json({ success: false, message: 'At least one channel is required' });

    const customer = await prisma.customer.findFirst({
      where: { id: Number(customerId), businessId, isActive: true },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true },
    });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const fullName = `${customer.firstName} ${customer.lastName || ''}`.trim();
    const bSettings = await prisma.businessSettings.findFirst({
      where: { businessId },
      select: { name: true, email: true },
    });
    const businessName = bSettings?.name || 'Your Workshop';
    const businessEmail = bSettings?.email || null;

    let messagingConfig = null;
    if (channelList.some(c => c !== 'email')) {
      messagingConfig = await getBusinessMessagingConfig(businessId);
    }

    const perChannel = [];
    for (const ch of channelList) {
      if (ch === 'email') {
        if (!customer.email) { perChannel.push({ channel: ch, status: 'skipped', reason: 'No email' }); continue; }
        await sendReminderEmail(customer.email, { customerName: fullName, message, type: 'manual', businessName, businessEmail });
        perChannel.push({ channel: ch, status: 'sent' });
      } else {
        if (!customer.phone) { perChannel.push({ channel: ch, status: 'skipped', reason: 'No phone' }); continue; }
        if (!messagingConfig) { perChannel.push({ channel: ch, status: 'failed', reason: 'Messaging not configured' }); continue; }
        const r = await sendViaBusiness(customer.phone, message, ch, messagingConfig);
        perChannel.push({ channel: ch, status: r.success ? 'sent' : 'failed', reason: r.error || null });
      }
    }

    res.json({ success: true, channels: perChannel });
  } catch (err) {
    console.error('singleSend error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
