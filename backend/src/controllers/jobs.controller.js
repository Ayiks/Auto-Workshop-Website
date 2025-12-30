import { prisma } from '../server.js';
import { AppError } from '../middleware/errorHandler.js';

// @desc    Create new job
// @route   POST /api/jobs
// @access  Private (Admin, Mechanic)
export const createJob = async (req, res, next) => {
  try {
    const {
      clientName,
      clientPhone,
      clientEmail,
      carMake,
      carModel,
      carRegNumber,
      problemDescription,
      materials,
    } = req.body;

    // Validate required fields
    if (!clientName || !problemDescription) {
      throw new AppError('Client name and problem description are required', 400, 'VALIDATION_ERROR');
    }

    // Process materials - can be from inventory or manual
    const processedMaterials = [];
    
    if (materials && materials.length > 0) {
      for (const mat of materials) {
        if (mat.materialId) {
          // Material from inventory
          const inventoryMaterial = await prisma.material.findUnique({
            where: { id: parseInt(mat.materialId) },
          });

          if (!inventoryMaterial) {
            throw new AppError(`Material with ID ${mat.materialId} not found`, 404, 'RESOURCE_NOT_FOUND');
          }

          processedMaterials.push({
            materialId: inventoryMaterial.id,
            materialName: inventoryMaterial.name,
            quantity: parseInt(mat.quantity),
            unitPrice: parseFloat(inventoryMaterial.sellingPrice),
            costPrice: parseFloat(inventoryMaterial.costPrice),
            subtotal: parseFloat(inventoryMaterial.sellingPrice) * parseInt(mat.quantity),
            isPurchased: false,
          });
        } else {
          // Manual material entry
          if (!mat.materialName || !mat.quantity || !mat.unitPrice) {
            throw new AppError('Material name, quantity, and unit price are required for manual entries', 400, 'VALIDATION_ERROR');
          }

          processedMaterials.push({
            materialId: null,
            materialName: mat.materialName.trim(),
            quantity: parseInt(mat.quantity),
            unitPrice: parseFloat(mat.unitPrice),
            costPrice: mat.costPrice ? parseFloat(mat.costPrice) : parseFloat(mat.unitPrice) * 0.7, // Estimate 30% profit if not provided
            subtotal: parseFloat(mat.unitPrice) * parseInt(mat.quantity),
            isPurchased: false,
          });
        }
      }
    }

    // Create job with materials
    const job = await prisma.job.create({
      data: {
        clientName: clientName.trim(),
        clientPhone: clientPhone?.trim(),
        clientEmail: clientEmail?.trim(),
        carMake: carMake?.trim(),
        carModel: carModel?.trim(),
        carRegNumber: carRegNumber?.trim(),
        problemDescription: problemDescription.trim(),
        mechanicId: req.user.id,
        status: 'pending',
        materials: processedMaterials.length > 0 ? {
          create: processedMaterials,
        } : undefined,
      },
      include: {
        materials: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                quantity: true,
              },
            },
          },
        },
        mechanic: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      job,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Private (Admin, Mechanic)
export const getAllJobs = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const where = {};

    // Mechanics can only see their own jobs
    if (req.user.role === 'mechanic') {
      where.mechanicId = req.user.id;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          mechanic: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
          materials: true,
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
            },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      jobs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Private (Admin, Mechanic - own jobs only)
export const getJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id: parseInt(id) },
      include: {
        mechanic: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        materials: true,
        invoice: {
          include: {
            createdBy: {
              select: {
                id: true,
                username: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      throw new AppError('Job not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Mechanics can only view their own jobs
    if (req.user.role === 'mechanic' && job.mechanicId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    res.json({
      success: true,
      job,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (Admin, Mechanic - own jobs only)
export const updateJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, problemDescription, carMake, carModel, carRegNumber } = req.body;

    // Check if job exists
    const existingJob = await prisma.job.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingJob) {
      throw new AppError('Job not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Mechanics can only update their own jobs
    if (req.user.role === 'mechanic' && existingJob.mechanicId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Build update data
    const updateData = {};
    if (status) updateData.status = status;
    if (problemDescription) updateData.problemDescription = problemDescription.trim();
    if (carMake !== undefined) updateData.carMake = carMake?.trim();
    if (carModel !== undefined) updateData.carModel = carModel?.trim();
    if (carRegNumber !== undefined) updateData.carRegNumber = carRegNumber?.trim();

    const job = await prisma.job.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        mechanic: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        materials: true,
      },
    });

    res.json({
      success: true,
      message: 'Job updated successfully',
      job,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add materials to job
// @route   POST /api/jobs/:id/materials
// @access  Private (Admin, Mechanic - own jobs only)
export const addJobMaterials = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { materials } = req.body;

    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      throw new AppError('Materials array is required', 400, 'VALIDATION_ERROR');
    }

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: parseInt(id) },
    });

    if (!job) {
      throw new AppError('Job not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Mechanics can only update their own jobs
    if (req.user.role === 'mechanic' && job.mechanicId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Process materials
    const processedMaterials = [];
    
    for (const mat of materials) {
      if (mat.materialId) {
        // Material from inventory
        const inventoryMaterial = await prisma.material.findUnique({
          where: { id: parseInt(mat.materialId) },
        });

        if (!inventoryMaterial) {
          throw new AppError(`Material with ID ${mat.materialId} not found`, 404, 'RESOURCE_NOT_FOUND');
        }

        processedMaterials.push({
          jobId: parseInt(id),
          materialId: inventoryMaterial.id,
          materialName: inventoryMaterial.name,
          quantity: parseInt(mat.quantity),
          unitPrice: parseFloat(inventoryMaterial.sellingPrice),
          costPrice: parseFloat(inventoryMaterial.costPrice),
          subtotal: parseFloat(inventoryMaterial.sellingPrice) * parseInt(mat.quantity),
          isPurchased: mat.isPurchased || false,
        });
      } else {
        // Manual material entry
        if (!mat.materialName || !mat.quantity || !mat.unitPrice) {
          throw new AppError('Material name, quantity, and unit price are required for manual entries', 400, 'VALIDATION_ERROR');
        }

        processedMaterials.push({
          jobId: parseInt(id),
          materialId: null,
          materialName: mat.materialName.trim(),
          quantity: parseInt(mat.quantity),
          unitPrice: parseFloat(mat.unitPrice),
          costPrice: mat.costPrice ? parseFloat(mat.costPrice) : parseFloat(mat.unitPrice) * 0.7,
          subtotal: parseFloat(mat.unitPrice) * parseInt(mat.quantity),
          isPurchased: mat.isPurchased || false,
        });
      }
    }

    // Add materials
    await prisma.jobMaterial.createMany({
      data: processedMaterials,
    });

    // Get updated job
    const updatedJob = await prisma.job.findUnique({
      where: { id: parseInt(id) },
      include: {
        materials: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Materials added successfully',
      job: updatedJob,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update job material
// @route   PUT /api/jobs/:jobId/materials/:materialId
// @access  Private (Admin, Mechanic - own jobs only)
export const updateJobMaterial = async (req, res, next) => {
  try {
    const { jobId, materialId } = req.params;
    const { isPurchased, estimatedCost } = req.body;

    // Check if material exists and belongs to job
    const material = await prisma.jobMaterial.findFirst({
      where: {
        id: parseInt(materialId),
        jobId: parseInt(jobId),
      },
      include: {
        job: true,
      },
    });

    if (!material) {
      throw new AppError('Material not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Check access
    if (req.user.role === 'mechanic' && material.job.mechanicId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Update material
    const updateData = {};
    if (isPurchased !== undefined) updateData.isPurchased = isPurchased;
    if (estimatedCost !== undefined) updateData.estimatedCost = parseFloat(estimatedCost);

    const updatedMaterial = await prisma.jobMaterial.update({
      where: { id: parseInt(materialId) },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Material updated successfully',
      material: updatedMaterial,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete job material
// @route   DELETE /api/jobs/:jobId/materials/:materialId
// @access  Private (Admin, Mechanic - own jobs only)
export const deleteJobMaterial = async (req, res, next) => {
  try {
    const { jobId, materialId } = req.params;

    // Check if material exists
    const material = await prisma.jobMaterial.findFirst({
      where: {
        id: parseInt(materialId),
        jobId: parseInt(jobId),
      },
      include: {
        job: true,
      },
    });

    if (!material) {
      throw new AppError('Material not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Check access
    if (req.user.role === 'mechanic' && material.job.mechanicId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    await prisma.jobMaterial.delete({
      where: { id: parseInt(materialId) },
    });

    res.json({
      success: true,
      message: 'Material deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};