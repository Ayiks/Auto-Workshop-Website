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
      arkeselSenderId: true,
      arkeselWhatsAppSenderId: true,
      whatsappStatus: true,
    },
  });

  if (!settings) return null;

  return {
    apiKey,
    arkeselSenderId: settings.arkeselSenderId,
    arkeselWhatsAppSenderId: settings.arkeselWhatsAppSenderId,
    whatsappStatus: settings.whatsappStatus,
  };
};

/**
 * Send an SMS via Arkesel API v1.
 * https://developers.arkesel.com/#tag/SMS-V1
 */
export const sendArkeselSMS = async (phone, message, apiKey, senderId) => {
  try {
    const params = new URLSearchParams({
      action: 'send-sms',
      api_key: apiKey,
      to: normalizePhone(phone),
      from: senderId,
      sms: message,
    });

    const response = await fetch(
      `https://sms.arkesel.com/sms/api?${params.toString()}`,
      { method: 'GET' }
    );

    const data = await response.json();

    if (data.code === 'ok' || data.status === 'success') {
      return { success: true, data };
    }
    return { success: false, error: data.message || JSON.stringify(data) };
  } catch (err) {
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
 * Initiate WhatsApp Business number registration on Arkesel.
 * Arkesel sends an OTP to the WhatsApp number; once verified, status becomes 'active'.
 */
export const registerWhatsAppSender = async (whatsappNumber, businessName, apiKey) => {
  try {
    const response = await fetch('https://sms.arkesel.com/api/v2/whatsapp/register', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: normalizePhone(whatsappNumber),
        name: businessName,
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
    return { success: false, error: 'Arkesel platform key not configured (ARKESEL_API_KEY env var missing)' };
  }

  if (channel === 'whatsapp') {
    if (!config.arkeselWhatsAppSenderId) {
      return { success: false, error: 'WhatsApp Business number not configured for this business' };
    }
    if (config.whatsappStatus !== 'active') {
      return { success: false, error: 'WhatsApp number is not yet active. Complete activation in Settings → Messaging.' };
    }
    return sendArkeselWhatsApp(phone, message, config.apiKey, config.arkeselWhatsAppSenderId);
  }

  if (!config.arkeselSenderId) {
    return { success: false, error: 'SMS sender name not configured for this business' };
  }
  return sendArkeselSMS(phone, message, config.apiKey, config.arkeselSenderId);
};
