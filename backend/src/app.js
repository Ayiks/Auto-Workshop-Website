import express from 'express';
import cors from 'cors';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Import routes (we'll create these next)
import authRoutes from './routes/auth.routes.js';
import materialRoutes from './routes/materials.routes.js';
import saleRoutes from './routes/sales.routes.js';
import jobRoutes from './routes/jobs.routes.js';
import invoiceRoutes from './routes/invoices.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import expenseRoutes from './routes/expenses.routes.js';
import reportRoutes from './routes/report.routes.js';
import receiptRoutes from './routes/receipt.routes.js';
// import materialRoutes from './routes/material.routes.js';
// ... more routes will be imported here

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    process.env.PUBLIC_WEBSITE_URL || 'http://localhost:3001'
  ],
  credentials: true,
}));

// Request logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/expenses', expenseRoutes);
// app.use('/api/bookings', bookingRoutes);
app.use('/api/reports', reportRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/settings', settingsRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;