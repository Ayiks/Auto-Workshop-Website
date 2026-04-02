import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Trash2, Upload, X, Image } from 'lucide-react';
import { jobPhotosApi } from '@api/jobs';
import { uploadToCloudinary } from '@/services/cloudinary';

const CAPTION_OPTIONS = [
  { value: 'before', label: 'Before', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'after',  label: 'After',  color: 'bg-green-100 text-green-700 border-green-200' },
  { value: '',       label: 'Other',  color: 'bg-gray-100 text-gray-600 border-gray-200' },
];

export default function JobPhotos({ jobId, canEdit = false, allowedCaptions = null }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  // Filter which caption buttons appear in the upload panel
  const captionOptions = allowedCaptions
    ? CAPTION_OPTIONS.filter(o => allowedCaptions.includes(o.value === '' ? 'other' : o.value))
    : CAPTION_OPTIONS;

  const [pendingFile, setPendingFile] = useState(null);   // { file, preview }
  const [pendingCaption, setPendingCaption] = useState(() => captionOptions[0]?.value ?? 'before');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['job-photos', jobId],
    queryFn: () => jobPhotosApi.getPhotos(jobId),
    enabled: !!jobId,
  });

  const photos = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (photoId) => jobPhotosApi.deletePhoto(jobId, photoId),
    onMutate: (photoId) => setDeletingId(photoId),
    onSettled: () => setDeletingId(null),
    onSuccess: () => queryClient.invalidateQueries(['job-photos', jobId]),
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }
    setUploadError(null);
    setPendingFile({ file, preview: URL.createObjectURL(file) });
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadToCloudinary(pendingFile.file);
      await jobPhotosApi.addPhoto(jobId, {
        url: result,
        publicId: result.split('/').slice(-2).join('/'), // extract public_id from URL path
        caption: pendingCaption || null,
      });
      queryClient.invalidateQueries(['job-photos', jobId]);
      setPendingFile(null);
    } catch (err) {
      setUploadError('Upload failed. Please try again.');
      console.error('Photo upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleCancelPending = () => {
    if (pendingFile?.preview) URL.revokeObjectURL(pendingFile.preview);
    setPendingFile(null);
    setUploadError(null);
  };

  const grouped = {
    before: photos.filter(p => p.caption === 'before'),
    after:  photos.filter(p => p.caption === 'after'),
    other:  photos.filter(p => !p.caption),
  };

  if (isLoading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            Job Photos
            {photos.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-gray-400">({photos.length})</span>
            )}
          </h3>
        </div>
        {canEdit && !pendingFile && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Add Photo
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Pending upload panel */}
      {pendingFile && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
          <div className="flex items-start gap-3">
            <img
              src={pendingFile.preview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
            />
            <div className="flex-1 space-y-2">
              <p className="text-xs font-medium text-gray-700">Label this photo:</p>
              <div className="flex gap-2 flex-wrap">
                {captionOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPendingCaption(opt.value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      pendingCaption === opt.value
                        ? opt.color
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={handleCancelPending} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancelPending}
              disabled={uploading}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Photo grid */}
      {photos.length === 0 && !pendingFile ? (
        <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <Image className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No photos yet</p>
          {canEdit && (
            <p className="text-xs text-gray-400 mt-0.5">
              Add before/after photos to document the job
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {[
            { key: 'before', label: 'Before', badge: 'bg-amber-100 text-amber-700' },
            { key: 'after',  label: 'After',  badge: 'bg-green-100 text-green-700' },
            { key: 'other',  label: 'Other',  badge: 'bg-gray-100 text-gray-600' },
          ].map(({ key, label, badge }) => (
            grouped[key].length > 0 && (
              <div key={key}>
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-2 ${badge}`}>
                  {label}
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {grouped[key].map(photo => (
                    <div key={photo.id} className="relative group aspect-square">
                      <img
                        src={photo.url}
                        alt={`${label} photo`}
                        className="w-full h-full object-cover rounded-lg border border-gray-200"
                      />
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(photo.id)}
                          disabled={deletingId === photo.id}
                          className="absolute top-1 right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      )}
                      {photo.uploader?.fullName && (
                        <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-b-lg truncate opacity-0 group-hover:opacity-100 transition-opacity">
                          {photo.uploader.fullName}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
