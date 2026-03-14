import express from 'express';
import {
  getReminders,
  createReminder,
  updateReminderStatus,
  deleteReminder,
} from '../controllers/reminders.controller.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', requirePermission('customers', 'view'), getReminders);
router.post('/', requirePermission('customers', 'edit'), createReminder);
router.put('/:id/status', requirePermission('customers', 'edit'), updateReminderStatus);
router.delete('/:id', requirePermission('customers', 'edit'), deleteReminder);

export default router;
