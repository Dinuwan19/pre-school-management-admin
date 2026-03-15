const path = require('path');
const fs = require('fs');

/**
 * Uploads a file buffer to Local Storage
 * @param {Object} file - The file object from Multer (must contain buffer and originalname)
 * @param {String} bucket - The "bucket" or base directory name (e.g., 'student-photos', 'receipts')
 * @param {String} folder - Optional subfolder path
 * @returns {Promise<String>} - The relative public URL of the uploaded file
 */
exports.uploadFile = async (file, bucket, folder = '') => {
    try {
        if (!file || !file.buffer) {
            throw new Error('No file buffer found. Ensure Multer is using MemoryStorage.');
        }

        // 1. Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;

        // 2. Upload to Local
        const uploadDir = path.join(__dirname, '../../uploads', bucket, folder);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, file.buffer);

        // 3. Get Public URL (relative path)
        const relativeUrl = `/uploads/${bucket}${folder ? '/' + folder : ''}/${filename}`;
        
        return relativeUrl;
    } catch (error) {
        console.error('Storage Service Error:', error);
        throw error;
    }
};

/**
 * Uploads a local file buffer directly to Local Storage. Used for migration scripts.
 * @param {String} filename - Relative path/name (e.g. 'reports/file.pdf' or 'file.pdf')
 * @param {Buffer} fileBuffer - Buffer of the file
 * @param {String} mimeType - Mime type of the file
 * @param {String} bucket - Bucket name
 * @returns {Promise<String>} - Public relative URL
 */
exports.uploadLocalFile = async (filename, fileBuffer, mimeType, bucket) => {
    try {
        const uploadDir = path.join(__dirname, '../../uploads', bucket);
        const finalPath = path.join(uploadDir, filename);
        const finalDir = path.dirname(finalPath);
        
        if (!fs.existsSync(finalDir)) {
            fs.mkdirSync(finalDir, { recursive: true });
        }
        
        fs.writeFileSync(finalPath, fileBuffer);

        // Normalize filename slashes for URL
        const urlFilename = filename.replace(/\\/g, '/');
        return `/uploads/${bucket}/${urlFilename}`;
    } catch (error) {
        throw error;
    }
};
