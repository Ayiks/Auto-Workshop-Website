import { prisma } from '../server.js';
import { AppError } from '../middleware/errorHandler.js';

// Generate unique invoice number
const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `INV-${year}${month}${day}-${random}`;
};

// @desc    Create invoice from job
// @route   POST /api/invoices
// @access  Private (Admin, Mechanic)
export const createInvoice = async (req, res, next) => {
  try {
    const { jobId, labourCost, paymentMethod = 'cash', notes } = req.body;

    // Validate
    if (!jobId) {
      throw new AppError('Job ID is required', 400, 'VALIDATION_ERROR');
    }

    if (labourCost === undefined || labourCost < 0) {
      throw new AppError('Valid labour cost is required', 400, 'VALIDATION_ERROR');
    }

    if (!['cash', 'momo', 'cheque'].includes(paymentMethod)) {
      throw new AppError('Invalid payment method', 400, 'VALIDATION_ERROR');
    }

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: parseInt(jobId) },
      include: {
        materials: {
          include: {
            material: true, // Include full material details for stock check
          },
        },
        invoice: true,
      },
    });

    if (!job) {
      throw new AppError('Job not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Check if invoice already exists
    if (job.invoice) {
      throw new AppError('Invoice already exists for this job', 400, 'INVOICE_EXISTS');
    }

    // Mechanics can only invoice their own jobs
    if (req.user.role === 'mechanic' && job.mechanicId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Calculate materials cost and profit
    const materialsCost = job.materials.reduce(
      (sum, m) => sum + parseFloat(m.subtotal),
      0
    );

    const materialsProfit = job.materials.reduce(
      (sum, m) => sum + ((parseFloat(m.unitPrice) - parseFloat(m.costPrice)) * m.quantity),
      0
    );

    // Labour is 100% profit
    const totalAmount = materialsCost + parseFloat(labourCost);
    const totalProfit = materialsProfit + parseFloat(labourCost);

    // Generate unique invoice number
    let invoiceNumber;
    let attempts = 0;
    while (attempts < 5) {
      invoiceNumber = generateInvoiceNumber();
      const existing = await prisma.invoice.findUnique({
        where: { invoiceNumber },
      });
      if (!existing) break;
      attempts++;
    }

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        jobId: parseInt(jobId),
        invoiceNumber,
        materialsCost,
        materialsProfit,
        labourCost: parseFloat(labourCost),
        totalAmount,
        totalProfit,
        paymentMethod,
        paymentStatus: 'unpaid',
        createdById: req.user.id,
        notes: notes?.trim(),
      },
      include: {
        job: {
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
        },
        createdBy: {
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
      message: 'Invoice created successfully',
      invoice,
    });
  } catch (error) {
    console.log('Error creating invoice:', error);
    next(error);
  }
};

// @desc    Check inventory availability before payment
// @route   POST /api/invoices/:id/check-inventory
// @access  Private (Admin, Mechanic)
export const checkInventoryAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: {
        job: {
          include: {
            materials: {
              include: {
                material: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Check stock for inventory materials only
    const insufficientStock = [];
    const availableMaterials = [];

    for (const jobMaterial of invoice.job.materials) {
      // Only check materials from inventory (materialId not null)
      if (jobMaterial.materialId && jobMaterial.material) {
        const currentStock = jobMaterial.material.quantity;
        const requiredQty = jobMaterial.quantity;

        if (currentStock < requiredQty) {
          insufficientStock.push({
            materialId: jobMaterial.materialId,
            materialName: jobMaterial.materialName,
            required: requiredQty,
            available: currentStock,
            shortage: requiredQty - currentStock,
          });
        } else {
          availableMaterials.push({
            materialId: jobMaterial.materialId,
            materialName: jobMaterial.materialName,
            required: requiredQty,
            available: currentStock,
          });
        }
      }
    }

    res.json({
      success: true,
      canProceed: insufficientStock.length === 0,
      insufficientStock,
      availableMaterials,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice payment status
// @route   PUT /api/invoices/:id/payment
// @access  Private (Admin, Mechanic)
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentMethod, forcePayment = false } = req.body;

    // Check if invoice exists
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: {
        job: {
          include: {
            materials: {
              include: {
                material: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Mechanics can only update invoices for their jobs
    if (req.user.role === 'mechanic' && invoice.job.mechanicId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Prevent marking as unpaid once paid (data integrity)
    if (invoice.paymentStatus === 'paid' && paymentStatus === 'unpaid') {
      throw new AppError(
        'Cannot mark invoice as unpaid once payment is recorded. Contact admin for corrections.',
        400,
        'PAYMENT_LOCKED'
      );
    }

    // Validate payment status
    if (paymentStatus && !['paid', 'unpaid'].includes(paymentStatus)) {
      throw new AppError('Invalid payment status', 400, 'VALIDATION_ERROR');
    }

    // Validate payment method
    if (paymentMethod && !['cash', 'momo', 'cheque'].includes(paymentMethod)) {
      throw new AppError('Invalid payment method', 400, 'VALIDATION_ERROR');
    }

    // If marking as paid, check inventory and create sale
    if (paymentStatus === 'paid' && invoice.paymentStatus === 'unpaid') {
      // Check inventory availability for materials from our shop
      const insufficientStock = [];
      
      for (const jobMaterial of invoice.job.materials) {
        if (jobMaterial.materialId && jobMaterial.material) {
          const currentStock = jobMaterial.material.quantity;
          const requiredQty = jobMaterial.quantity;

          if (currentStock < requiredQty) {
            insufficientStock.push({
              materialName: jobMaterial.materialName,
              required: requiredQty,
              available: currentStock,
              shortage: requiredQty - currentStock,
            });
          }
        }
      }

      // Block payment if insufficient stock (unless force override by admin)
      if (insufficientStock.length > 0 && !forcePayment) {
        if (req.user.role !== 'admin') {
          throw new AppError(
            'Insufficient stock for some materials. Contact admin.',
            400,
            'INSUFFICIENT_STOCK',
            { insufficientStock }
          );
        } else {
          // Admin can force, but we still return warning
          return res.json({
            success: false,
            requiresConfirmation: true,
            message: 'Insufficient stock detected. Confirm to proceed anyway.',
            insufficientStock,
          });
        }
      }

      // All checks passed - process payment
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update invoice payment status
        const updatedInvoice = await tx.invoice.update({
          where: { id: parseInt(id) },
          data: {
            paymentStatus: 'paid',
            paidDate: new Date(),
            ...(paymentMethod && { paymentMethod }),
          },
        });

        // 2. Update job status to 'invoiced'
        await tx.job.update({
          where: { id: updatedInvoice.jobId },
          data: { status: 'invoiced' },
        });

        // 3. Prepare sale items (only inventory materials + labour)
        const saleItems = [];
        let totalSaleAmount = 0;
        let totalSaleProfit = 0;

        // Add inventory materials to sale
        for (const jobMaterial of invoice.job.materials) {
          // Only materials from our inventory (materialId not null)
          if (jobMaterial.materialId && jobMaterial.material) {
            const itemProfit = (parseFloat(jobMaterial.unitPrice) - parseFloat(jobMaterial.costPrice)) * jobMaterial.quantity;
            
            saleItems.push({
              materialId: jobMaterial.materialId,
              quantity: jobMaterial.quantity,
              unitPrice: parseFloat(jobMaterial.unitPrice),
              costPrice: parseFloat(jobMaterial.costPrice),
              subtotal: parseFloat(jobMaterial.subtotal),
              profit: itemProfit,
            });

            totalSaleAmount += parseFloat(jobMaterial.subtotal);
            totalSaleProfit += itemProfit;

            // Update inventory - deduct stock
            await tx.material.update({
              where: { id: jobMaterial.materialId },
              data: {
                quantity: {
                  decrement: jobMaterial.quantity,
                },
              },
            });
          }
        }

        // Add labour as a separate sale item (100% profit)
        // We'll create a virtual "Labour/Workmanship" material for this
        const labourCost = parseFloat(invoice.labourCost);
        if (labourCost > 0) {
          // Check if "Labour/Workmanship" material exists, create if not
          let labourMaterial = await tx.material.findFirst({
            where: { name: 'Labour/Workmanship' },
          });

          if (!labourMaterial) {
            labourMaterial = await tx.material.create({
              data: {
                name: 'Labour/Workmanship',
                costPrice: 0, // Labour has no cost
                sellingPrice: 0, // Variable pricing
                quantity: 999999, // Virtual item, infinite quantity
                lowStockLevel: 0,
                isActive: true,
                createdById: req.user.id,
              },
            });
          }

          saleItems.push({
            materialId: labourMaterial.id,
            quantity: 1,
            unitPrice: labourCost,
            costPrice: 0, // No cost for labour
            subtotal: labourCost,
            profit: labourCost, // 100% profit
          });

          totalSaleAmount += labourCost;
          totalSaleProfit += labourCost;
        }

        // 4. Create sale record
        const sale = await tx.sale.create({
          data: {
            totalAmount: totalSaleAmount,
            totalProfit: totalSaleProfit,
            paymentMethod: updatedInvoice.paymentMethod,
            soldById: req.user.id,
            items: {
              create: saleItems,
            },
          },
          include: {
            items: {
              include: {
                material: true,
              },
            },
          },
        });

        // Return updated invoice with all relations
        const finalInvoice = await tx.invoice.findUnique({
          where: { id: parseInt(id) },
          include: {
            job: {
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
            },
            createdBy: {
              select: {
                id: true,
                username: true,
                fullName: true,
              },
            },
          },
        });

        return { invoice: finalInvoice, sale };
      });

      res.json({
        success: true,
        message: 'Payment recorded successfully. Inventory and sales updated.',
        invoice: result.invoice,
        sale: result.sale,
      });
    } else {
      // Just update payment method without changing status
      const updateData = {};
      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }

      const updatedInvoice = await prisma.invoice.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          job: {
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
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: 'Invoice updated successfully',
        invoice: updatedInvoice,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private (Admin, Mechanic)
export const getAllInvoices = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, paymentStatus } = req.query;

    const where = {};

    // Date filtering
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.invoiceDate.lte = end;
      }
    }

    // Payment status filter
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    // Mechanics can only see invoices for their jobs
    if (req.user.role === 'mechanic') {
      where.job = {
        mechanicId: req.user.id,
      };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { invoiceDate: 'desc' },
        include: {
          job: {
            select: {
              id: true,
              clientName: true,
              carMake: true,
              carModel: true,
              carRegNumber: true,
              status: true,
              mechanic: {
                select: {
                  id: true,
                  username: true,
                  fullName: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      invoices,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private (Admin, Mechanic - own invoices only)
export const getInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: {
        job: {
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
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Mechanics can only view invoices for their jobs
    if (req.user.role === 'mechanic' && invoice.job.mechanicId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    res.json({
      success: true,
      invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get invoice by invoice number
// @route   GET /api/invoices/number/:invoiceNumber
// @access  Private (Admin, Mechanic)
export const getInvoiceByNumber = async (req, res, next) => {
  try {
    const { invoiceNumber } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        job: {
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
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Mechanics can only view invoices for their jobs
    if (req.user.role === 'mechanic' && invoice.job.mechanicId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    res.json({
      success: true,
      invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete invoice (Admin only, only if unpaid)
// @route   DELETE /api/invoices/:id
// @access  Private (Admin only)
export const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if invoice exists
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: { job: true },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Prevent deletion of paid invoices (data integrity)
    if (invoice.paymentStatus === 'paid') {
      throw new AppError(
        'Cannot delete paid invoices. Contact system administrator.',
        400,
        'PAYMENT_LOCKED'
      );
    }

    // Delete invoice and update job status in transaction
    await prisma.$transaction(async (tx) => {
      await tx.invoice.delete({
        where: { id: parseInt(id) },
      });

      await tx.job.update({
        where: { id: invoice.jobId },
        data: { status: 'completed' },
      });
    });

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};