import { AppError, asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get all photos for a job
// @route   GET /api/jobs/:id/photos
// @access  Private (jobs:view)
export const getPhotos = asyncHandler(async (req, res) => {
  const jobId = parseInt(req.params.id);

  const job = await req.db.job.findFirst({
    where: { id: jobId, businessId: req.user.businessId },
    select: { id: true },
  });
  if (!job) throw new AppError('Job not found', 404, 'NOT_FOUND');

  const photos = await req.db.jobPhoto.findMany({
    where: { jobId, businessId: req.user.businessId },
    orderBy: { createdAt: 'asc' },
    include: { uploader: { select: { fullName: true } } },
  });

  res.status(200).json({ success: true, count: photos.length, data: photos });
});

// @desc    Add a photo to a job
// @route   POST /api/jobs/:id/photos
// @access  Private (jobs:edit)
export const addPhoto = asyncHandler(async (req, res) => {
  const jobId = parseInt(req.params.id);
  const { url, publicId, caption } = req.body;

  if (!url?.trim()) throw new AppError('url is required', 400, 'VALIDATION_ERROR');
  if (!publicId?.trim()) throw new AppError('publicId is required', 400, 'VALIDATION_ERROR');

  const job = await req.db.job.findFirst({
    where: { id: jobId, businessId: req.user.businessId },
    select: { id: true },
  });
  if (!job) throw new AppError('Job not found', 404, 'NOT_FOUND');

  const VALID_CAPTIONS = ['before', 'after'];
  const safeCaption = caption && VALID_CAPTIONS.includes(caption) ? caption : null;

  const photo = await req.db.jobPhoto.create({
    data: {
      jobId,
      url: url.trim(),
      publicId: publicId.trim(),
      caption: safeCaption,
      uploadedBy: req.user.id,
      businessId: req.user.businessId,
    },
    include: { uploader: { select: { fullName: true } } },
  });

  res.status(201).json({ success: true, data: photo });
});

// @desc    Delete a photo from a job
// @route   DELETE /api/jobs/:id/photos/:photoId
// @access  Private (jobs:edit)
export const removePhoto = asyncHandler(async (req, res) => {
  const jobId    = parseInt(req.params.id);
  const photoId  = parseInt(req.params.photoId);

  const photo = await req.db.jobPhoto.findFirst({
    where: { id: photoId, jobId, businessId: req.user.businessId },
  });
  if (!photo) throw new AppError('Photo not found', 404, 'NOT_FOUND');

  await req.db.jobPhoto.delete({ where: { id: photoId } });

  res.status(200).json({ success: true, message: 'Photo removed' });
});
