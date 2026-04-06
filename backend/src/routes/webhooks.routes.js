import express from 'express';
import { handleArkeselDLR } from '../controllers/webhooks.controller.js';

const router = express.Router();

// Public — no auth required. Arkesel's servers POST here directly.
router.post('/arkesel/dlr', handleArkeselDLR);

export default router;
