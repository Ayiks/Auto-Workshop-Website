import express from 'express';
import {
  createBooking,
  getBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  getBookingStats,
  getPendingBookings,
} from '../controllers/bookings.controller.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// Public route - no authentication required
router.post('/', createBooking);

// All other routes require authentication
router.use(protect);

// Special routes (before /:id to avoid conflict)
router.get('/stats', requirePermission('bookings', 'view'), getBookingStats);
router.get('/pending', requirePermission('bookings', 'view'), getPendingBookings);

// Protected routes
router.get('/', requirePermission('bookings', 'view'), getBookings);
router.get('/:id', requirePermission('bookings', 'view'), getBooking);
router.put('/:id', requirePermission('bookings', 'update'), updateBooking);
router.delete('/:id', requirePermission('bookings', 'delete'), deleteBooking);

export default router;