const QRCode = require('qrcode');

exports.generateQRCode = async (data) => {
    try {
        // Generates a Data URL (base64 image)
        return await QRCode.toDataURL(data);
    } catch (err) {
        console.error('Error generating QR code', err);
        return null;
    }
};
