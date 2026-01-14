import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get business settings
// @route   GET /api/settings
// @access  Public (no authentication for public website to display info)
export const getSettings = asyncHandler(async (req, res) => {
  let settings = await prisma.businessSettings.findFirst();

  // If no settings exist, create default
  if (!settings) {
    settings = await prisma.businessSettings.create({
      data: {
        name: 'Auto Workshop',
        address: 'Accra, Greater Accra, Ghana',
        phone: '+233 24 000 0000',
        email: 'info@autoworkshop.com',
      },
    });
  }

  res.status(200).json({
    success: true,
    data: settings,
  });
});

// @desc    Update business settings
// @route   PUT /api/settings
// @access  Private (requires admin role)
export const updateSettings = asyncHandler(async (req, res) => {
  const { name, logo, address, phone, email, website } = req.body;

  // Validation
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError(
        'Invalid email format',
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  if (phone) {
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      throw new AppError(
        'Invalid phone number format',
        400,
        'VALIDATION_ERROR'
      );
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

  // Get existing settings or create new
  let settings = await prisma.businessSettings.findFirst();

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (logo !== undefined) updateData.logo = logo?.trim();
  if (address !== undefined) updateData.address = address.trim();
  if (phone !== undefined) updateData.phone = phone.trim();
  if (email !== undefined) updateData.email = email.trim();
  if (website !== undefined) updateData.website = website?.trim();

  if (settings) {
    // Update existing settings
    settings = await prisma.businessSettings.update({
      where: { id: settings.id },
      data: updateData,
    });
  } else {
    // Create new settings if none exist
    settings = await prisma.businessSettings.create({
      data: {
        name: name || 'Auto Workshop',
        logo,
        address: address || 'Accra, Greater Accra, Ghana',
        phone: phone || '+233 24 000 0000',
        email: email || 'info@autoworkshop.com',
        website,
      },
    });
  }

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'BusinessSettings',
      entityId: settings.id,
      description: 'Updated business settings',
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
// @access  Private (requires admin role)
export const updateLogo = asyncHandler(async (req, res) => {
  const { logo } = req.body;

  if (!logo) {
    throw new AppError('Please provide logo URL or base64 string', 400, 'VALIDATION_ERROR');
  }

  // Get existing settings
  let settings = await prisma.businessSettings.findFirst();

  if (!settings) {
    throw new AppError(
      'Business settings not found. Please set up basic settings first.',
      404,
      'NOT_FOUND'
    );
  }

  settings = await prisma.businessSettings.update({
    where: { id: settings.id },
    data: { logo: logo.trim() },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'BusinessSettings',
      entityId: settings.id,
      description: 'Updated business logo',
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
  const service = await prisma.service.findFirst({
    where: { type: 'booth', isActive: true },
  });

  if (!service) {
    return res.status(200).json({
      success: true,
      data: {
        price: null,
        message: 'Booth service price not configured',
      },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      price: service.price,
      type: service.type,
    },
  });
});