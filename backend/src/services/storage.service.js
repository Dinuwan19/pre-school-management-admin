const supabase = require('../config/supabase');
const path = require('path');

/**
 * Uploads a file buffer to Supabase Storage
 * @param {Object} file - The file object from Multer (must contain buffer and originalname)
 * @param {String} bucket - The Supabase bucket name (e.g., 'student-photos', 'receipts')
 * @param {String} folder - Optional folder path within the bucket
 * @returns {Promise<String>} - The public URL of the uploaded file
 */
exports.uploadFile = async (file, bucket, folder = '') => {
    try {
        if (!file || !file.buffer) {
            throw new Error('No file buffer found. Ensure Multer is using MemoryStorage.');
        }

        // 1. Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `${folder ? folder + '/' : ''}${file.fieldname}-${uniqueSuffix}${ext}`;

        // 2. Upload to Supabase
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filename, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Supabase Upload Error:', error);
            throw new Error(`Upload failed: ${error.message}`);
        }

        // 3. Get Public URL
        const { data: publicData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return publicData.publicUrl;
    } catch (error) {
        console.error('Storage Service Error:', error);
        throw error;
    }
};

/**
 * Uploads a local file (by path) to Supabase Storage. Used for migration scripts.
 * @param {String} localPath - Absolute path to local file
 * @param {Buffer} fileBuffer - Buffer of the file
 * @param {String} mimeType - Mime type of the file
 * @param {String} bucket - Bucket name
 * @returns {Promise<String>} - Public URL
 */
exports.uploadLocalFile = async (filename, fileBuffer, mimeType, bucket) => {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filename, fileBuffer, {
                contentType: mimeType,
                upsert: true
            });

        if (error) throw error;

        const { data: publicData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return publicData.publicUrl;
    } catch (error) {
        throw error;
    }
};
