const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.uploadFolder || 'images';
    const folderPath = path.join(uploadDir, folder);
    
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

// File filter - allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file hình ảnh (JPEG, JPG, PNG, GIF, WEBP)'), false);
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// Middleware for single image upload
const uploadSingle = (fieldName = 'image', folder = 'images') => {
  return (req, res, next) => {
    req.uploadFolder = folder;
    upload.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Kích thước file quá lớn. Tối đa 5MB.'
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Middleware for multiple images upload
const uploadMultiple = (fieldName = 'images', maxCount = 5, folder = 'products') => {
  return (req, res, next) => {
    req.uploadFolder = folder;
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Kích thước file quá lớn. Tối đa 5MB.'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: `Chỉ được upload tối đa ${maxCount} hình ảnh.`
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Middleware for product images (multiple)
const uploadProductImages = (maxCount = 10) => {
  return uploadMultiple('images', maxCount, 'products');
};

// Middleware for category images (single)
const uploadCategoryImage = () => {
  return uploadSingle('image', 'categories');
};

// Middleware for profile images (single)
const uploadProfileImage = () => {
  return uploadSingle('image', 'profiles');
};

// Helper: Get file URL from request
const getFileUrl = (req, filename) => {
  if (!filename) return null;
  return `${req.protocol}://${req.get('host')}/uploads/${req.uploadFolder}/${filename}`;
};

// Helper: Get all file URLs from request
const getFileUrls = (req) => {
  if (!req.files || req.files.length === 0) return [];
  return req.files.map(file => getFileUrl(req, file.filename));
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadProductImages,
  uploadCategoryImage,
  uploadProfileImage,
  getFileUrl,
  getFileUrls
};
