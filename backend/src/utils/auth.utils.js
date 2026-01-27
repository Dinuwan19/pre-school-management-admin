const crypto = require('crypto');

/**
 * Generate a 6-digit numeric OTP
 */
exports.generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate a random temporary password
 * Complexity: Mixed characters
 */
exports.generateTempPassword = (length = 12) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
};

/**
 * SHA256 Hash utility for consistent hashed storage (like OTPs)
 */
exports.hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};
