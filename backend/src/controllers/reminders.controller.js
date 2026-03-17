import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { sendReminderEmail } from '../utils/sendEmail.js';

// @desc    Get reminders (filterable by customerId, status, type)
// @route   GET /api/reminders
// @access  Private (admin/manager)
export const getReminders = asyncHandler(async (req, res) => {
  const { customerId, status, type, limit = 50 } = req.query;

  const where = { businessId: req.user.businessId };
  if (customerId) where.customerId = parseInt(customerId);
  if (status) where.status = status;
  if (type) where.type = type;

  const reminders = await req.db.reminder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
    include: {
      customer: { select: { firstName: true, lastName: true, phone: true } },
      job: { select: { id: true, jobType: true, problemType: true } },
    },
  });

  res.status(200).json({ success: true, count: reminders.length, data: reminders });
});

// @desc    Create a manual reminder
// @route   POST /api/reminders
// @access  Private (admin/manager)
export const createReminder = asyncHandler(async (req, res) => {
  const { customerId, jobId, type = 'manual', channel = 'email', message, scheduledFor } = req.body;

  if (!customerId) throw new AppError('customerId is required', 400, 'VALIDATION_ERROR');
  if (!scheduledFor) throw new AppError('scheduledFor is required', 400, 'VALIDATION_ERROR');

  // Verify customer belongs to this business
  const customer = await req.db.customer.findFirst({
    where: { id: parseInt(customerId), businessId: req.user.businessId, isActive: true },
  });
  if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');

  const reminder = await req.db.reminder.create({
    data: {
      businessId: req.user.businessId,
      customerId: parseInt(customerId),
      jobId: jobId ? parseInt(jobId) : null,
      type,
      channel,
      message: message || null,
      scheduledFor: new Date(scheduledFor),
    },
  });

  // Send immediately if scheduledFor is now or in the past and channel is email
  if (channel === 'email' && customer.email && new Date(scheduledFor) <= new Date()) {
    const settings = await req.db.businessSettings.findFirst({
      where: { businessId: req.user.businessId },
      select: { name: true, email: true },
    });
    sendReminderEmail(customer.email, {
      customerName: `${customer.firstName} ${customer.lastName || ''}`.trim(),
      message,
      type,
      businessName: settings?.name || 'Gray Manager',
      businessEmail: settings?.email || null,
    }).catch(() => {});

    await req.db.reminder.update({
      where: { id: reminder.id },
      data: { status: 'sent', sentAt: new Date() },
    });
  }

  res.status(201).json({ success: true, data: reminder });
});

// @desc    Update reminder status
// @route   PUT /api/reminders/:id/status
// @access  Private (admin/manager)
export const updateReminderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'sent', 'failed'].includes(status)) {
    throw new AppError('Invalid status', 400, 'VALIDATION_ERROR');
  }

  const existing = await req.db.reminder.findFirst({
    where: { id: parseInt(id), businessId: req.user.businessId },
  });
  if (!existing) throw new AppError('Reminder not found', 404, 'NOT_FOUND');

  const reminder = await req.db.reminder.update({
    where: { id: parseInt(id) },
    data: {
      status,
      sentAt: status === 'sent' ? new Date() : existing.sentAt,
    },
  });

  res.status(200).json({ success: true, data: reminder });
});

// @desc    Update a reminder (type, channel, scheduledFor, message)
// @route   PUT /api/reminders/:id
// @access  Private (admin/manager)
export const updateReminder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, channel, scheduledFor, message } = req.body;

  const existing = await req.db.reminder.findFirst({
    where: { id: parseInt(id), businessId: req.user.businessId },
  });
  if (!existing) throw new AppError('Reminder not found', 404, 'NOT_FOUND');

  const updateData = {};
  if (type !== undefined) updateData.type = type;
  if (channel !== undefined) updateData.channel = channel;
  if (message !== undefined) updateData.message = message || null;
  if (scheduledFor !== undefined) {
    const date = new Date(scheduledFor);
    updateData.scheduledFor = date;
    // Reset to pending if rescheduled to a future date
    if (date > new Date()) updateData.status = 'pending';
  }

  const reminder = await req.db.reminder.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  res.status(200).json({ success: true, data: reminder });
});

// @desc    Delete (cancel) a reminder
// @route   DELETE /api/reminders/:id
// @access  Private (admin/manager)
export const deleteReminder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await req.db.reminder.findFirst({
    where: { id: parseInt(id), businessId: req.user.businessId },
  });
  if (!existing) throw new AppError('Reminder not found', 404, 'NOT_FOUND');

  await req.db.reminder.delete({ where: { id: parseInt(id) } });

  res.status(200).json({ success: true, message: 'Reminder cancelled' });
});
