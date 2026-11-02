// Shared upload middleware: Cloudinary when configured, local disk otherwise.
//
// Why: Render's free tier has an ephemeral disk — files saved to
// backend/uploads/ disappear on redeploy/restart. Cloudinary (free tier,
// no credit card) gives permanent photo URLs.
//
// Setup: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and
// CLOUDINARY_API_SECRET (Render dashboard -> Environment, or backend/.env
// locally). Without them, uploads fall back to backend/uploads/ so local
// development keeps working with zero config.
const path = require('path');
const multer = require('multer');

const useCloudinary =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

let storage;
if (useCloudinary) {
  // No multer-storage-cloudinary (its peer dep conflicts with cloudinary v2),
  // so we use a tiny custom storage engine on top of the v2 SDK.
  const { v2: cloudinary } = require('cloudinary');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  storage = {
    _handleFile(req, file, cb) {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'foodhub', resource_type: 'image' },
        (err, result) => {
          if (err) return cb(err);
          cb(null, {
            path: result.secure_url, // fileUrl() returns this as-is
            filename: result.public_id,
            size: result.bytes,
          });
        }
      );
      file.stream.pipe(uploadStream);
    },
    _removeFile(req, file, cb) {
      cloudinary.uploader.destroy(file.filename, () => cb(null)); // best-effort
    },
  };
} else {
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) =>
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// Public URL for an uploaded file:
// Cloudinary -> full https URL | disk -> /uploads/<file> (served by Express)
function fileUrl(file) {
  if (!file) return '';
  if (file.path && /^https?:\/\//.test(file.path)) return file.path;
  return `/uploads/${file.filename}`;
}

module.exports = { upload, fileUrl };
