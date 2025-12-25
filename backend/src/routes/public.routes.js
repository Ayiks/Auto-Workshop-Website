import express from 'express';

const router = express.Router();

// Placeholder routes - Will implement in Week 3
router.get('/services', (req, res) => {
  res.json({
    success: true,
    services: [
      { id: 1, name: 'General Service', description: 'Complete vehicle checkup' },
      { id: 2, name: 'Oil Change', description: 'Engine oil and filter replacement' },
      { id: 3, name: 'Brake Service', description: 'Brake inspection and repair' },
    ],
  });
});

router.post('/bookings', (req, res) => {
  res.json({ success: true, message: 'Booking request received - Coming soon' });
});

router.get('/contact', (req, res) => {
  res.json({
    success: true,
    contact: {
      phone: '+233 XX XXX XXXX',
      email: 'info@autoworkshop.com',
      address: 'Accra, Ghana',
    },
  });
});

export default router;