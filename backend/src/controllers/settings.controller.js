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
        name: 'Gray Manager',
        address: 'Accra, Greater Accra, Ghana',
        phone: '+233 24 000 0000',
        email: 'info@graymanager.com',
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

/* ==========================================================================
   UNIT OF MEASURE (UoM) SETTINGS
   ========================================================================== */

// @desc    Get all global units (Master List)
// @route   GET /api/settings/units
// @access  Private
export const getGlobalUnits = asyncHandler(async (req, res) => {
  const units = await prisma.globalUnit.findMany({
    where: { isActive: true },
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

  // Check duplicate
  const existing = await prisma.globalUnit.findUnique({
    where: { name: name.trim() }
  });

  if (existing) {
    throw new AppError(`Unit '${name}' already exists`, 400, 'DUPLICATE_ENTRY');
  }

  const unit = await prisma.globalUnit.create({
    data: {
      name: name.trim(),
      abbreviation: abbreviation.trim(),
    }
  });

  res.status(201).json({
    success: true,
    message: 'Unit added successfully',
    data: unit,
  });
});

// @desc    Delete a global unit
// @route   DELETE /api/settings/units/:id
// @access  Private (Admin)
export const deleteGlobalUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Optional: Check if any materials are using this unit string before deleting?
  // For now, we allow deletion as it's just a string reference in Material model, 
  // but soft delete (isActive=false) is safer.

  await prisma.globalUnit.update({
    where: { id: parseInt(id) },
    data: { isActive: false } // Soft delete
  });

  res.status(200).json({
    success: true,
    message: 'Unit removed successfully',
  });
});

// @desc    Update a global unit
// @route   PUT /api/settings/units/:id
// @access  Private (Admin)
export const updateGlobalUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, abbreviation } = req.body;

  // Check if unit exists
  const unit = await prisma.globalUnit.findUnique({
    where: { id: parseInt(id) }
  });

  if (!unit) {
    throw new AppError('Unit not found', 404, 'NOT_FOUND');
  }

  // Check for duplicate name (excluding current unit)
  if (name) {
    const duplicate = await prisma.globalUnit.findFirst({
      where: {
        name: name.trim(),
        id: { not: parseInt(id) }, // Exclude self
        isActive: true
      }
    });
    if (duplicate) {
      throw new AppError(`Unit '${name}' already exists`, 400, 'DUPLICATE_ENTRY');
    }
  }

  const updatedUnit = await prisma.globalUnit.update({
    where: { id: parseInt(id) },
    data: {
      name: name ? name.trim() : undefined,
      abbreviation: abbreviation ? abbreviation.trim() : undefined,
    }
  });

  res.status(200).json({
    success: true,
    message: 'Unit updated successfully',
    data: updatedUnit,
  });
});