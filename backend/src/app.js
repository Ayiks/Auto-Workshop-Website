import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import materialRoutes from './routes/materials.routes.js';
import saleRoutes from './routes/sales.routes.js';
import jobRoutes from './routes/jobs.routes.js';
import jobPhotosRoutes from './routes/jobPhotos.routes.js';
import invoiceRoutes from './routes/invoices.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import expenseRoutes from './routes/expenses.routes.js';
import reportRoutes from './routes/report.routes.js';
import receiptRoutes from './routes/receipt.routes.js';
import bookingRoutes from './routes/bookings.routes.js';
import userRoutes from './routes/user.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import serviceRoutes from './routes/service.routes.js';
import customerRoutes from './routes/customer.routes.js';
import vehicleRoutes from './routes/vehicles.routes.js';
import reminderRoutes from './routes/reminders.routes.js';
import sandboxRoutes from './routes/sandbox.routes.js';
import messagingRoutes from './routes/messaging.routes.js';
import vendorRoutes from './routes/vendors.routes.js';
import webhooksRoutes from './routes/webhooks.routes.js';
import { sendContactEmail } from './utils/sendEmail.js';

const app = express();

// Trust reverse proxy (nginx, Docker, etc.) so express-rate-limit
// can read the real client IP from X-Forwarded-For
app.set('trust proxy', 1);

// ============================================
// SECURITY & MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    process.env.PUBLIC_WEBSITE_URL || 'http://localhost:3001'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Request timestamp
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auto Workshop API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes (v1)
const API_PREFIX = '/api';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/materials`, materialRoutes);
app.use(`${API_PREFIX}/sales`, saleRoutes);
app.use(`${API_PREFIX}/jobs`, jobRoutes);
app.use(`${API_PREFIX}/jobs`, jobPhotosRoutes);
app.use(`${API_PREFIX}/invoices`, invoiceRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/receipts`, receiptRoutes);
app.use(`${API_PREFIX}/expenses`, expenseRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/bookings`, bookingRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/settings`, settingsRoutes);
app.use(`${API_PREFIX}/services`, serviceRoutes);
app.use(`${API_PREFIX}/customers`, customerRoutes);
app.use(`${API_PREFIX}/vehicles`, vehicleRoutes);
app.use(`${API_PREFIX}/reminders`, reminderRoutes);
app.use(`${API_PREFIX}/sandboxes`, sandboxRoutes);
app.use(`${API_PREFIX}/messaging`, messagingRoutes);
app.use(`${API_PREFIX}/vendors`, vendorRoutes);

// Webhooks — public, no auth required
app.use(`${API_PREFIX}/webhooks`, webhooksRoutes);

// Public contact form
app.post(`${API_PREFIX}/contact`, async (req, res) => {
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

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler (must be after all routes)
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

export default app;