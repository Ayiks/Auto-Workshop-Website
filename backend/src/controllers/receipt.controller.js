import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get all receipts
// @route   GET /api/receipts
// @access  Private
export const getReceipts = asyncHandler(async (req, res) => {
  const { receiptType, startDate, endDate, paymentMethod } = req.query;

  const where = {};

  // Filter by receipt type
  if (receiptType) {
    where.receiptType = receiptType;
  }

  // Filter by payment method
  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  // Date filtering
  if (startDate || endDate) {
    where.issuedDate = {};
    if (startDate) where.issuedDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.issuedDate.lte = end;
    }
  }

  const receipts = await prisma.receipt.findMany({
    where,
    include: {
      user: {
        select: {
          fullName: true,
          username: true,
        },
      },
      sale: {
        select: {
          id: true,
          totalAmount: true,
          saleDate: true,
        },
      },
      payment: {
        select: {
          id: true,
          amount: true,
          invoice: {
            select: {
              invoiceNumber: true,
              job: {
                select: {
                  clientName: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { issuedDate: 'desc' },
  });

  res.status(200).json({
    success: true,
    count: receipts.length,
    data: receipts,
  });
});

// @desc    Get single receipt
// @route   GET /api/receipts/:id
// @access  Private
export const getReceipt = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const receipt = await prisma.receipt.findUnique({
    where: { id: parseInt(id) },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
        },
      },
      sale: {
        include: {
          items: {
            include: {
              material: {
                select: { name: true },
              },
              service: {
                select: { type: true },
              },
            },
          },
        },
      },
      payment: {
        include: {
          invoice: {
            include: {
              job: {
                select: {
                  id: true,
                  jobType: true,
                  clientName: true,
                  clientPhone: true,
                  clientEmail: true,
                  vehicleMake: true,
                  vehicleModel: true,
                  vehicleRegNumber: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!receipt) {
    throw new AppError('Receipt not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: receipt,
  });
});

// @desc    Get receipt by receipt number
// @route   GET /api/receipts/number/:receiptNumber
// @access  Private
export const getReceiptByNumber = asyncHandler(async (req, res) => {
  const { receiptNumber } = req.params;

  const receipt = await prisma.receipt.findUnique({
    where: { receiptNumber },
    include: {
      user: {
        select: {
          fullName: true,
          username: true,
        },
      },
      sale: {
        include: {
          items: true,
        },
      },
      payment: {
        include: {
          invoice: {
            include: {
              job: {
                select: {
                  clientName: true,
                  clientPhone: true,
                  vehicleRegNumber: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!receipt) {
    throw new AppError('Receipt not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: receipt,
  });
});

// @desc    Get receipts for a sale
// @route   GET /api/receipts/sale/:saleId
// @access  Private
export const getSaleReceipt = asyncHandler(async (req, res) => {
  const { saleId } = req.params;

  const receipt = await prisma.receipt.findUnique({
    where: { saleId: parseInt(saleId) },
    include: {
      user: {
        select: {
          fullName: true,
          username: true,
        },
      },
      sale: {
        include: {
          items: {
            include: {
              material: {
                select: { name: true },
              },
              service: {
                select: { type: true },
              },
            },
          },
        },
      },
    },
  });

  if (!receipt) {
    throw new AppError('Receipt not found for this sale', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: receipt,
  });
});

// @desc    Get receipts for a payment
// @route   GET /api/receipts/payment/:paymentId
// @access  Private
export const getPaymentReceipt = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  const receipt = await prisma.receipt.findUnique({
    where: { paymentId: parseInt(paymentId) },
    include: {
      user: {
        select: {
          fullName: true,
          username: true,
        },
      },
      payment: {
        include: {
          invoice: {
            include: {
              job: {
                select: {
                  clientName: true,
                  clientPhone: true,
                  vehicleRegNumber: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!receipt) {
    throw new AppError('Receipt not found for this payment', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: receipt,
  });
});

// @desc    Get receipt statistics
// @route   GET /api/receipts/stats
// @access  Private
export const getReceiptStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = {};

  // Date filtering
  if (startDate || endDate) {
    where.issuedDate = {};
    if (startDate) where.issuedDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.issuedDate.lte = end;
    }
  }

  const [totalReceipts, receiptsByType, receiptsByMethod] = await Promise.all([
    // Total receipts and amount
    prisma.receipt.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    }),

    // Receipts by type
    prisma.receipt.groupBy({
      by: ['receiptType'],
      where,
      _sum: { amount: true },
      _count: true,
    }),

    // Receipts by payment method
    prisma.receipt.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalReceipts: totalReceipts._count || 0,
      totalAmount: totalReceipts._sum.amount || 0,
      receiptsByType,
      receiptsByMethod,
    },
  });
});