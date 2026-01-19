import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// Helper function to generate receipt number - now uses database sequence
const generateReceiptNumber = () => {
  const prefix = 'RCP';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  // Return template - Prisma will handle the sequence ID generation
  // Format: RCPYYMMDDXXXXXXX (sequence handled by DB)
  return `${prefix}${year}${month}${day}`;
};

// @desc    Record payment against invoice
// @route   POST /api/payments
// @access  Private (requires 'sales:create' or admin)
export const recordPayment = asyncHandler(async (req, res) => {
  const { invoiceId, amount, paymentMethod = 'cash', notes } = req.body;

  // Validation
  if (!invoiceId || !amount) {
    throw new AppError(
      'Please provide invoice ID and payment amount',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (amount <= 0) {
    throw new AppError(
      'Payment amount must be greater than 0',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (!['cash', 'momo', 'cheque'].includes(paymentMethod)) {
    throw new AppError(
      'Invalid payment method. Must be cash, momo, or cheque',
      400,
      'VALIDATION_ERROR'
    );
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: parseInt(invoiceId) },
    include: {
      job: {
        select: {
          id: true,
          clientName: true,
          jobType: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'NOT_FOUND');
  }

  // Check if invoice is already fully paid
  if (invoice.paymentStatus === 'paid') {
    throw new AppError(
      'Invoice is already fully paid',
      400,
      'INVALID_OPERATION'
    );
  }

  // Check if payment amount exceeds outstanding balance
  const amountDue = parseFloat(invoice.amountDue);
  const paymentAmount = parseFloat(amount);

  if (paymentAmount > amountDue) {
    throw new AppError(
      `Payment amount (GH₵${paymentAmount}) exceeds outstanding balance (GH₵${amountDue})`,
      400,
      'INVALID_AMOUNT'
    );
  }

  // Process payment in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create payment record
    const payment = await tx.payment.create({
      data: {
        invoiceId: parseInt(invoiceId),
        amount: paymentAmount,
        paymentMethod,
        receivedBy: req.user.id,
        notes: notes?.trim(),
      },
    });

    // 2. Calculate new invoice totals
    const newAmountPaid = parseFloat(invoice.amountPaid) + paymentAmount;
    const newAmountDue = parseFloat(invoice.totalAmount) - newAmountPaid;
    
    // Determine new payment status
    let newPaymentStatus;
    if (newAmountDue <= 0.01) { // Account for floating point precision
      newPaymentStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newPaymentStatus = 'partial';
    } else {
      newPaymentStatus = 'unpaid';
    }

    // 3. Update invoice
    const updatedInvoice = await tx.invoice.update({
      where: { id: parseInt(invoiceId) },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue > 0 ? newAmountDue : 0,
        paymentStatus: newPaymentStatus,
        fullyPaidDate: newPaymentStatus === 'paid' ? new Date() : null,
      },
    });

    // 4. Get business settings for receipt
    const businessSettings = await tx.businessSettings.findFirst();
    if (!businessSettings) {
      throw new AppError('Business settings not configured', 500, 'CONFIG_ERROR');
    }

    // 5. Generate receipt number
    const baseNumber = generateReceiptNumber();
    const seqId = await tx.receipt.count() + 1000; // Get next sequence
    const receiptNumber = `${baseNumber}${seqId.toString().slice(-6)}`;
    
    const receipt = await tx.receipt.create({
      data: {
        receiptNumber,
        receiptType: 'payment',
        paymentId: payment.id,
        amount: paymentAmount,
        paymentMethod,
        issuedBy: req.user.id,
        businessName: businessSettings.name,
        businessLogo: businessSettings.logo,
        businessAddress: businessSettings.address,
        businessContact: businessSettings.phone,
      },
    });

    // 6. Log audit
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE',
        entity: 'Payment',
        entityId: payment.id,
        description: `Recorded payment of GH₵${paymentAmount} for invoice ${invoice.invoiceNumber}. Status: ${newPaymentStatus}`,
      },
    });

    return { payment, receipt, updatedInvoice };
  });

  // Fetch complete payment with relations
  const completePayment = await prisma.payment.findUnique({
    where: { id: result.payment.id },
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          totalAmount: true,
          amountPaid: true,
          amountDue: true,
          paymentStatus: true,
          job: {
            select: {
              clientName: true,
              jobType: true,
            },
          },
        },
      },
      user: {
        select: {
          fullName: true,
          username: true,
        },
      },
      receipt: true,
    },
  });

  res.status(201).json({
    success: true,
    message: result.updatedInvoice.paymentStatus === 'paid' 
      ? 'Payment recorded. Invoice fully paid!' 
      : 'Partial payment recorded successfully',
    data: {
      payment: completePayment,
      receipt: result.receipt,
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: result.updatedInvoice.totalAmount,
        amountPaid: result.updatedInvoice.amountPaid,
        amountDue: result.updatedInvoice.amountDue,
        paymentStatus: result.updatedInvoice.paymentStatus,
      },
    },
  });
});

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
export const getPayments = asyncHandler(async (req, res) => {
  const { invoiceId, startDate, endDate, paymentMethod } = req.query;

  const where = {};

  // Filter by invoice
  if (invoiceId) {
    where.invoiceId = parseInt(invoiceId);
  }

  // Date filtering
  if (startDate || endDate) {
    where.paymentDate = {};
    if (startDate) where.paymentDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.paymentDate.lte = end;
    }
  }

  // Filter by payment method
  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          totalAmount: true,
          paymentStatus: true,
          job: {
            select: {
              clientName: true,
              jobType: true,
            },
          },
        },
      },
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
  });

  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments,
  });
});

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
export const getPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id: parseInt(id) },
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
          payments: {
            select: {
              id: true,
              amount: true,
              paymentDate: true,
              paymentMethod: true,
            },
            orderBy: { paymentDate: 'desc' },
          },
        },
      },
      user: {
        select: {
          fullName: true,
          username: true,
          email: true,
          phone: true,
        },
      },
      receipt: true,
    },
  });

  if (!payment) {
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: payment,
  });
});

// @desc    Get payment history for an invoice
// @route   GET /api/payments/invoice/:invoiceId
// @access  Private
export const getInvoicePayments = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: parseInt(invoiceId) },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
      paymentStatus: true,
    },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'NOT_FOUND');
  }

  const payments = await prisma.payment.findMany({
    where: { invoiceId: parseInt(invoiceId) },
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
  });

  res.status(200).json({
    success: true,
    invoice,
    payments: {
      count: payments.length,
      data: payments,
    },
  });
});

// @desc    Get payment statistics
// @route   GET /api/payments/stats
// @access  Private
export const getPaymentStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = {};

  // Date filtering
  if (startDate || endDate) {
    where.paymentDate = {};
    if (startDate) where.paymentDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.paymentDate.lte = end;
    }
  }

  const [totalPayments, paymentsByMethod, recentPayments] = await Promise.all([
    // Total payments and amount
    prisma.payment.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    }),

    // Payments by method
    prisma.payment.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { amount: true },
      _count: true,
    }),

    // Recent payments
    prisma.payment.findMany({
      where,
      include: {
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
        user: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
      take: 10,
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalPayments: totalPayments._count || 0,
      totalAmount: totalPayments._sum.amount || 0,
      paymentsByMethod,
      recentPayments,
    },
  });
});