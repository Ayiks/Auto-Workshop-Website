import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// @desc    Create new job
// @route   POST /api/jobs
// @access  Private (requires 'jobs:create' permission)
export const createJob = asyncHandler(async (req, res) => {
  const {
    jobType,
    clientName,
    clientPhone,
    clientEmail,
    vehicleMake,
    vehicleModel,
    vehicleRegNumber,
    problemType,
    problemDescription,
    labourCost = 0,
    materials = [],
  } = req.body;

  // Validation
  if (!jobType || !['mechanic', 'sprayer', 'bodyworks'].includes(jobType)) {
    throw new AppError(
      'Invalid job type. Must be mechanic, sprayer, or bodyworks',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (!clientName || !clientPhone) {
    throw new AppError(
      'Please provide client name and phone number',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (!problemType) {
    throw new AppError(
      'Please provide problem type',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Check if user can create this job type
  if (req.allowedJobType && req.allowedJobType !== jobType) {
    throw new AppError(
      `You can only create ${req.allowedJobType} jobs`,
      403,
      'PERMISSION_DENIED'
    );
  }

  // Validate and calculate materials cost
  let materialsCost = 0;
  const validatedMaterials = [];

  for (const material of materials) {
    if (!material.materialName || !material.quantity || material.quantity <= 0) {
      throw new AppError(
        'Each material must have a name and valid quantity',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (!material.unitPrice || material.unitPrice <= 0) {
      throw new AppError(
        'Each material must have a valid unit price',
        400,
        'VALIDATION_ERROR'
      );
    }

    const isExternal = material.isExternal === true;
    let materialId = null;

    // If not external, validate inventory material
    if (!isExternal) {
      if (!material.materialId) {
        throw new AppError(
          'Inventory materials must have materialId',
          400,
          'VALIDATION_ERROR'
        );
      }

      const inventoryMaterial = await prisma.material.findUnique({
        where: { id: parseInt(material.materialId) },
      });

      if (!inventoryMaterial) {
        throw new AppError(
          `Material with ID ${material.materialId} not found`,
          404,
          'NOT_FOUND'
        );
      }

      if (!inventoryMaterial.isActive) {
        throw new AppError(
          `Material "${inventoryMaterial.name}" is inactive`,
          400,
          'INVALID_OPERATION'
        );
      }

      if (inventoryMaterial.quantity < material.quantity) {
        throw new AppError(
          `Insufficient stock for "${inventoryMaterial.name}". Available: ${inventoryMaterial.quantity}`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }

      materialId = inventoryMaterial.id;
    }

    const subtotal = parseFloat(material.unitPrice) * parseInt(material.quantity);
    validatedMaterials.push({
      materialId,
      materialName: material.materialName.trim(),
      quantity: parseInt(material.quantity),
      unitPrice: parseFloat(material.unitPrice),
      subtotal,
      isExternal,
    });
    materialsCost += subtotal;
  }

  const totalCost = materialsCost + parseFloat(labourCost);

  // Create job with materials in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create job
    const job = await tx.job.create({
      data: {
        jobType,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail?.trim(),
        vehicleMake: vehicleMake?.trim(),
        vehicleModel: vehicleModel?.trim(),
        vehicleRegNumber: vehicleRegNumber?.trim(),
        problemType: problemType.trim(),
        problemDescription: problemDescription.trim(),
        labourCost: parseFloat(labourCost),
        totalCost,
        assignedTo: req.user.id,
        status: 'pending',
      },
    });

    // 2. Add materials to job
    for (const material of validatedMaterials) {
      await tx.jobMaterial.create({
        data: {
          jobId: job.id,
          ...material,
        },
      });
    }

    // 3. Log audit
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE',
        entity: 'Job',
        entityId: job.id,
        description: `Created ${jobType} job #${job.id} for ${clientName}. Total: GH₵${totalCost}`,
      },
    });

    return job;
  });

  // Fetch complete job with materials
  const completeJob = await prisma.job.findUnique({
    where: { id: result.id },
    include: {
      materials: {
        include: {
          material: {
            select: { name: true, sellingPrice: true },
          },
        },
      },
      user: {
        select: {
          fullName: true,
          username: true,
          role: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Job created successfully',
    data: completeJob,
  });
});

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Private (requires 'jobs:viewAll' or 'jobs:viewOwn' permission)
export const getJobs = asyncHandler(async (req, res) => {
  const { status, jobType, startDate, endDate, assignedTo } = req.query;

  const where = {};

  // Filter by job type (if user is restricted to specific type)
  if (req.allowedJobType) {
    where.jobType = req.allowedJobType;
  } else if (jobType) {
    where.jobType = jobType;
  }

  // Filter by status
  if (status) {
    where.status = status;
  }

  // Date filtering
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  // Filter by assigned user
  if (assignedTo) {
    where.assignedTo = parseInt(assignedTo);
  }

  // If user only has viewOwn permission, filter to their jobs
  if (req.isOwnResource) {
    where.assignedTo = req.user.id;
  }

  const jobs = await prisma.job.findMany({
    where,
    include: {
      materials: {
        include: {
          material: {
            select: { name: true },
          },
        },
      },
      user: {
        select: {
          fullName: true,
          username: true,
          role: true,
        },
      },
      invoice: {
        select: {
          invoiceNumber: true,
          paymentStatus: true,
          amountPaid: true,
          amountDue: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    count: jobs.length,
    data: jobs,
  });
});

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Private (requires 'jobs:viewAll' or 'jobs:viewOwn' permission)
export const getJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await prisma.job.findUnique({
    where: { id: parseInt(id) },
    include: {
      materials: {
        include: {
          material: {
            select: {
              id: true,
              name: true,
              sellingPrice: true,
              quantity: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
          email: true,
          phone: true,
        },
      },
      invoice: {
        include: {
          payments: {
            include: {
              user: {
                select: {
                  fullName: true,
                },
              },
              receipt: {
                select: {
                  receiptNumber: true,
                },
              },
            },
            orderBy: { paymentDate: 'desc' },
          },
        },
      },
    },
  });

  if (!job) {
    throw new AppError('Job not found', 404, 'NOT_FOUND');
  }

  // Check ownership if user has only viewOwn permission
  if (req.isOwnResource && job.assignedTo !== req.user.id) {
    throw new AppError(
      'Not authorized to view this job',
      403,
      'PERMISSION_DENIED'
    );
  }

  // Check job type restriction
  if (req.allowedJobType && job.jobType !== req.allowedJobType) {
    throw new AppError(
      `You can only view ${req.allowedJobType} jobs`,
      403,
      'PERMISSION_DENIED'
    );
  }

  res.status(200).json({
    success: true,
    data: job,
  });
});

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (requires 'jobs:edit' or 'jobs:editOwn' permission)
export const updateJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    clientName,
    clientPhone,
    clientEmail,
    vehicleMake,
    vehicleModel,
    vehicleRegNumber,
    problemType,
    problemDescription,
    labourCost,
    materials, // Array of materials from form
    status,
  } = req.body;

  // 1. Fetch existing job to check permissions and status
  const existingJob = await prisma.job.findUnique({
    where: { id: parseInt(id) },
    include: {
      invoice: true,
    },
  });

  if (!existingJob) {
    throw new AppError('Job not found', 404, 'NOT_FOUND');
  }

  // 2. Permission Checks
  if (req.isOwnResource && existingJob.assignedTo !== req.user.id) {
    throw new AppError('Not authorized to edit this job', 403, 'PERMISSION_DENIED');
  }

  if (req.allowedJobType && existingJob.jobType !== req.allowedJobType) {
    throw new AppError(`You can only edit ${req.allowedJobType} jobs`, 403, 'PERMISSION_DENIED');
  }

  if (existingJob.invoice) {
    throw new AppError('Cannot edit job that has been invoiced', 400, 'INVALID_OPERATION');
  }

  // 3. Status Validation
  const validStatuses = ['pending', 'in_progress', 'completed', 'invoiced'];
  if (status && !validStatuses.includes(status)) {
    throw new AppError('Invalid status', 400, 'VALIDATION_ERROR');
  }

  // 4. Perform Updates inside a Transaction
  const updatedJob = await prisma.$transaction(async (tx) => {
    
    // --- A. Handle Materials Logic (If materials array is provided) ---
    let finalMaterialsCost = 0;

    // If materials are provided, we do a full sync (Remove old, Add new)
    if (materials && Array.isArray(materials)) {
      
      // i. Get current job materials to restore inventory
      const currentJobMaterials = await tx.jobMaterial.findMany({
        where: { jobId: existingJob.id },
      });

      // ii. Restore stock for existing internal materials (Return to shelf)
      for (const oldMat of currentJobMaterials) {
        if (!oldMat.isExternal && oldMat.materialId) {
          await tx.material.update({
            where: { id: oldMat.materialId },
            data: { quantity: { increment: oldMat.quantity } },
          });
        }
      }

      // iii. Delete all old job materials
      await tx.jobMaterial.deleteMany({
        where: { jobId: existingJob.id },
      });

      // iv. Process and Insert New Materials
      for (const mat of materials) {
        const quantity = parseInt(mat.quantity);
        const unitPrice = parseFloat(mat.unitPrice);
        const subtotal = quantity * unitPrice;
        const isExternal = mat.isExternal === true;
        let materialId = null;

        // Validation
        if (!mat.materialName || quantity <= 0) {
          throw new AppError('Invalid material name or quantity', 400, 'VALIDATION_ERROR');
        }

        // Handle Inventory Deduction
        if (!isExternal) {
          if (!mat.materialId) throw new AppError('Inventory item missing ID', 400, 'VALIDATION_ERROR');
          
          const inventoryItem = await tx.material.findUnique({
            where: { id: parseInt(mat.materialId) },
          });

          if (!inventoryItem || !inventoryItem.isActive) {
            throw new AppError(`Material unavailable or inactive`, 400, 'INVALID_OPERATION');
          }

          if (inventoryItem.quantity < quantity) {
            throw new AppError(
              `Insufficient stock for "${inventoryItem.name}". Available: ${inventoryItem.quantity}`, 
              400, 
              'INSUFFICIENT_STOCK'
            );
          }

          // Deduct from stock
          await tx.material.update({
            where: { id: inventoryItem.id },
            data: { quantity: { decrement: quantity } },
          });

          materialId = inventoryItem.id;
        }

        // Create new JobMaterial Record
        await tx.jobMaterial.create({
          data: {
            jobId: existingJob.id,
            materialId,
            materialName: mat.materialName,
            quantity,
            unitPrice,
            subtotal,
            isExternal,
          },
        });

        finalMaterialsCost += subtotal;
      }
    } else {
      // If materials not in body, calculate cost from existing DB records
      const existingMats = await tx.jobMaterial.findMany({ where: { jobId: existingJob.id } });
      finalMaterialsCost = existingMats.reduce((sum, m) => sum + Number(m.subtotal), 0);
    }

    // --- B. Calculate Grand Total ---
    // Use new labour cost if provided, otherwise use existing
    const finalLabourCost = labourCost !== undefined ? parseFloat(labourCost) : Number(existingJob.labourCost);
    const totalCost = finalMaterialsCost + finalLabourCost;

    // --- C. Update Job Record ---
    const jobUpdateData = {
      ...(clientName && { clientName: clientName.trim() }),
      ...(clientPhone && { clientPhone: clientPhone.trim() }),
      ...(clientEmail !== undefined && { clientEmail: clientEmail?.trim() }),
      ...(vehicleMake !== undefined && { vehicleMake: vehicleMake?.trim() }),
      ...(vehicleModel !== undefined && { vehicleModel: vehicleModel?.trim() }),
      ...(vehicleRegNumber !== undefined && { vehicleRegNumber: vehicleRegNumber?.trim() }),
      ...(problemType && { problemType: problemType.trim() }),
      ...(problemDescription && { problemDescription: problemDescription.trim() }),
      ...(status && { status }),
      labourCost: finalLabourCost,
      totalCost: totalCost,
    };

    const updated = await tx.job.update({
      where: { id: existingJob.id },
      data: jobUpdateData,
      include: {
        materials: {
          include: { material: { select: { name: true } } },
        },
        user: {
          select: { fullName: true, username: true },
        },
      },
    });

    // --- D. Audit Log ---
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'Job',
        entityId: updated.id,
        description: `Updated job #${updated.id}. Total Cost: ${totalCost}`,
      },
    });

    return updated;
  });

  res.status(200).json({
    success: true,
    message: 'Job updated successfully',
    data: updatedJob,
  });
});

// @desc    Add material to job
// @route   POST /api/jobs/:id/materials
// @access  Private (requires 'jobs:edit' or 'jobs:editOwn' permission)
export const addJobMaterial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { materialId, materialName, quantity, unitPrice, isExternal = false } = req.body;

  // Validation
  if (!materialName || !quantity || quantity <= 0 || !unitPrice || unitPrice <= 0) {
    throw new AppError(
      'Please provide material name, valid quantity, and unit price',
      400,
      'VALIDATION_ERROR'
    );
  }

  const job = await prisma.job.findUnique({
    where: { id: parseInt(id) },
    include: {
      invoice: true,
      materials: true,
    },
  });

  if (!job) {
    throw new AppError('Job not found', 404, 'NOT_FOUND');
  }

  // Check ownership
  if (req.isOwnResource && job.assignedTo !== req.user.id) {
    throw new AppError(
      'Not authorized to edit this job',
      403,
      'PERMISSION_DENIED'
    );
  }

  // Cannot add materials once invoiced
  if (job.invoice) {
    throw new AppError(
      'Cannot add materials to invoiced job',
      400,
      'INVALID_OPERATION'
    );
  }

  let validatedMaterialId = null;

  // If not external, validate inventory material
  if (!isExternal) {
    if (!materialId) {
      throw new AppError(
        'Inventory materials must have materialId',
        400,
        'VALIDATION_ERROR'
      );
    }

    const inventoryMaterial = await prisma.material.findUnique({
      where: { id: parseInt(materialId) },
    });

    if (!inventoryMaterial) {
      throw new AppError(
        `Material with ID ${materialId} not found`,
        404,
        'NOT_FOUND'
      );
    }

    if (!inventoryMaterial.isActive) {
      throw new AppError(
        `Material "${inventoryMaterial.name}" is inactive`,
        400,
        'INVALID_OPERATION'
      );
    }

    if (inventoryMaterial.quantity < quantity) {
      throw new AppError(
        `Insufficient stock for "${inventoryMaterial.name}". Available: ${inventoryMaterial.quantity}`,
        400,
        'INSUFFICIENT_STOCK'
      );
    }

    validatedMaterialId = inventoryMaterial.id;
  }

  const subtotal = parseFloat(unitPrice) * parseInt(quantity);

  // Add material and update job total in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Add material
    const jobMaterial = await tx.jobMaterial.create({
      data: {
        jobId: parseInt(id),
        materialId: validatedMaterialId,
        materialName: materialName.trim(),
        quantity: parseInt(quantity),
        unitPrice: parseFloat(unitPrice),
        subtotal,
        isExternal,
      },
    });

    // 2. Update job total cost
    const currentMaterialsCost = job.materials.reduce(
      (sum, m) => sum + parseFloat(m.subtotal),
      0
    );
    const newTotalCost = currentMaterialsCost + subtotal + parseFloat(job.labourCost);

    await tx.job.update({
      where: { id: parseInt(id) },
      data: { totalCost: newTotalCost },
    });

    // 3. Log audit
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'Job',
        entityId: parseInt(id),
        description: `Added material "${materialName}" to job #${id}`,
      },
    });

    return jobMaterial;
  });

  res.status(201).json({
    success: true,
    message: 'Material added to job successfully',
    data: result,
  });
});

// @desc    Remove material from job
// @route   DELETE /api/jobs/:id/materials/:materialId
// @access  Private (requires 'jobs:edit' or 'jobs:editOwn' permission)
export const removeJobMaterial = asyncHandler(async (req, res) => {
  const { id, materialId } = req.params;

  const job = await prisma.job.findUnique({
    where: { id: parseInt(id) },
    include: {
      invoice: true,
      materials: true,
    },
  });

  if (!job) {
    throw new AppError('Job not found', 404, 'NOT_FOUND');
  }

  // Check ownership
  if (req.isOwnResource && job.assignedTo !== req.user.id) {
    throw new AppError(
      'Not authorized to edit this job',
      403,
      'PERMISSION_DENIED'
    );
  }

  // Cannot remove materials once invoiced
  if (job.invoice) {
    throw new AppError(
      'Cannot remove materials from invoiced job',
      400,
      'INVALID_OPERATION'
    );
  }

  const jobMaterial = await prisma.jobMaterial.findUnique({
    where: { id: parseInt(materialId) },
  });

  if (!jobMaterial || jobMaterial.jobId !== parseInt(id)) {
    throw new AppError('Material not found in this job', 404, 'NOT_FOUND');
  }

  // Remove material and update job total in transaction
  await prisma.$transaction(async (tx) => {
    // 1. Delete material
    await tx.jobMaterial.delete({
      where: { id: parseInt(materialId) },
    });

    // 2. Recalculate job total cost
    const remainingMaterials = job.materials.filter(
      m => m.id !== parseInt(materialId)
    );
    const materialsCost = remainingMaterials.reduce(
      (sum, m) => sum + parseFloat(m.subtotal),
      0
    );
    const newTotalCost = materialsCost + parseFloat(job.labourCost);

    await tx.job.update({
      where: { id: parseInt(id) },
      data: { totalCost: newTotalCost },
    });

    // 3. Log audit
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'Job',
        entityId: parseInt(id),
        description: `Removed material "${jobMaterial.materialName}" from job #${id}`,
      },
    });
  });

  res.status(200).json({
    success: true,
    message: 'Material removed from job successfully',
  });
});

// @desc    Complete job (mark as ready for invoicing)
// @route   PUT /api/jobs/:id/complete
// @access  Private (requires 'jobs:edit' or 'jobs:editOwn' permission)
export const completeJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await prisma.job.findUnique({
    where: { id: parseInt(id) },
    include: {
      invoice: true,
    },
  });

  if (!job) {
    throw new AppError('Job not found', 404, 'NOT_FOUND');
  }

  // Check ownership
  if (req.isOwnResource && job.assignedTo !== req.user.id) {
    throw new AppError(
      'Not authorized to complete this job',
      403,
      'PERMISSION_DENIED'
    );
  }

  if (job.status === 'completed') {
    throw new AppError('Job is already completed', 400, 'INVALID_OPERATION');
  }

  if (job.invoice) {
    throw new AppError('Job is already invoiced', 400, 'INVALID_OPERATION');
  }

  const updatedJob = await prisma.job.update({
    where: { id: parseInt(id) },
    data: { status: 'completed' },
    include: {
      materials: true,
      user: {
        select: {
          fullName: true,
          username: true,
        },
      },
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'Job',
      entityId: updatedJob.id,
      description: `Completed job #${updatedJob.id}`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Job completed successfully. Ready for invoicing.',
    data: updatedJob,
  });
});

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private (requires 'jobs:delete' permission)
export const deleteJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await prisma.job.findUnique({
    where: { id: parseInt(id) },
    include: {
      invoice: true,
    },
  });

  if (!job) {
    throw new AppError('Job not found', 404, 'NOT_FOUND');
  }

  // Cannot delete job with invoice
  if (job.invoice) {
    throw new AppError(
      'Cannot delete job that has been invoiced',
      400,
      'INVALID_OPERATION'
    );
  }

  await prisma.$transaction(async (tx) => {
    // Delete job materials first (cascade should handle this, but explicit is safer)
    await tx.jobMaterial.deleteMany({
      where: { jobId: parseInt(id) },
    });

    // Delete job
    await tx.job.delete({
      where: { id: parseInt(id) },
    });

    // Log audit
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        entity: 'Job',
        entityId: parseInt(id),
        description: `Deleted ${job.jobType} job #${id}`,
      },
    });
  });

  res.status(200).json({
    success: true,
    message: 'Job deleted successfully',
  });
});

// @desc    Get job statistics
// @route   GET /api/jobs/stats
// @access  Private (requires 'jobs:viewAll' or 'jobs:viewOwn' permission)
export const getJobStats = asyncHandler(async (req, res) => {
  const { startDate, endDate, jobType } = req.query;

  const where = {};

  // Job type filter
  if (req.allowedJobType) {
    where.jobType = req.allowedJobType;
  } else if (jobType) {
    where.jobType = jobType;
  }

  // Date filtering
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  // If user only has viewOwn permission
  if (req.isOwnResource) {
    where.assignedTo = req.user.id;
  }

  const [totalJobs, jobsByType, jobsByStatus, recentJobs] = await Promise.all([
    // Total jobs and revenue
    prisma.job.aggregate({
      where,
      _sum: { totalCost: true },
      _count: true,
    }),

    // Jobs by type
    prisma.job.groupBy({
      by: ['jobType'],
      where,
      _sum: { totalCost: true },
      _count: true,
    }),

    // Jobs by status
    prisma.job.groupBy({
      by: ['status'],
      where,
      _count: true,
    }),

    // Recent jobs
    prisma.job.findMany({
      where,
      include: {
        user: {
          select: { fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalJobs: totalJobs._count || 0,
      totalRevenue: totalJobs._sum.totalCost || 0,
      jobsByType,
      jobsByStatus,
      recentJobs,
    },
  });
});