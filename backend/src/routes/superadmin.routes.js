import express from 'express';
import { requireSuperAdmin } from '../middleware/superadminAuth.js';
import * as ctrl from '../controllers/superadmin.controller.js';

const router = express.Router();

// Public — no auth required
router.post('/auth/login', ctrl.adminLogin);
router.get('/feature-flags/check/:key', ctrl.checkFeatureFlag);

// All routes below require a valid super admin token
router.use(requireSuperAdmin);

// Auth
router.get('/auth/me', ctrl.adminGetMe);

// Stats
router.get('/stats', ctrl.getSystemStats);

// Businesses
router.get('/businesses', ctrl.listBusinesses);
router.get('/businesses/:businessId', ctrl.getBusinessDetail);
router.put('/businesses/:businessId/toggle-status', ctrl.toggleBusinessStatus);
router.put('/businesses/:businessId/subscription', ctrl.updateSubscription);
router.put('/businesses/:businessId', ctrl.updateBusiness);

// Users
router.get('/users', ctrl.listAllUsers);
router.put('/users/:userId/toggle-status', ctrl.toggleUserStatus);
router.put('/users/:userId/verify-email', ctrl.verifyUserEmail);
router.put('/users/:userId/reset-password', ctrl.resetUserPassword);
router.put('/users/:userId', ctrl.updateUser);

// Audit Logs
router.get('/audit-logs', ctrl.getAuditLogs);

// Feature Flags
router.get('/feature-flags', ctrl.listFeatureFlags);
router.post('/feature-flags', ctrl.createFeatureFlag);
router.put('/feature-flags/:flagId/businesses/:businessId', ctrl.toggleFlagForBusiness);
router.put('/feature-flags/:flagId', ctrl.updateFeatureFlag);
router.delete('/feature-flags/:flagId', ctrl.deleteFeatureFlag);

// Query Runner
router.post('/query', ctrl.runQuery);

// System Error Logs
router.get('/system-errors', ctrl.getSystemErrorLogs);
router.put('/system-errors/:errorId/resolve', ctrl.resolveSystemError);

// Impersonation
router.post('/impersonate/:userId', ctrl.impersonateUser);

export default router;
