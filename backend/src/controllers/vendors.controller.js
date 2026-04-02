import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get all vendors
// @route   GET /api/vendors
export const getVendors = asyncHandler(async (req, res) => {
  const { search, includeInactive } = req.query;

  const where = { businessId: req.user.businessId };
  if (!includeInactive) where.isActive = true;
  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }

  const vendors = await req.db.vendor.findMany({
    where,
    orderBy: { companyName: 'asc' },
  });

  res.status(200).json({ success: true, data: vendors });
});

// @desc    Get single vendor with reorder history
// @route   GET /api/vendors/:id
export const getVendor = asyncHandler(async (req, res) => {
  const vendor = await req.db.vendor.findFirst({
    where: { id: parseInt(req.params.id), businessId: req.user.businessId },
    include: {
      reorders: {
        orderBy: { reorderDate: 'desc' },
        take: 10,
        include: {
          material: { select: { name: true } },
          user: { select: { fullName: true } },
        },
      },
    },
  });

  if (!vendor) throw new AppError('Vendor not found', 404);

  res.status(200).json({ success: true, data: vendor });
});

// @desc    Create vendor
// @route   POST /api/vendors
export const createVendor = asyncHandler(async (req, res) => {
  const { companyName, contactName, phone, email, whatsappNumber, location, notes } = req.body;

  if (!companyName?.trim()) throw new AppError('Company name is required', 400);

  const vendor = await req.db.vendor.create({
    data: {
      companyName: companyName.trim(),
      contactName: contactName?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      whatsappNumber: whatsappNumber?.trim() || null,
      location: location?.trim() || null,
      notes: notes?.trim() || null,
      businessId: req.user.businessId,
    },
  });

  res.status(201).json({ success: true, data: vendor });
});

// @desc    Update vendor
// @route   PUT /api/vendors/:id
export const updateVendor = asyncHandler(async (req, res) => {
  const vendor = await req.db.vendor.findFirst({
    where: { id: parseInt(req.params.id), businessId: req.user.businessId },
  });

  if (!vendor) throw new AppError('Vendor not found', 404);

  const { companyName, contactName, phone, email, whatsappNumber, location, notes, isActive } = req.body;

  const updated = await req.db.vendor.update({
    where: { id: vendor.id },
    data: {
      ...(companyName !== undefined && { companyName: companyName.trim() }),
      ...(contactName !== undefined && { contactName: contactName?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(email !== undefined && { email: email?.trim() || null }),
      ...(whatsappNumber !== undefined && { whatsappNumber: whatsappNumber?.trim() || null }),
      ...(location !== undefined && { location: location?.trim() || null }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  res.status(200).json({ success: true, data: updated });
});

// @desc    Delete (soft) vendor
// @route   DELETE /api/vendors/:id
export const deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await req.db.vendor.findFirst({
    where: { id: parseInt(req.params.id), businessId: req.user.businessId },
  });

  if (!vendor) throw new AppError('Vendor not found', 404);

  await req.db.vendor.update({
    where: { id: vendor.id },
    data: { isActive: false },
  });

  res.status(200).json({ success: true, message: 'Vendor deleted' });
});
