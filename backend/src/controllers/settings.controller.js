import { getTenantDB } from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get business settings
// @route   GET /api/settings/business
// @access  Private (or Public with ?businessId=)
export const getSettings = asyncHandler(async (req, res) => {
  const businessId = req.user?.businessId || req.query.businessId;

  if (!businessId) {
    throw new AppError('Business ID is required to fetch settings.', 400, 'VALIDATION_ERROR');
  }

  const db = getTenantDB(businessId);
  let settings = await db.businessSettings.findFirst({
    where: { businessId }, // ✅ explicit filter even inside tenant DB
  });

  if (!settings) {
    settings = await db.businessSettings.create({
      data: {
        name: 'Gray Manager',
        address: 'Accra, Greater Accra, Ghana',
        phone: '+233 24 000 0000',
        email: 'info@graymanager.com',
        businessId,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: settings,
  });
});

// @desc    Update business settings
// @route   PUT /api/settings/business
// @access  Private (requires 'settings:update' permission)
export const updateSettings = asyncHandler(async (req, res) => {
  const {
    name, logo, address, phone, email, website, arkeselSenderId, arkeselWhatsAppSenderId, smsEnabled, enabledJobTypes,
    bankName, bankAccountName, bankAccountNumber, momoNumber, momoName, invoicePaymentNote,
  } = req.body;

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400, 'VALIDATION_ERROR');
    }
  }

  if (phone) {
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      throw new AppError('Invalid phone number format', 400, 'VALIDATION_ERROR');
    }
  }

  if (website) {
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(website)) {
      throw new AppError(
        'Invalid website URL. Must start with http:// or https://',
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  // scope findFirst to this business
  let settings = await req.db.businessSettings.findFirst({
    where: { businessId: req.user.businessId },
  });

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (logo !== undefined) updateData.logo = logo?.trim();
  if (address !== undefined) updateData.address = address.trim();
  if (phone !== undefined) updateData.phone = phone.trim();
  if (email !== undefined) updateData.email = email.trim();
  if (website !== undefined) updateData.website = website?.trim();
  // Arkesel messaging config — only update if provided (empty string = clear)
  if (arkeselSenderId !== undefined) updateData.arkeselSenderId = arkeselSenderId?.trim() || null;
  if (arkeselWhatsAppSenderId !== undefined) {
    updateData.arkeselWhatsAppSenderId = arkeselWhatsAppSenderId?.trim() || null;
    if (!arkeselWhatsAppSenderId?.trim()) updateData.whatsappStatus = null;
  }
  if (smsEnabled !== undefined) updateData.smsEnabled = Boolean(smsEnabled);
  if (Array.isArray(enabledJobTypes) && enabledJobTypes.length) updateData.enabledJobTypes = enabledJobTypes;
  // Invoice payment details — empty string clears the field
  if (bankName !== undefined) updateData.bankName = bankName?.trim() || null;
  if (bankAccountName !== undefined) updateData.bankAccountName = bankAccountName?.trim() || null;
  if (bankAccountNumber !== undefined) updateData.bankAccountNumber = bankAccountNumber?.trim() || null;
  if (momoNumber !== undefined) updateData.momoNumber = momoNumber?.trim() || null;
  if (momoName !== undefined) updateData.momoName = momoName?.trim() || null;
  if (invoicePaymentNote !== undefined) updateData.invoicePaymentNote = invoicePaymentNote?.trim() || null;

  if (settings) {
    settings = await req.db.businessSettings.update({
      where: { id: settings.id },
      data: updateData,
    });
  } else {
    settings = await req.db.businessSettings.create({
      data: {
        name: name || 'Auto Workshop',
        logo,
        address: address || 'Accra, Greater Accra, Ghana',
        phone: phone || '+233 24 000 0000',
        email: email || 'info@autoworkshop.com',
        website,
        businessId: req.user.businessId, // ✅ always set on create
      },
    });
  }

  await req.db.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'BusinessSettings',
      entityId: settings.id,
      description: 'Updated business settings',
      businessId: req.user.businessId,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Business settings updated successfully',
    data: settings,
  });
});

// @desc    Update business logo
// @route   PUT /api/settings/logo
// @access  Private (requires 'settings:update' permission)
export const updateLogo = asyncHandler(async (req, res) => {
  const { logo } = req.body;

  if (!logo) {
    throw new AppError('Please provide logo URL or base64 string', 400, 'VALIDATION_ERROR');
  }

  // scope to this business
  let settings = await req.db.businessSettings.findFirst({
    where: { businessId: req.user.businessId },
  });

  if (!settings) {
    throw new AppError(
      'Business settings not found. Please set up basic settings first.',
      404,
      'NOT_FOUND'
    );
  }

  settings = await req.db.businessSettings.update({
    where: { id: settings.id },
    data: { logo: logo.trim() },
  });

  await req.db.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'BusinessSettings',
      entityId: settings.id,
      description: 'Updated business logo',
      businessId: req.user.businessId,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Logo updated successfully',
    data: settings,
  });
});

// @desc    Get booth service price (for public display)
// @route   GET /api/settings/booth-price
// @access  Public
export const getBoothPrice = asyncHandler(async (req, res) => {
  // This is a public route - businessId should come from query param
  const businessId = req.query.businessId;
  if (!businessId) {
    throw new AppError('Business ID is required', 400, 'VALIDATION_ERROR');
  }

  const db = getTenantDB(businessId);
  const service = await db.service.findFirst({
    where: { type: 'booth', isActive: true, businessId },
  });

  if (!service) {
    return res.status(200).json({
      success: true,
      data: { price: null, message: 'Booth service price not configured' },
    });
  }

  res.status(200).json({
    success: true,
    data: { price: service.price, type: service.type },
  });
});

/* ==========================================================================
   UNIT OF MEASURE (UoM) SETTINGS
   ========================================================================== */

// @desc    Get all global units
// @route   GET /api/settings/units
// @access  Private
export const getGlobalUnits = asyncHandler(async (req, res) => {
  // scope to this business's units
  const units = await req.db.globalUnit.findMany({
    where: { isActive: true, businessId: req.user.businessId },
    orderBy: { name: 'asc' },
  });

  res.status(200).json({
    success: true,
    count: units.length,
    data: units,
  });
});

// @desc    Add a new global unit
// @route   POST /api/settings/units
// @access  Private (Admin)
export const addGlobalUnit = asyncHandler(async (req, res) => {
  const { name, abbreviation } = req.body;

  if (!name || !abbreviation) {
    throw new AppError('Name and Abbreviation are required', 400, 'VALIDATION_ERROR');
  }

  // duplicate check scoped to this business
  const existing = await req.db.globalUnit.findFirst({
    where: { name: name.trim(), businessId: req.user.businessId },
  });

  if (existing) {
    throw new AppError(`Unit '${name}' already exists`, 400, 'DUPLICATE_ENTRY');
  }

  const unit = await req.db.globalUnit.create({
    data: {
      name: name.trim(),
      abbreviation: abbreviation.trim(),
      businessId: req.user.businessId, // ✅ always set on create
    },
  });

  res.status(201).json({
    success: true,
    message: 'Unit added successfully',
    data: unit,
  });
});

// @desc    Update a global unit
// @route   PUT /api/settings/units/:id
// @access  Private (Admin)
export const updateGlobalUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, abbreviation } = req.body;

  // verify ownership before updating
  const unit = await req.db.globalUnit.findFirst({
    where: { id: parseInt(id), businessId: req.user.businessId },
  });

  if (!unit) {
    throw new AppError('Unit not found', 404, 'NOT_FOUND');
  }

  if (name) {
    const duplicate = await req.db.globalUnit.findFirst({
      where: {
        name: name.trim(),
        businessId: req.user.businessId,
        id: { not: parseInt(id) },
        isActive: true,
      },
    });
    if (duplicate) {
      throw new AppError(`Unit '${name}' already exists`, 400, 'DUPLICATE_ENTRY');
    }
  }

  const updatedUnit = await req.db.globalUnit.update({
    where: { id: parseInt(id) },
    data: {
      name: name ? name.trim() : undefined,
      abbreviation: abbreviation ? abbreviation.trim() : undefined,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Unit updated successfully',
    data: updatedUnit,
  });
});

// @desc    Delete a global unit (soft delete)
// @route   DELETE /api/settings/units/:id
// @access  Private (Admin)
export const deleteGlobalUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // verify ownership before soft-deleting
  const unit = await req.db.globalUnit.findFirst({
    where: { id: parseInt(id), businessId: req.user.businessId },
  });

  if (!unit) {
    throw new AppError('Unit not found', 404, 'NOT_FOUND');
  }

  await req.db.globalUnit.update({
    where: { id: parseInt(id) },
    data: { isActive: false },
  });

  res.status(200).json({
    success: true,
    message: 'Unit removed successfully',
  });
});

/* ==========================================================================
   WHATSAPP REGISTRATION
   ========================================================================== */

// @desc    Initiate WhatsApp Business number registration via Arkesel
// @route   POST /api/settings/messaging/register-whatsapp
// @access  Private (requires 'settings:update' permission)
export const registerWhatsApp = asyncHandler(async (req, res) => {
  const settings = await req.db.businessSettings.findFirst({
    where: { businessId: req.user.businessId },
    select: { id: true, arkeselWhatsAppSenderId: true },
  });

  if (!settings) {
    throw new AppError('Business settings not found. Please save your settings first.', 404, 'NOT_FOUND');
  }

  if (!settings.arkeselWhatsAppSenderId) {
    throw new AppError('WhatsApp Business number is not set. Please enter it in Settings → Messaging.', 400, 'VALIDATION_ERROR');
  }

  await req.db.businessSettings.update({
    where: { id: settings.id },
    data: { whatsappStatus: 'active' },
  });

  await req.db.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'BusinessSettings',
      entityId: settings.id,
      description: 'Activated WhatsApp Business number',
      businessId: req.user.businessId,
    },
  });

  res.status(200).json({
    success: true,
    message: 'WhatsApp activated successfully.',
    data: { whatsappStatus: 'active' },
  });
});