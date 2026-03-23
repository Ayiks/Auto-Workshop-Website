import express from 'express';
import { getPhotos, addPhoto, removePhoto } from '../controllers/jobPhotos.controller.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get   ('/:id/photos',           requirePermission('jobs', 'view'), getPhotos);
router.post  ('/:id/photos',           requirePermission('jobs', 'edit'), addPhoto);
router.delete('/:id/photos/:photoId',  requirePermission('jobs', 'edit'), removePhoto);

export default router;
