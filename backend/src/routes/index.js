import authRoutes from './auth.routes.js';
import materialRoutes from './materials.routes.js';
import saleRoutes from './sales.routes.js';
import jobRoutes from './jobs.routes.js';
import invoiceRoutes from './invoices.routes.js';
import paymentRoutes from './payment.routes.js';
import receiptRoutes from './receipt.routes.js';
import expenseRoutes from './expenses.routes.js';
import reportRoutes from './report.routes.js';
import { sendContactEmail } from '../utils/sendEmail.js';


/**
 * Configure all API routes
 * @param {Express.Application} app - Express app instance
 */
const configureRoutes = (app) => {
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Auto Workshop API is running',
      timestamp: new Date().toISOString(),
    });
  });

  // API version prefix
  const API_VERSION = '/api';

  // Mount routes
  app.use(`${API_VERSION}/auth`, authRoutes);
  app.use(`${API_VERSION}/materials`, materialRoutes);
  app.use(`${API_VERSION}/sales`, saleRoutes);
  app.use(`${API_VERSION}/jobs`, jobRoutes);
  app.use(`${API_VERSION}/invoices`, invoiceRoutes);
  app.use(`${API_VERSION}/payments`, paymentRoutes);
  app.use(`${API_VERSION}/receipts`, receiptRoutes);
  app.use(`${API_VERSION}/expenses`, expenseRoutes);
  app.use(`${API_VERSION}/reports`, reportRoutes);

  // Public contact form
  app.post(`${API_VERSION}/contact`, async (req, res) => {
    const { fullName, email, message } = req.body;
    if (!fullName || !email || !message) {
      return res.status(400).json({ success: false, error: { message: 'All fields are required.' } });
    }
    try {
      await sendContactEmail({ fullName, email, message });
      res.status(200).json({ success: true, message: 'Message sent.' });
    } catch (err) {
      console.error('Contact email failed:', err.message);
      res.status(500).json({ success: false, error: { message: 'Failed to send message. Please try again.' } });
    }
  });

  // 404 handler - must be last
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.originalUrl} not found`,
      },
    });
  });
};

export default configureRoutes;