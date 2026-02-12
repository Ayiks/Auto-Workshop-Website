import express from 'express';
import {
  getSettings,
  updateSettings,
  updateLogo,
  getBoothPrice,
  getGlobalUnits,
  addGlobalUnit,
  updateGlobalUnit, // Added this new controller
  deleteGlobalUnit
} from '../controllers/settings.controller.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = express.Router();

/* ==========================================================================
   PUBLIC ROUTES
   ========================================================================== */
// Accessible by anyone (e.g., for login page branding or receipts)
router.get('/business', getSettings);
router.get('/booth-price', getBoothPrice);


/* ==========================================================================
   PROTECTED ROUTES
   ========================================================================== */

// --- Business Settings ---
// Resource: 'settings', Action: 'update'
// Allows Admin OR Staff with { "settings": ["update"] }
router.put(
  '/business', 
  protect, 
  requirePermission('settings', 'update'), 
  updateSettings
);

router.put(
  '/logo', 
  protect, 
  requirePermission('settings', 'update'), 
  updateLogo
);


// --- Unit of Measure (UoM) ---
// Resource: 'units'

// 1. Get Units: Open to all logged-in users (needed for dropdowns)
router.get('/units', protect, getGlobalUnits);

// 2. Add Unit: Admin OR Staff with { "units": ["create"] }
router.post(
  '/units', 
  protect, 
  requirePermission('units', 'create'), 
  addGlobalUnit
);

// 3. Update Unit: Admin OR Staff with { "units": ["update"] }
router.put(
  '/units/:id', 
  protect, 
  requirePermission('units', 'update'), 
  updateGlobalUnit
);

// 4. Delete Unit: Admin OR Staff with { "units": ["delete"] }
router.delete(
  '/units/:id', 
  protect, 
  requirePermission('units', 'delete'), 
  deleteGlobalUnit
);

export default router;