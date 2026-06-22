import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const generateQuoteNumber = async (db) => {
  const prefix = 'QUO';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const count = await db.quote.count({
    where: {
      quoteDate: { gte: startOfDay, lte: endOfDay },
    },
  });

  const sequence = (count + 1).toString().padStart(3, '0');
  return `${prefix}${year}${month}${day}${sequence}`;
};

// @desc    Create standalone quote/invoice
// @route   POST /api/quotes
// @access  Private
export const createQuote = asyncHandler(async (req, res) => {
  const {
    clientName,
    clientPhone,
    clientEmail,
    vehicleMake,
    vehicleModel,
    vehicleRegNumber,
    jobType,
    problemType,
    labourCost = 0,
    miscellaneousCost = 0,
    notes,
    items = [],
  } = req.body;

  if (!clientName?.trim()) {
    throw new AppError('Client name is required', 400, 'VALIDATION_ERROR');
  }

  const materialsCost = items.reduce((sum, item) => {
    const subtotal = parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0);
    return sum + subtotal;
  }, 0);

  const totalAmount =
    materialsCost + parseFloat(labourCost) + parseFloat(miscellaneousCost);

  const result = await req.db.$transaction(async (tx) => {
    const quoteNumber = await generateQuoteNumber(tx);

    const quote = await tx.quote.create({
      data: {
        businessId: req.user.businessId,
        quoteNumber,
        clientName: clientName.trim(),
        clientPhone: clientPhone?.trim() || null,
        clientEmail: clientEmail?.trim() || null,
        vehicleMake: vehicleMake?.trim() || null,
        vehicleModel: vehicleModel?.trim() || null,
        vehicleRegNumber: vehicleRegNumber?.trim() || null,
        jobType: jobType || null,
        problemType: problemType?.trim() || null,
        materialsCost,
        labourCost: parseFloat(labourCost),
        miscellaneousCost: parseFloat(miscellaneousCost),
        totalAmount,
        notes: notes?.trim() || null,
        items: {
          create: items.map((item) => ({
            businessId: req.user.businessId,
            materialName: item.materialName || item.name || 'Item',
            quantity: parseFloat(item.quantity || 1),
            unitPrice: parseFloat(item.unitPrice || 0),
            subtotal:
              parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0),
            isExternal: item.isExternal !== false,
          })),
        },
      },
      include: { items: true },
    });

    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE',
        entity: 'Quote',
        entityId: quote.id,
        description: `Created standalone invoice ${quoteNumber} for ${clientName}. Total: GH₵${totalAmount}`,
      },
    });

    return quote;
  });

  res.status(201).json({
    success: true,
    message: 'Invoice created successfully',
    data: result,
  });
});

// @desc    Get all quotes for the business
// @route   GET /api/quotes
// @access  Private
export const getQuotes = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const where = { businessId: req.user.businessId };

  if (search?.trim()) {
    where.OR = [
      { quoteNumber: { contains: search, mode: 'insensitive' } },
      { clientName: { contains: search, mode: 'insensitive' } },
      { clientPhone: { contains: search, mode: 'insensitive' } },
      { vehicleRegNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const quotes = await req.db.quote.findMany({
    where,
    include: {
      items: true,
      convertedJob: {
        select: { id: true, status: true },
      },
    },
    orderBy: { quoteDate: 'desc' },
  });

  res.status(200).json({
    success: true,
    count: quotes.length,
    data: quotes,
  });
});

// @desc    Get single quote
// @route   GET /api/quotes/:id
// @access  Private
export const getQuote = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const quote = await req.db.quote.findFirst({
    where: { id: parseInt(id), businessId: req.user.businessId },
    include: {
      items: true,
      convertedJob: {
        select: { id: true, status: true },
      },
    },
  });

  if (!quote) throw new AppError('Quote not found', 404, 'NOT_FOUND');

  const businessSettings = await req.db.businessSettings.findFirst({
    where: { businessId: req.user.businessId },
    select: { name: true, logo: true, address: true, phone: true, email: true },
  });

  res.status(200).json({
    success: true,
    data: { ...quote, businessSettings },
  });
});

// @desc    Update quote (notes only, before conversion)
// @route   PUT /api/quotes/:id
// @access  Private (admin)
export const updateQuote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  const quote = await req.db.quote.findFirst({
    where: { id: parseInt(id), businessId: req.user.businessId },
  });

  if (!quote) throw new AppError('Quote not found', 404, 'NOT_FOUND');
  if (quote.convertedJobId) {
    throw new AppError(
      'Cannot edit a quote that has already been converted to a job',
      400,
      'INVALID_OPERATION'
    );
  }

  const updated = await req.db.quote.update({
    where: { id: parseInt(id) },
    data: { notes: notes?.trim() || null },
  });

  res.status(200).json({ success: true, data: updated });
});

// @desc    Convert quote to a job
// @route   POST /api/quotes/:id/convert
// @access  Private
export const convertToJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const quote = await req.db.quote.findFirst({
    where: { id: parseInt(id), businessId: req.user.businessId },
    include: { items: true },
  });

  if (!quote) throw new AppError('Quote not found', 404, 'NOT_FOUND');
  if (quote.convertedJobId) {
    throw new AppError(
      'This quote has already been converted to a job',
      400,
      'DUPLICATE_ENTRY'
    );
  }

  const result = await req.db.$transaction(async (tx) => {
    // 1. Create the job
    const job = await tx.job.create({
      data: {
        businessId: req.user.businessId,
        assignedTo: req.user.id,
        jobType: quote.jobType || 'mechanic',
        clientName: quote.clientName,
        clientPhone: quote.clientPhone,
        clientEmail: quote.clientEmail,
        vehicleMake: quote.vehicleMake,
        vehicleModel: quote.vehicleModel,
        vehicleRegNumber: quote.vehicleRegNumber,
        problemType: quote.problemType || 'General',
        problemDescription: quote.notes || `Converted from quote ${quote.quoteNumber}`,
        labourCost: quote.labourCost,
        miscellaneousCost: quote.miscellaneousCost,
        totalCost: quote.totalAmount,
        status: 'pending',
        reminderTypes: [],
      },
    });

    // 2. Create job materials from quote items
    for (const item of quote.items) {
      await tx.jobMaterial.create({
        data: {
          jobId: job.id,
          businessId: req.user.businessId,
          materialName: item.materialName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          isExternal: item.isExternal,
        },
      });
    }

    // 2.5 Ensure the client exists in the customer table (deduped by phone) and
    //     link it to the job. Phone is the unique identity per business
    //     (@@unique([phone, businessId])). Mirrors createJob behaviour.
    const phone = quote.clientPhone?.trim();
    if (phone) {
      const name = (quote.clientName || '').trim();
      const customer = await tx.customer.upsert({
        where: { phone_businessId: { phone, businessId: req.user.businessId } },
        update: {
          ...(quote.clientEmail?.trim() && { email: quote.clientEmail.trim() }),
        },
        create: {
          firstName: name.split(' ')[0] || 'Customer',
          lastName: name.split(' ').slice(1).join(' ') || null,
          phone,
          email: quote.clientEmail?.trim() || null,
          businessId: req.user.businessId,
        },
      });
      await tx.job.update({ where: { id: job.id }, data: { customerId: customer.id } });
    }

    // 3. Link the quote to the new job
    await tx.quote.update({
      where: { id: quote.id },
      data: { convertedJobId: job.id },
    });

    // 4. Log audit
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE',
        entity: 'Job',
        entityId: job.id,
        description: `Converted quote ${quote.quoteNumber} into Job #${job.id}`,
      },
    });

    return job;
  });

  res.status(201).json({
    success: true,
    message: 'Quote converted to job successfully',
    data: { jobId: result.id },
  });
});
