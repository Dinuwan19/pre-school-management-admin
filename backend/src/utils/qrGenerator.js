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

exports.generateQRCodeBuffer = async (data) => {
    try {
        // Generates a Buffer
        return await QRCode.toBuffer(data);
    } catch (err) {
        console.error('Error generating QR code buffer', err);
        return null;
    }
};
