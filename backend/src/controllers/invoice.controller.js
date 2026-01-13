import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// Helper function to generate invoice number
const generateInvoiceNumber = async () => {
  const prefix = 'INV';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  // Get count of invoices today
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));
  
  const count = await prisma.invoice.count({
    where: {
      invoiceDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });
  
  const sequence = (count + 1).toString().padStart(3, '0');
  return `${prefix}${year}${month}${day}${sequence}`;
};

// @desc    Generate invoice from completed job
// @route   POST /api/invoices
// @access  Private (requires 'jobs:viewAll' permission or job ownership)
export const generateInvoice = asyncHandler(async (req, res) => {
  const { jobId, notes } = req.body;

  if (!jobId) {
    throw new AppError('Please provide job ID', 400, 'VALIDATION_ERROR');
  }

  const job = await prisma.job.findUnique({
    where: { id: parseInt(jobId) },
    include: {
      materials: true,
      invoice: true,
      user: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
      },
    },
  });

  if (!job) {
    throw new AppError('Job not found', 404, 'NOT_FOUND');
  }

  // Check if user can access this job
  const isAdmin = req.user.role === 'admin';
  const isOwner = job.assignedTo === req.user.id;
  
  if (!isAdmin && !isOwner) {
    throw new AppError(
      'Not authorized to invoice this job',
      403,
      'PERMISSION_DENIED'
    );
  }

  // Job must be completed
  if (job.status !== 'completed') {
    throw new AppError(
      'Job must be completed before invoicing',
      400,
      'INVALID_OPERATION'
    );
  }

  // Check if already invoiced
  if (job.invoice) {
    throw new AppError(
      'Job is already invoiced',
      400,
      'DUPLICATE_ENTRY'
    );
  }

  // Calculate costs
  const materialsCost = job.materials.reduce(
    (sum, m) => sum + parseFloat(m.subtotal),
    0
  );
  const labourCost = parseFloat(job.labourCost);
  const totalAmount = materialsCost + labourCost;

  // Create invoice in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // 2. Create invoice
    const invoice = await tx.invoice.create({
      data: {
        jobId: parseInt(jobId),
        invoiceNumber,
        materialsCost,
        labourCost,
        totalAmount,
        amountPaid: 0,
        amountDue: totalAmount,
        paymentStatus: 'unpaid',
        notes: notes?.trim(),
      },
    });

    // 3. Update job status to invoiced
    await tx.job.update({
      where: { id: parseInt(jobId) },
      data: { status: 'invoiced' },
    });

    // 4. Deduct inventory materials (materials used in completed job)
    for (const material of job.materials) {
      if (!material.isExternal && material.materialId) {
        await tx.material.update({
          where: { id: material.materialId },
          data: {
            quantity: {
              decrement: material.quantity,
            },
          },
        });
      }
    }

    // 5. Log audit
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE',
        entity: 'Invoice',
        entityId: invoice.id,
        description: `Generated invoice ${invoiceNumber} for job #${jobId}. Total: GH₵${totalAmount}`,
      },
    });

    return invoice;
  });

  // Fetch complete invoice
  const completeInvoice = await prisma.invoice.findUnique({
    where: { id: result.id },
    include: {
      job: {
        include: {
          materials: true,
          user: {
            select: {
              fullName: true,
              username: true,
            },
          },
        },
      },
      payments: true,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Invoice generated successfully',
    data: completeInvoice,
  });
});

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private (requires appropriate permission)
export const getInvoices = asyncHandler(async (req, res) => {
  const { paymentStatus, startDate, endDate, jobType } = req.query;

  const where = {};

  // Filter by payment status
  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

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

  // Filter by job type
  if (jobType) {
    where.job = { jobType };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      job: {
        select: {
          id: true,
          jobType: true,
          clientName: true,
          clientPhone: true,
          vehicleRegNumber: true,
          assignedTo: true,
          user: {
            select: {
              fullName: true,
              username: true,
            },
          },
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          paymentMethod: true,
        },
      },
    },
    orderBy: { invoiceDate: 'desc' },
  });

  res.status(200).json({
    success: true,
    count: invoices.length,
    data: invoices,
  });
});

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoice = asyncHandler(async (req, res) => {
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
                  name: true,
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
        },
      },
      payments: {
        include: {
          user: {
            select: {
              fullName: true,
              username: true,
            },
          },
          receipt: {
            select: {
              receiptNumber: true,
              issuedDate: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
      },
    },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: invoice,
  });
});

// @desc    Get invoice by invoice number
// @route   GET /api/invoices/number/:invoiceNumber
// @access  Private
export const getInvoiceByNumber = asyncHandler(async (req, res) => {
  const { invoiceNumber } = req.params;

  const invoice = await prisma.invoice.findUnique({
    where: { invoiceNumber },
    include: {
      job: {
        include: {
          materials: true,
          user: {
            select: {
              fullName: true,
              username: true,
            },
          },
        },
      },
      payments: {
        include: {
          user: {
            select: {
              fullName: true,
            },
          },
          receipt: true,
        },
        orderBy: { paymentDate: 'desc' },
      },
    },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: invoice,
  });
});

// @desc    Get unpaid/partial invoices
// @route   GET /api/invoices/outstanding
// @access  Private
export const getOutstandingInvoices = asyncHandler(async (req, res) => {
  const invoices = await prisma.invoice.findMany({
    where: {
      paymentStatus: {
        in: ['unpaid', 'partial'],
      },
    },
    include: {
      job: {
        select: {
          id: true,
          jobType: true,
          clientName: true,
          clientPhone: true,
          vehicleRegNumber: true,
          user: {
            select: {
              fullName: true,
            },
          },
        },
      },
      payments: {
        select: {
          amount: true,
          paymentDate: true,
        },
        orderBy: { paymentDate: 'desc' },
        take: 1,
      },
    },
    orderBy: { invoiceDate: 'asc' },
  });

  // Calculate total outstanding
  const totalOutstanding = invoices.reduce(
    (sum, inv) => sum + parseFloat(inv.amountDue),
    0
  );

  res.status(200).json({
    success: true,
    count: invoices.length,
    totalOutstanding,
    data: invoices,
  });
});

// @desc    Update invoice notes
// @route   PUT /api/invoices/:id
// @access  Private (admin only)
export const updateInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  const invoice = await prisma.invoice.findUnique({
    where: { id: parseInt(id) },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'NOT_FOUND');
  }

  // Only allow updating notes (not financial data)
  const updatedInvoice = await prisma.invoice.update({
    where: { id: parseInt(id) },
    data: {
      notes: notes?.trim(),
    },
    include: {
      job: {
        select: {
          clientName: true,
          jobType: true,
        },
      },
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'Invoice',
      entityId: updatedInvoice.id,
      description: `Updated invoice ${updatedInvoice.invoiceNumber} notes`,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Invoice updated successfully',
    data: updatedInvoice,
  });
});

// @desc    Get invoice statistics
// @route   GET /api/invoices/stats
// @access  Private
export const getInvoiceStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

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

  const [totalInvoices, invoicesByStatus, recentInvoices] = await Promise.all([
    // Total invoices and amounts
    prisma.invoice.aggregate({
      where,
      _sum: {
        totalAmount: true,
        amountPaid: true,
        amountDue: true,
      },
      _count: true,
    }),

    // Invoices by payment status
    prisma.invoice.groupBy({
      by: ['paymentStatus'],
      where,
      _sum: {
        totalAmount: true,
        amountDue: true,
      },
      _count: true,
    }),

    // Recent invoices
    prisma.invoice.findMany({
      where,
      include: {
        job: {
          select: {
            clientName: true,
            jobType: true,
          },
        },
      },
      orderBy: { invoiceDate: 'desc' },
      take: 10,
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalInvoices: totalInvoices._count || 0,
      totalAmount: totalInvoices._sum.totalAmount || 0,
      totalPaid: totalInvoices._sum.amountPaid || 0,
      totalOutstanding: totalInvoices._sum.amountDue || 0,
      invoicesByStatus,
      recentInvoices,
    },
  });
});