import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Placeholder routes - Will implement in Week 2
router.get('/', authorize('admin', 'mechanic'), (req, res) => {
  res.json({ success: true, message: 'Invoices routes - Coming soon', invoices: [] });
});

router.post('/', authorize('admin', 'mechanic'), (req, res) => {
  res.json({ success: true, message: 'Create invoice - Coming soon' });
});

router.get('/:id', authorize('admin', 'mechanic'), (req, res) => {
  res.json({ success: true, message: 'Get invoice - Coming soon' });
});

export default router;