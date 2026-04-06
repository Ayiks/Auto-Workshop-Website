import express from 'express';
import { protect, requirePermission } from '../middleware/auth.js';
import { bulkSend, singleSend, getLogs, getRecipients } from '../controllers/messaging.controller.js';

const router = express.Router();

router.use(protect);

router.get('/logs', requirePermission('messaging', 'send'), getLogs);
router.get('/logs/:id/recipients', requirePermission('messaging', 'send'), getRecipients);
router.post('/bulk', requirePermission('messaging', 'send'), bulkSend);
router.post('/single', requirePermission('messaging', 'send'), singleSend);

export default router;
