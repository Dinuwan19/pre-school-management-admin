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
        console.log(`[Storage] Attempting to upload file: ${file?.originalname} to bucket: ${bucket}`);
        if (!file || !file.buffer) {
            console.error('[Storage] Error: No file buffer provided.');
            throw new Error('No file buffer found. Ensure Multer is using MemoryStorage.');
        }

        // 1. Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;

        // 2. Upload to Local
        const uploadDir = path.join(__dirname, '../../uploads', bucket, folder);
        console.log(`[Storage] Checking directory: ${uploadDir}`);
        if (!fs.existsSync(uploadDir)) {
            console.log(`[Storage] Creating directory: ${uploadDir}`);
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const filePath = path.join(uploadDir, filename);
        console.log(`[Storage] Writing file to: ${filePath}`);
        fs.writeFileSync(filePath, file.buffer);
        console.log(`[Storage] Successfully wrote file: ${filename}`);

        // 3. Get Public URL (relative path)
        const relativeUrl = `/uploads/${bucket}${folder ? '/' + folder : ''}/${filename}`;
        
        return relativeUrl;
    } catch (error) {
        console.error('[Storage] CRITICAL UPLOAD ERROR:', error);
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
/**
 * Deletes a file from Local Storage
 * @param {String} relativeUrl - The relative public URL of the file (e.g., '/uploads/reports/file.pdf')
 * @returns {Promise<Boolean>} - Success status
 */
exports.deleteFile = async (relativeUrl) => {
    try {
        if (!relativeUrl) return false;
        
        // Convert relative URL back to absolute path
        // URL format: /uploads/bucket/filename
        const pathParts = relativeUrl.split('/').filter(p => p && p !== 'uploads');
        if (pathParts.length < 1) return false;

        const absolutePath = path.join(__dirname, '../../uploads', ...pathParts);
        
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.log(`[Storage] Deleted file: ${absolutePath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('[Storage] ERROR DELETING FILE:', error);
        return false;
    }
};
