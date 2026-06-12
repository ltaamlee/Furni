const cloudinary = require('cloudinary').v2;

// Cấu hình Cloudinary từ biến môi trường (.env)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Đã cấu hình đủ thông số chưa
const isConfigured = () =>
    Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );

/**
 * Upload 1 buffer ảnh lên Cloudinary (dùng upload_stream).
 * @param {Buffer} buffer  dữ liệu file
 * @param {string} folder  thư mục trên Cloudinary
 * @returns {Promise<{url:string, publicId:string}>}
 */
const uploadBuffer = (buffer, folder = 'furni/products') =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'image' },
            (error, result) => {
                if (error) return reject(error);
                resolve({ url: result.secure_url, publicId: result.public_id });
            }
        );
        stream.end(buffer);
    });

module.exports = { cloudinary, isConfigured, uploadBuffer };
