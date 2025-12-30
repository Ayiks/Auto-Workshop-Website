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
        materials: true,
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

    // Create invoice and keep job status as pending (for client approval)
    const invoice = await prisma.$transaction(async (tx) => {
      const newInvoice = await tx.invoice.create({
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

      // Job status remains 'pending' until payment is made
      // Don't update status here - client needs to see and approve first

      return newInvoice;
    });

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private (Admin, Mechanic)
export const getAllInvoices = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;

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
            materials: true,
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
            materials: true,
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

// @desc    Delete invoice
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

// @desc    Update invoice payment status
// @route   PUT /api/invoices/:id/payment
// @access  Private (Admin, Mechanic)
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentMethod } = req.body;

    // Check if invoice exists
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: {
        job: true,
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Mechanics can only update invoices for their jobs
    if (req.user.role === 'mechanic' && invoice.job.mechanicId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Validate payment status
    if (paymentStatus && !['paid', 'unpaid'].includes(paymentStatus)) {
      throw new AppError('Invalid payment status', 400, 'VALIDATION_ERROR');
    }

    // Validate payment method
    if (paymentMethod && !['cash', 'momo', 'cheque'].includes(paymentMethod)) {
      throw new AppError('Invalid payment method', 400, 'VALIDATION_ERROR');
    }

    const updateData = {};
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
      if (paymentStatus === 'paid') {
        updateData.paidDate = new Date();
      }
    }
    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    }

    // Update invoice and job status in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          job: {
            include: {
              materials: true,
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

      // If marked as paid, update job status to 'invoiced'
      if (paymentStatus === 'paid') {
        await tx.job.update({
          where: { id: updatedInvoice.jobId },
          data: { status: 'invoiced' },
        });
      }

      return updatedInvoice;
    });

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      invoice: result,
    });
  } catch (error) {
    next(error);
  }
};