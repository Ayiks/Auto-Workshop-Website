import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { sendJobCreatedEmail, sendJobCompletedEmail } from '../utils/sendEmail.js';
import { getBusinessMessagingConfig, sendViaBusiness } from '../utils/sendSMS.js';

// Fire-and-forget SMS helper — never throws, always resolves
const sendJobSMS = (phone, message, businessId) => {
  getBusinessMessagingConfig(businessId)
    .then(config => sendViaBusiness(phone, message, 'sms', config))
    .then(result => {
      if (!result?.success) {
        console.warn('[SMS] Not sent:', result?.error || 'check smsEnabled / arkeselSenderId in business settings');
      }
    })
    .catch(err => console.error('[SMS] Job notification failed:', err.message));
};

// @desc    Create new job
// @route   POST /api/jobs
export const createJob = asyncHandler(async (req, res) => {
  const {
    jobType, clientName, clientPhone, clientEmail,
    vehicleMake, vehicleModel, vehicleRegNumber, odometer, vehicleYear,
    problemType, problemDescription,
    labourCost = 0, miscellaneousCost = 0, materials = [],
    reminderEnabled = false, reminderIntervalMonths, reminderTypes = [], reminderChannels = ['email'],
    beforePhotos = [],
  } = req.body;

  if (!jobType || !['mechanic', 'sprayer', 'bodyworks', 'other'].includes(jobType))
    throw new AppError('Invalid job type. Must be mechanic, sprayer, bodyworks, or other', 400, 'VALIDATION_ERROR');

  // Validate jobType against this business's enabled job types
  const bizConfig = await req.db.businessSettings.findFirst({
    where: { businessId: req.user.businessId },
    select: { enabledJobTypes: true },
  });
  const allowedTypes = bizConfig?.enabledJobTypes?.length
    ? bizConfig.enabledJobTypes
    : ['mechanic', 'sprayer', 'bodyworks', 'other'];
  if (!allowedTypes.includes(jobType)) {
    throw new AppError(
      `Job type "${jobType}" is not enabled for this workshop. Enabled types: ${allowedTypes.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }

  if (!clientName || !clientPhone)
    throw new AppError('Please provide client name and phone number', 400, 'VALIDATION_ERROR');
  if (!problemType)
    throw new AppError('Please provide problem type', 400, 'VALIDATION_ERROR');
  if (req.allowedJobType && req.allowedJobType !== jobType && jobType !== 'other')
    throw new AppError('You can only create ' + req.allowedJobType + ' jobs', 403, 'PERMISSION_DENIED');

  // Validate vehicle year
  if (vehicleYear !== undefined && vehicleYear !== null && vehicleYear !== '') {
    const yearInt = parseInt(vehicleYear, 10);
    const currentYear = new Date().getFullYear();
    if (isNaN(yearInt) || yearInt < 1886 || yearInt > currentYear) {
      throw new AppError(`Vehicle year must be between 1886 and ${currentYear}`, 400, 'VALIDATION_ERROR');
    }
  }

  // Validate odometer
  if (odometer !== undefined && odometer !== null && odometer !== '') {
    if (parseInt(odometer, 10) < 0) {
      throw new AppError('Odometer reading cannot be negative', 400, 'VALIDATION_ERROR');
    }
  }

  let materialsCostTotal = 0;
  const validatedMaterials = [];

  for (const material of materials) {
    const qty   = parseFloat(material.quantity);
    const price = parseFloat(material.unitPrice);
    if (!material.materialName || isNaN(qty) || qty <= 0)
      throw new AppError('Each material must have a name and valid quantity', 400, 'VALIDATION_ERROR');
    if (isNaN(price) || price <= 0)
      throw new AppError('Each material must have a valid unit price', 400, 'VALIDATION_ERROR');

    const isExternal = material.isExternal === true;
    let materialId = null;

    if (!isExternal) {
      if (!material.materialId)
        throw new AppError('Inventory materials must have materialId', 400, 'VALIDATION_ERROR');
      const inv = await req.db.material.findUnique({ where: { id: parseInt(material.materialId) } });
      if (!inv) throw new AppError('Material with ID ' + material.materialId + ' not found', 404, 'NOT_FOUND');
      if (!inv.isActive) throw new AppError('Material ' + inv.name + ' is inactive', 400, 'INVALID_OPERATION');
      materialId = inv.id;
    }

    const subtotal = qty * price;
    validatedMaterials.push({ materialId, materialName: material.materialName.trim(), quantity: qty, unitPrice: price, subtotal, isExternal });
    materialsCostTotal += subtotal;
  }

  const totalCost = materialsCostTotal + parseFloat(labourCost) + parseFloat(miscellaneousCost);

  const result = await req.db.$transaction(async (tx) => {
    const job = await tx.job.create({
      data: {
        jobType, clientName: clientName.trim(), clientPhone: clientPhone.trim(),
        clientEmail: clientEmail?.trim() || null,
        vehicleMake: vehicleMake?.trim() || null, vehicleModel: vehicleModel?.trim() || null,
        vehicleRegNumber: vehicleRegNumber?.trim() || null,
        odometer: odometer ? parseInt(odometer, 10) : null,
        problemType: problemType.trim(), problemDescription: (problemDescription || '').trim(),
        labourCost: parseFloat(labourCost), miscellaneousCost: parseFloat(miscellaneousCost),
        totalCost, assignedTo: req.user.id, status: 'pending',
        reminderEnabled: !!reminderEnabled,
        reminderIntervalMonths: reminderEnabled && reminderIntervalMonths ? parseInt(reminderIntervalMonths, 10) : null,
        reminderTypes: reminderEnabled && reminderTypes?.length ? reminderTypes : [],
        businessId: req.user.businessId,
      },
    });
    for (const m of validatedMaterials) {
      await tx.jobMaterial.create({ data: { jobId: job.id, ...m } });
    }

    // Save before photos if provided
    if (Array.isArray(beforePhotos) && beforePhotos.length > 0) {
      for (const photo of beforePhotos) {
        if (photo?.url && photo?.publicId) {
          await tx.jobPhoto.create({
            data: {
              jobId: job.id,
              url: photo.url,
              publicId: photo.publicId,
              caption: 'before',
              uploadedBy: req.user.id,
              businessId: req.user.businessId,
            },
          });
        }
      }
    }

    // Auto-upsert Customer and Vehicle records from job data
    let customerId = null;
    let vehicleId = null;
    const phone = clientPhone.trim();
    const upsertedCustomer = await tx.customer.upsert({
      where: { phone_businessId: { phone, businessId: req.user.businessId } },
      update: {
        ...(clientEmail?.trim() && { email: clientEmail.trim() }),
      },
      create: {
        firstName: clientName.trim().split(' ')[0],
        lastName: clientName.trim().split(' ').slice(1).join(' ') || null,
        phone,
        email: clientEmail?.trim() || null,
        businessId: req.user.businessId,
      },
    });
    customerId = upsertedCustomer.id;

    if (vehicleRegNumber?.trim()) {
      const regNumber = vehicleRegNumber.trim();
      // Use findFirst + update/create instead of upsert — the partial unique index
      // (WHERE reg_number IS NOT NULL) cannot be used as an ON CONFLICT target by Prisma.
      const existingVehicle = await tx.vehicle.findFirst({
        where: { regNumber, businessId: req.user.businessId },
      });
      const odometerInt = odometer ? parseInt(odometer, 10) : null;
      if (existingVehicle) {
        const updated = await tx.vehicle.update({
          where: { id: existingVehicle.id },
          data: {
            ...(vehicleMake?.trim() && { make: vehicleMake.trim() }),
            ...(vehicleModel?.trim() && { model: vehicleModel.trim() }),
            // Sync mileage if the new reading is higher than what's on record
            ...(odometerInt && (!existingVehicle.mileage || odometerInt > existingVehicle.mileage) && { mileage: odometerInt }),
          },
        });
        vehicleId = updated.id;
      } else {
        const created = await tx.vehicle.create({
          data: {
            customerId,
            make: vehicleMake?.trim() || null,
            model: vehicleModel?.trim() || null,
            year: vehicleYear ? parseInt(vehicleYear, 10) : null,
            regNumber,
            businessId: req.user.businessId,
          },
        });
        // Sync mileage via raw SQL (Prisma client not yet regenerated for this field)
        if (odometerInt) {
          await tx.$executeRawUnsafe(
            `UPDATE vehicles SET mileage = $1 WHERE id = $2`,
            odometerInt,
            created.id
          );
        }
        vehicleId = created.id;
      }
    }

    await tx.job.update({ where: { id: job.id }, data: { customerId, vehicleId } });

    // Create scheduled reminders if requested — one row per type × channel
    if (reminderEnabled && reminderIntervalMonths && reminderTypes?.length && customerId) {
      const months = parseInt(reminderIntervalMonths, 10);
      const firstReminderDate = new Date(job.createdAt);
      firstReminderDate.setMonth(firstReminderDate.getMonth() + months);
      const channels = Array.isArray(reminderChannels) && reminderChannels.length ? reminderChannels : ['email'];

      for (const type of reminderTypes) {
        for (const channel of channels) {
          await tx.reminder.create({
            data: {
              businessId: req.user.businessId,
              customerId,
              jobId: job.id,
              type,
              channel,
              status: 'pending',
              scheduledFor: firstReminderDate,
            },
          });
        }
      }
    }

    await tx.auditLog.create({
      data: { userId: req.user.id, action: 'CREATE', entity: 'Job', entityId: job.id,
        description: 'Created ' + jobType + ' job #' + job.id + ' for ' + clientName + '. Total: GHc' + totalCost },
    });
    return { ...job, customerId, vehicleId };
  });

  const completeJob = await req.db.job.findUnique({
    where: { id: result.id },
    include: {
      materials: { include: { material: { select: { name: true, sellingPrice: true } } } },
      user: { select: { fullName: true, username: true, role: true } },
    },
  });

  const [business, bizSettings] = await Promise.all([
    req.db.business.findUnique({ where: { id: req.user.businessId }, select: { name: true } }),
    req.db.businessSettings.findFirst({ where: { businessId: req.user.businessId }, select: { email: true } }),
  ]);
  res.status(201).json({ success: true, message: 'Job created successfully', data: completeJob });

  // Fire-and-forget: notify customer that their job has been received (all job types)
  if (completeJob?.clientPhone) {
    const vehicle = [completeJob.vehicleMake, completeJob.vehicleModel].filter(Boolean).join(' ');
    const msg = `Hi ${completeJob.clientName}, your ${completeJob.jobType} job has been received at ${business?.name || 'our workshop'}. Ref: #${completeJob.id}${vehicle ? `. Vehicle: ${vehicle}` : ''}. We will keep you updated.`;
    sendJobSMS(completeJob.clientPhone, msg, req.user.businessId);
  }
});

// @desc    Get all jobs
// @route   GET /api/jobs
export const getJobs = asyncHandler(async (req, res) => {
  const { status, jobType, startDate, endDate, assignedTo, customerId } = req.query;
  const where = {};
  if (req.allowedJobType) where.jobType = { in: [req.allowedJobType, 'other'] };
  else if (jobType) where.jobType = jobType;
  if (status) where.status = status;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); where.createdAt.lte = e; }
  }
  if (assignedTo) where.assignedTo = parseInt(assignedTo);
  if (customerId) {
    where.customerId = parseInt(customerId);
    // When viewing a customer's job history, skip per-user restriction for admin/manager
    if (!['admin', 'manager'].includes(req.user.role)) where.assignedTo = req.user.id;
  } else {
    if (req.user.role !== 'admin') where.assignedTo = req.user.id;
    else if (req.isOwnResource) where.assignedTo = req.user.id;
  }
  const jobs = await req.db.job.findMany({
    where,
    include: {
      materials: { include: { material: { select: { name: true } } } },
      user: { select: { fullName: true, username: true, role: true } },
      invoice: { select: { invoiceNumber: true, paymentStatus: true, amountPaid: true, amountDue: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.status(200).json({ success: true, count: jobs.length, data: jobs });
});

// @desc    Get single job
// @route   GET /api/jobs/:id
export const getJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const job = await req.db.job.findUnique({
    where: { id: parseInt(id) },
    include: {
      materials: { include: { material: { select: { id: true, name: true, sellingPrice: true, quantity: true } } } },
      user: { select: { id: true, fullName: true, username: true, role: true, email: true, phone: true } },
      invoice: {
        include: {
          payments: {
            include: { user: { select: { fullName: true } }, receipt: { select: { receiptNumber: true } } },
            orderBy: { paymentDate: 'desc' },
          },
        },
      },
      photos: {
        orderBy: { createdAt: 'asc' },
        include: { uploader: { select: { fullName: true } } },
      },
    },
  });
  if (!job) throw new AppError('Job not found', 404, 'NOT_FOUND');
  if (req.isOwnResource && job.assignedTo !== req.user.id)
    throw new AppError('Not authorized to view this job', 403, 'PERMISSION_DENIED');
  if (req.allowedJobType && job.jobType !== req.allowedJobType && job.jobType !== 'other')
    throw new AppError(`You can only view ${req.allowedJobType} jobs`, 403, 'PERMISSION_DENIED');
  res.status(200).json({ success: true, data: job });
});

// @desc    Update job
// @route   PUT /api/jobs/:id
export const updateJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    clientName, clientPhone, clientEmail, vehicleMake, vehicleModel, vehicleRegNumber,
    problemType, problemDescription, labourCost, miscellaneousCost, materials, status,
  } = req.body;

  const existingJob = await req.db.job.findUnique({ where: { id: parseInt(id) }, include: { invoice: true } });
  if (!existingJob) throw new AppError('Job not found', 404, 'NOT_FOUND');
  if (req.isOwnResource && existingJob.assignedTo !== req.user.id)
    throw new AppError('Not authorized to edit this job', 403, 'PERMISSION_DENIED');
  if (req.allowedJobType && existingJob.jobType !== req.allowedJobType && existingJob.jobType !== 'other')
    throw new AppError(`You can only edit ${req.allowedJobType} jobs`, 403, 'PERMISSION_DENIED');
  const validStatuses = ['pending', 'in_progress', 'completed', 'invoiced'];
  if (status && !validStatuses.includes(status))
    throw new AppError('Invalid status', 400, 'VALIDATION_ERROR');

  const updatedJob = await req.db.$transaction(async (tx) => {
    let finalMaterialsCost = 0;
    if (materials && Array.isArray(materials)) {
      await tx.jobMaterial.deleteMany({ where: { jobId: existingJob.id } });
      for (const mat of materials) {
        const qty = parseFloat(mat.quantity);
        const price = parseFloat(mat.unitPrice);
        const subtotal = qty * price;
        const isExternal = mat.isExternal === true;
        let materialId = null;
        if (!mat.materialName || qty <= 0)
          throw new AppError('Invalid material name or quantity', 400, 'VALIDATION_ERROR');
        if (!isExternal) {
          if (!mat.materialId) throw new AppError('Inventory item missing ID', 400, 'VALIDATION_ERROR');
          const inv = await tx.material.findUnique({ where: { id: parseInt(mat.materialId) } });
          if (!inv || !inv.isActive)
            throw new AppError('Material unavailable or inactive', 400, 'INVALID_OPERATION');
          materialId = inv.id;
        }
        await tx.jobMaterial.create({
          data: { jobId: existingJob.id, materialId, materialName: mat.materialName, quantity: qty, unitPrice: price, subtotal, isExternal },
        });
        finalMaterialsCost += subtotal;
      }
    } else {
      const existingMats = await tx.jobMaterial.findMany({ where: { jobId: existingJob.id } });
      finalMaterialsCost = existingMats.reduce((sum, m) => sum + Number(m.subtotal), 0);
    }
    const finalLabourCost = labourCost !== undefined ? parseFloat(labourCost) : Number(existingJob.labourCost);
    const finalMiscCost = miscellaneousCost !== undefined ? parseFloat(miscellaneousCost) : Number(existingJob.miscellaneousCost || 0);
    const totalCost = finalMaterialsCost + finalLabourCost + finalMiscCost;
    const updated = await tx.job.update({
      where: { id: existingJob.id },
      data: {
        ...(clientName && { clientName: clientName.trim() }),
        ...(clientPhone && { clientPhone: clientPhone.trim() }),
        ...(clientEmail !== undefined && { clientEmail: clientEmail ? clientEmail.trim() : null }),
        ...(vehicleMake !== undefined && { vehicleMake: vehicleMake ? vehicleMake.trim() : null }),
        ...(vehicleModel !== undefined && { vehicleModel: vehicleModel ? vehicleModel.trim() : null }),
        ...(vehicleRegNumber !== undefined && { vehicleRegNumber: vehicleRegNumber ? vehicleRegNumber.trim() : null }),
        ...(problemType && { problemType: problemType.trim() }),
        ...(problemDescription && { problemDescription: problemDescription.trim() }),
        ...(status && { status }),
        labourCost: finalLabourCost, miscellaneousCost: finalMiscCost, totalCost,
      },
      include: {
        materials: { include: { material: { select: { name: true } } } },
        user: { select: { fullName: true, username: true } },
      },
    });
    // Sync invoice costs if one exists
    if (existingJob.invoice) {
      const newTotalAmount = finalMaterialsCost + finalLabourCost + finalMiscCost;
      const amountPaid = parseFloat(existingJob.invoice.amountPaid || 0);
      await tx.invoice.update({
        where: { id: existingJob.invoice.id },
        data: {
          materialsCost: finalMaterialsCost,
          labourCost: finalLabourCost,
          miscellaneousCost: finalMiscCost,
          totalAmount: newTotalAmount,
          amountDue: Math.max(0, newTotalAmount - amountPaid),
        },
      });
    }
    await tx.auditLog.create({
      data: { userId: req.user.id, action: 'UPDATE', entity: 'Job', entityId: updated.id,
        description: `Updated job #${updated.id}` },
    });
    return updated;
  });
  res.status(200).json({ success: true, message: 'Job updated successfully', data: updatedJob });

  // Notify client when job transitions to in_progress (i.e. work has started)
  if (status === 'in_progress' && existingJob.status !== 'in_progress') {
    const [business, bizSettings] = await Promise.all([
      req.db.business.findUnique({ where: { id: req.user.businessId }, select: { name: true } }),
      req.db.businessSettings.findFirst({ where: { businessId: req.user.businessId }, select: { email: true } }),
    ]);
    sendJobCreatedEmail(updatedJob, business?.name, bizSettings?.email).catch(() => {});
    if (updatedJob.clientPhone) {
      const vehicle = [updatedJob.vehicleMake, updatedJob.vehicleModel].filter(Boolean).join(' ');
      const msg = `Hi ${updatedJob.clientName}, our team has started working on your vehicle${vehicle ? ` (${vehicle})` : ''} at ${business?.name || 'the workshop'}. Job Ref: #${updatedJob.id}. We will notify you when it is ready.`;
      sendJobSMS(updatedJob.clientPhone, msg, req.user.businessId);
    }
  }
});

// @desc    Add material to job
// @route   POST /api/jobs/:id/materials
export const addJobMaterial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { materialId, materialName, quantity, unitPrice, isExternal = false } = req.body;
  const qty = parseFloat(quantity);
  const price = parseFloat(unitPrice);
  if (!materialName || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0)
    throw new AppError('Please provide material name, valid quantity, and unit price', 400, 'VALIDATION_ERROR');
  const job = await req.db.job.findUnique({ where: { id: parseInt(id) }, include: { invoice: true, materials: true } });
  if (!job) throw new AppError('Job not found', 404, 'NOT_FOUND');
  if (req.isOwnResource && job.assignedTo !== req.user.id)
    throw new AppError('Not authorized to edit this job', 403, 'PERMISSION_DENIED');
  let validatedMaterialId = null;
  if (!isExternal) {
    if (!materialId) throw new AppError('Inventory materials must have materialId', 400, 'VALIDATION_ERROR');
    const inv = await req.db.material.findUnique({ where: { id: parseInt(materialId) } });
    if (!inv) throw new AppError(`Material ${materialId} not found`, 404, 'NOT_FOUND');
    if (!inv.isActive) throw new AppError('Material inactive', 400, 'INVALID_OPERATION');
    validatedMaterialId = inv.id;
  }
  const subtotal = qty * price;
  const result = await req.db.$transaction(async (tx) => {
    const jobMaterial = await tx.jobMaterial.create({
      data: { jobId: parseInt(id), materialId: validatedMaterialId, materialName: materialName.trim(), quantity: qty, unitPrice: price, subtotal, isExternal },
    });
    const currentMaterialsCost = job.materials.reduce((sum, m) => sum + parseFloat(m.subtotal), 0);
    const newMaterialsCost = currentMaterialsCost + subtotal;
    const newTotalCost = newMaterialsCost + parseFloat(job.labourCost) + parseFloat(job.miscellaneousCost || 0);
    await tx.job.update({ where: { id: parseInt(id) }, data: { totalCost: newTotalCost } });
    if (job.invoice) {
      const amountPaid = parseFloat(job.invoice.amountPaid || 0);
      await tx.invoice.update({
        where: { id: job.invoice.id },
        data: { materialsCost: newMaterialsCost, totalAmount: newTotalCost, amountDue: Math.max(0, newTotalCost - amountPaid) },
      });
    }
    await tx.auditLog.create({
      data: { userId: req.user.id, action: 'UPDATE', entity: 'Job', entityId: parseInt(id),
        description: `Added material "${materialName}" to job #${id}` },
    });
    return jobMaterial;
  });
  res.status(201).json({ success: true, message: 'Material added to job successfully', data: result });
});

// @desc    Remove material from job
// @route   DELETE /api/jobs/:id/materials/:materialId
export const removeJobMaterial = asyncHandler(async (req, res) => {
  const { id, materialId } = req.params;
  const job = await req.db.job.findUnique({ where: { id: parseInt(id) }, include: { invoice: true, materials: true } });
  if (!job) throw new AppError('Job not found', 404, 'NOT_FOUND');
  if (req.isOwnResource && job.assignedTo !== req.user.id)
    throw new AppError('Not authorized to edit this job', 403, 'PERMISSION_DENIED');
  const jobMaterial = await req.db.jobMaterial.findUnique({ where: { id: parseInt(materialId) } });
  if (!jobMaterial || jobMaterial.jobId !== parseInt(id))
    throw new AppError('Material not found in this job', 404, 'NOT_FOUND');
  await req.db.$transaction(async (tx) => {
    await tx.jobMaterial.delete({ where: { id: parseInt(materialId) } });
    const remaining = job.materials.filter(m => m.id !== parseInt(materialId));
    const materialsCost = remaining.reduce((sum, m) => sum + parseFloat(m.subtotal), 0);
    const newTotalCost = materialsCost + parseFloat(job.labourCost) + parseFloat(job.miscellaneousCost || 0);
    await tx.job.update({ where: { id: parseInt(id) }, data: { totalCost: newTotalCost } });
    if (job.invoice) {
      const amountPaid = parseFloat(job.invoice.amountPaid || 0);
      await tx.invoice.update({
        where: { id: job.invoice.id },
        data: { materialsCost, totalAmount: newTotalCost, amountDue: Math.max(0, newTotalCost - amountPaid) },
      });
    }
    await tx.auditLog.create({
      data: { userId: req.user.id, action: 'UPDATE', entity: 'Job', entityId: parseInt(id),
        description: `Removed material "${jobMaterial.materialName}" from job #${id}` },
    });
  });
  res.status(200).json({ success: true, message: 'Material removed from job successfully' });
});

// @desc    Complete job
// @route   PUT /api/jobs/:id/complete
export const completeJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const job = await req.db.job.findUnique({ where: { id: parseInt(id) }, include: { invoice: true, materials: true } });
  if (!job) throw new AppError('Job not found', 404, 'NOT_FOUND');
  if (req.isOwnResource && job.assignedTo !== req.user.id)
    throw new AppError('Not authorized to complete this job', 403, 'PERMISSION_DENIED');
  if (job.status === 'completed') throw new AppError('Job is already completed', 400, 'INVALID_OPERATION');
  if (job.status === 'cancelled') throw new AppError('Cannot complete a cancelled job', 400, 'INVALID_OPERATION');

  const updatedJob = await req.db.job.update({
    where: { id: parseInt(id) },
    data: { status: 'completed' },
    include: { materials: true, user: { select: { fullName: true, username: true } } },
  });

  await req.db.auditLog.create({
    data: { userId: req.user.id, action: 'UPDATE', entity: 'Job', entityId: updatedJob.id,
      description: `Completed job #${updatedJob.id}` },
  });

  const [business, bizSettings] = await Promise.all([
    req.db.business.findUnique({ where: { id: req.user.businessId }, select: { name: true } }),
    req.db.businessSettings.findFirst({ where: { businessId: req.user.businessId }, select: { email: true } }),
  ]);
  sendJobCompletedEmail(updatedJob, business?.name ?? null, bizSettings?.email).catch(() => {});

  res.status(200).json({ success: true, message: 'Job completed successfully. Ready for invoicing.', data: updatedJob });

  if (updatedJob.clientPhone) {
    const msg = `Hi ${updatedJob.clientName}, great news! Your vehicle is ready for collection at ${business?.name || 'the workshop'}. Please quote Job Ref: #${updatedJob.id} when you arrive. Thank you!`;
    sendJobSMS(updatedJob.clientPhone, msg, req.user.businessId);
  }
});

// @desc    Delete job
// @route   DELETE /api/jobs/:id
export const deleteJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const job = await req.db.job.findUnique({ where: { id: parseInt(id) }, include: { invoice: true } });
  if (!job) throw new AppError('Job not found', 404, 'NOT_FOUND');
  if (job.invoice) throw new AppError('Cannot delete job that has been invoiced', 400, 'INVALID_OPERATION');
  await req.db.$transaction(async (tx) => {
    await tx.jobMaterial.deleteMany({ where: { jobId: parseInt(id) } });
    await tx.job.delete({ where: { id: parseInt(id) } });
    await tx.auditLog.create({
      data: { userId: req.user.id, action: 'DELETE', entity: 'Job', entityId: parseInt(id),
        description: `Deleted ${job.jobType} job #${id}` },
    });
  });
  res.status(200).json({ success: true, message: 'Job deleted successfully' });
});

// @desc    Get job statistics
// @route   GET /api/jobs/stats
export const getJobStats = asyncHandler(async (req, res) => {
  const { startDate, endDate, jobType } = req.query;
  const where = {};
  if (req.allowedJobType) where.jobType = { in: [req.allowedJobType, 'other'] };
  else if (jobType) where.jobType = jobType;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); where.createdAt.lte = e; }
  }
  if (req.isOwnResource) where.assignedTo = req.user.id;
  const [totalJobs, jobsByType, jobsByStatus, recentJobs] = await Promise.all([
    req.db.job.aggregate({ where, _sum: { totalCost: true }, _count: true }),
    req.db.job.groupBy({ by: ['jobType'], where, _sum: { totalCost: true }, _count: true }),
    req.db.job.groupBy({ by: ['status'], where, _count: true }),
    req.db.job.findMany({ where, include: { user: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  res.status(200).json({
    success: true,
    data: { totalJobs: totalJobs._count || 0, totalRevenue: totalJobs._sum.totalCost || 0, jobsByType, jobsByStatus, recentJobs },
  });
});
