import authRoutes from './auth.routes.js';
import materialRoutes from './materials.routes.js';
import saleRoutes from './sales.routes.js';
import jobRoutes from './jobs.routes.js';
import invoiceRoutes from './invoices.routes.js';
import paymentRoutes from './payment.routes.js';
import receiptRoutes from './receipt.routes.js';
import expenseRoutes from './expenses.routes.js';
import reportRoutes from './report.routes.js';

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