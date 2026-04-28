import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createQuote,
  getQuotes,
  getQuote,
  updateQuote,
  convertToJob,
} from '../controllers/quote.controller.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getQuotes).post(createQuote);

router.route('/:id').get(getQuote).put(authorize('admin'), updateQuote);

router.post('/:id/convert', convertToJob);

export default router;
