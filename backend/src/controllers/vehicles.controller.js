import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get vehicles for a customer
// @route   GET /api/vehicles?customerId=:id
export const getVehicles = asyncHandler(async (req, res) => {
  const { customerId } = req.query;
  if (!customerId) throw new AppError('customerId is required', 400, 'VALIDATION_ERROR');

  // Verify customer belongs to this business
  const customer = await req.db.customer.findFirst({
    where: { id: parseInt(customerId), businessId: req.user.businessId },
  });
  if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');

  const vehicles = await req.db.vehicle.findMany({
    where: { customerId: parseInt(customerId), businessId: req.user.businessId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ success: true, count: vehicles.length, data: vehicles });
});

// @desc    Get single vehicle
// @route   GET /api/vehicles/:id
export const getVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vehicle = await req.db.vehicle.findFirst({
    where: { id: parseInt(id), businessId: req.user.businessId, isActive: true },
  });
  if (!vehicle) throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
  res.status(200).json({ success: true, data: vehicle });
});

// @desc    Add vehicle to a customer
// @route   POST /api/vehicles
export const createVehicle = asyncHandler(async (req, res) => {
  const { customerId, make, model, year, regNumber, color, vin, mileage } = req.body;
  if (!customerId) throw new AppError('customerId is required', 400, 'VALIDATION_ERROR');

  const customer = await req.db.customer.findFirst({
    where: { id: parseInt(customerId), businessId: req.user.businessId },
  });
  if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');

  if (regNumber?.trim()) {
    const existing = await req.db.vehicle.findFirst({
      where: { regNumber: regNumber.trim(), businessId: req.user.businessId, isActive: true },
    });
    if (existing) throw new AppError('A vehicle with this registration number already exists', 400, 'DUPLICATE_ENTRY');
  }

  const vehicle = await req.db.vehicle.create({
    data: {
      customerId: parseInt(customerId),
      make: make?.trim() || null,
      model: model?.trim() || null,
      year: year ? parseInt(year, 10) : null,
      regNumber: regNumber?.trim() || null,
      color: color?.trim() || null,
      vin: vin?.trim() || null,
      businessId: req.user.businessId,
    },
  });

  // Mileage: raw SQL until `prisma generate` is re-run
  if (mileage) {
    await req.db.$executeRawUnsafe(
      `UPDATE vehicles SET mileage = $1 WHERE id = $2`,
      parseInt(mileage, 10),
      vehicle.id
    );
  }

  await req.db.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CREATE',
      entity: 'Vehicle',
      entityId: vehicle.id,
      description: `Added vehicle ${regNumber || make || 'unknown'} for customer #${customerId}`,
      businessId: req.user.businessId,
    },
  });

  res.status(201).json({ success: true, data: vehicle });
});

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
export const updateVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { make, model, year, regNumber, color, vin, mileage } = req.body;

  const existing = await req.db.vehicle.findFirst({
    where: { id: parseInt(id), businessId: req.user.businessId },
  });
  if (!existing) throw new AppError('Vehicle not found', 404, 'NOT_FOUND');

  if (regNumber?.trim() && regNumber.trim() !== existing.regNumber) {
    const conflict = await req.db.vehicle.findFirst({
      where: { regNumber: regNumber.trim(), businessId: req.user.businessId, id: { not: parseInt(id) }, isActive: true },
    });
    if (conflict) throw new AppError('Another vehicle with this registration number already exists', 400, 'DUPLICATE_ENTRY');
  }

  // Update core fields via Prisma (mileage handled separately via raw SQL
  // until `prisma generate` is re-run to pick up the new schema field)
  const vehicle = await req.db.vehicle.update({
    where: { id: parseInt(id) },
    data: {
      ...(make !== undefined && { make: make?.trim() || null }),
      ...(model !== undefined && { model: model?.trim() || null }),
      ...(year !== undefined && { year: year ? parseInt(year, 10) : null }),
      ...(regNumber !== undefined && { regNumber: regNumber?.trim() || null }),
      ...(color !== undefined && { color: color?.trim() || null }),
      ...(vin !== undefined && { vin: vin?.trim() || null }),
    },
  });

  // Mileage: use raw SQL until the Prisma client is regenerated
  if (mileage !== undefined) {
    const mileageVal = mileage ? parseInt(mileage, 10) : null;
    await req.db.$executeRawUnsafe(
      `UPDATE vehicles SET mileage = $1 WHERE id = $2`,
      mileageVal,
      parseInt(id)
    );
  }

  await req.db.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'Vehicle',
      entityId: vehicle.id,
      description: `Updated vehicle #${id}`,
      businessId: req.user.businessId,
    },
  });

  res.status(200).json({ success: true, data: vehicle });
});

// @desc    Soft-delete vehicle
// @route   DELETE /api/vehicles/:id
export const deleteVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vehicle = await req.db.vehicle.findFirst({
    where: { id: parseInt(id), businessId: req.user.businessId },
  });
  if (!vehicle) throw new AppError('Vehicle not found', 404, 'NOT_FOUND');

  await req.db.vehicle.update({ where: { id: parseInt(id) }, data: { isActive: false } });

  await req.db.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'DELETE',
      entity: 'Vehicle',
      entityId: parseInt(id),
      description: `Removed vehicle ${vehicle.regNumber || vehicle.make || '#' + id}`,
      businessId: req.user.businessId,
    },
  });

  res.status(200).json({ success: true, message: 'Vehicle removed successfully' });
});
