import prisma from '../config/database.js';

/**
 * Fetch the messaging config for a business.
 * The Arkesel API key is now platform-level (ARKESEL_API_KEY env var).
 * Each business provides their SMS sender name and WhatsApp Business number.
 */
export const getBusinessMessagingConfig = async (businessId) => {
  const apiKey = process.env.ARKESEL_API_KEY;
  if (!apiKey) return null; // Platform key not configured

  const settings = await prisma.businessSettings.findFirst({
    where: { businessId },
    select: {
      smsEnabled: true,
      arkeselSenderId: true,
      arkeselWhatsAppSenderId: true,
      whatsappStatus: true,
    },
  });

  if (!settings) return null;

  return {
    apiKey,
    smsEnabled: settings.smsEnabled,
    arkeselSenderId: settings.arkeselSenderId,
    arkeselWhatsAppSenderId: settings.arkeselWhatsAppSenderId,
    whatsappStatus: settings.whatsappStatus,
  };
};

/**
 * Send an SMS via Arkesel API v2 (POST-based).
 * https://developers.arkesel.com/#tag/SMS-V2
 *
 * The `sender` field is the Sender ID that appears on the recipient's phone.
 * It must be registered/approved by Arkesel and is max 11 characters.
 */
export const sendArkeselSMS = async (phone, message, apiKey, senderId) => {
  try {
    const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderId,
        message,
        recipients: [normalizePhone(phone)],
      }),
    });

    const data = await response.json();

    if (response.ok && (data.status === 'success' || data.code === 'ok')) {
      return { success: true, data };
    }
    console.error('[sendArkeselSMS] Failed:', data);
    return { success: false, error: data.message || JSON.stringify(data) };
  } catch (err) {
    console.error('[sendArkeselSMS] Error:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send a WhatsApp message via Arkesel API v2.
 * The WhatsApp Business number must be registered and active on Arkesel.
 */
export const sendArkeselWhatsApp = async (phone, message, apiKey, senderId) => {
  try {
    const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: senderId,
        message,
        recipients: [normalizePhone(phone)],
        type: 'whatsapp',
      }),
    });

    const data = await response.json();

    if (response.ok && (data.status === 'success' || data.code === 'ok')) {
      return { success: true, data };
    }
    return { success: false, error: data.message || JSON.stringify(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Normalize a phone number to international format (+233 for Ghana).
 */
export const normalizePhone = (phone) => {
  if (!phone) return phone;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('233')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+233${cleaned.slice(1)}`;
  return cleaned;
};

/**
 * High-level helper: send via a given channel using the business config.
 * Returns { success, error } — never throws.
 */
export const sendViaBusiness = async (phone, message, channel, config) => {
  if (!config?.apiKey) {
    console.error('[sendViaBusiness] Arkesel API key missing — set ARKESEL_API_KEY in .env');
    return { success: false, error: 'Arkesel platform key not configured (ARKESEL_API_KEY env var missing)' };
  }

  if (channel === 'whatsapp') {
    if (!config.arkeselWhatsAppSenderId) {
      console.error('[sendViaBusiness] WhatsApp sender not configured for this business');
      return { success: false, error: 'WhatsApp Business number not configured for this business' };
    }
    if (config.whatsappStatus !== 'active') {
      console.error('[sendViaBusiness] WhatsApp not yet active — status:', config.whatsappStatus);
      return { success: false, error: 'WhatsApp number is not yet active. Complete activation in Settings → Messaging.' };
    }
    return sendArkeselWhatsApp(phone, message, config.apiKey, config.arkeselWhatsAppSenderId);
  }

  // SMS-only guard — WhatsApp is not affected by this toggle
  if (!config.smsEnabled) {
    return { success: false, error: 'SMS not enabled for this business' };
  }

  if (!config.arkeselSenderId) {
    console.error('[sendViaBusiness] SMS Sender ID not set — go to Settings → Messaging and enter your SMS Sender ID');
    return { success: false, error: 'SMS sender name not configured for this business' };
  }

  console.log(`[sendViaBusiness] Sending SMS to ${phone} from "${config.arkeselSenderId}"`);
  return sendArkeselSMS(phone, message, config.apiKey, config.arkeselSenderId);
};
