import express from 'express';
import { protect, requirePermission } from '../middleware/auth.js';
import { bulkSend, singleSend } from '../controllers/messaging.controller.js';

const router = express.Router();

router.use(protect);

router.post('/bulk', requirePermission('messaging', 'send'), bulkSend);
router.post('/single', requirePermission('messaging', 'send'), singleSend);

export default router;
