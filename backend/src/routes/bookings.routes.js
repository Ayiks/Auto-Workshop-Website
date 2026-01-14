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
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public route - no authentication required
router.post('/', createBooking);

// All other routes require authentication
router.use(protect);

// Special routes (before /:id to avoid conflict)
router.get('/stats', getBookingStats);
router.get('/pending', getPendingBookings);

// Protected routes
router.get('/', getBookings);
router.get('/:id', getBooking);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

export default router;