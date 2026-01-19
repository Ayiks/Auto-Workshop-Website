import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// @desc    Create booking (from public website)
// @route   POST /api/bookings
// @access  Public (no authentication required)
export const createBooking = asyncHandler(async (req, res) => {
  const {
    bookingType,
    clientName,
    clientEmail,
    clientPhone,
    serviceType,
    preferredDate,
    preferredTime,
    message,
  } = req.body;

  // Validation
  if (!bookingType || !['booth', 'service_inquiry'].includes(bookingType)) {
    throw new AppError(
      'Invalid booking type. Must be booth or service_inquiry',
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

  // Validate phone number format (basic)
  const phoneRegex = /^[\d\s\+\-\(\)]+$/;
  if (!phoneRegex.test(clientPhone)) {
    throw new AppError(
      'Invalid phone number format',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Validate email if provided
  if (clientEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      throw new AppError(
        'Invalid email format',
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  const booking = await prisma.booking.create({
    data: {
      bookingType,
      clientName: clientName.trim(),
      clientEmail: clientEmail?.trim(),
      clientPhone: clientPhone.trim(),
      serviceType: serviceType?.trim(),
      preferredDate: preferredDate ? new Date(preferredDate) : null,
      preferredTime: preferredTime?.trim(),
      message: message?.trim(),
      status: 'new',
    },
  });

  res.status(201).json({
    success: true,
    message: 'Booking request submitted successfully. We will contact you soon!',
    data: booking,
  });
});

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private (requires authentication)
export const getBookings = asyncHandler(async (req, res) => {
  const { status, bookingType, startDate, endDate } = req.query;

  const where = {};

  // Filter by status
  if (status) {
    where.status = status;
  }

  // Filter by booking type
  if (bookingType) {
    where.bookingType = bookingType;
  }

  // Date filtering (by preferred date)
  if (startDate || endDate) {
    where.preferredDate = {};
    if (startDate) where.preferredDate.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.preferredDate.lte = end;
    }
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings,
  });
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private (requires authentication)
export const getBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await prisma.booking.findUnique({
    where: { id: parseInt(id) },
  });

  if (!booking) {
    throw new AppError('Booking not found', 404, 'NOT_FOUND');
  }

  res.status(200).json({
    success: true,
    data: booking,
  });
});

// @desc    Update booking status
// @route   PUT /api/bookings/:id
// @access  Private (requires authentication)
export const updateBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const booking = await prisma.booking.findUnique({
    where: { id: parseInt(id) },
  });

  if (!booking) {
    throw new AppError('Booking not found', 404, 'NOT_FOUND');
  }

  // Validate status
  const validStatuses = ['new', 'contacted', 'scheduled', 'completed', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    throw new AppError(
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }

  const updateData = {};
  if (status) updateData.status = status;
  if (notes !== undefined) updateData.message = notes?.trim();

  const updatedBooking = await prisma.booking.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  // Log audit if user is authenticated
  if (req.user) {
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'Booking',
        entityId: updatedBooking.id,
        description: `Updated booking status to ${status} for ${updatedBooking.clientName}`,
      },
    });
  }

  res.status(200).json({
    success: true,
    message: 'Booking updated successfully',
    data: updatedBooking,
  });
});

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
// @access  Private (requires authentication)
export const deleteBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await prisma.booking.findUnique({
    where: { id: parseInt(id) },
  });

  if (!booking) {
    throw new AppError('Booking not found', 404, 'NOT_FOUND');
  }

  await prisma.booking.delete({
    where: { id: parseInt(id) },
  });

  // Log audit if user is authenticated
  if (req.user) {
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        entity: 'Booking',
        entityId: parseInt(id),
        description: `Deleted booking from ${booking.clientName}`,
      },
    });
  }

  res.status(200).json({
    success: true,
    message: 'Booking deleted successfully',
  });
});

// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Private (requires authentication)
export const getBookingStats = asyncHandler(async (req, res) => {
  const [totalBookings, bookingsByStatus, bookingsByType, recentBookings] = await Promise.all([
    // Total bookings
    prisma.booking.count(),

    // Bookings by status
    prisma.booking.groupBy({
      by: ['status'],
      _count: true,
    }),

    // Bookings by type
    prisma.booking.groupBy({
      by: ['bookingType'],
      _count: true,
    }),

    // Recent bookings
    prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  // Count pending bookings (new + contacted)
  const pendingCount = bookingsByStatus
    .filter(b => ['new', 'contacted'].includes(b.status))
    .reduce((sum, b) => sum + b._count, 0);

  res.status(200).json({
    success: true,
    data: {
      totalBookings,
      pendingBookings: pendingCount,
      bookingsByStatus,
      bookingsByType,
      recentBookings,
    },
  });
});

// @desc    Get new/pending bookings
// @route   GET /api/bookings/pending
// @access  Private (requires authentication)
export const getPendingBookings = asyncHandler(async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: {
      status: {
        in: ['new', 'contacted'],
      },
    },
    orderBy: { createdAt: 'asc' }, // Oldest first
  });

  res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings,
  });
});