import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Placeholder routes - Will implement in Week 2
router.get('/', authorize('admin', 'mechanic'), (req, res) => {
  res.json({ success: true, message: 'Jobs routes - Coming soon', jobs: [] });
});

router.post('/', authorize('admin', 'mechanic'), (req, res) => {
  res.json({ success: true, message: 'Create job - Coming soon' });
});

router.get('/:id', authorize('admin', 'mechanic'), (req, res) => {
  res.json({ success: true, message: 'Get job - Coming soon' });
});

export default router;