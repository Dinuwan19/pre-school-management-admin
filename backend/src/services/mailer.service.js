const nodemailer = require('nodemailer');

// Initialize transporter with environment variables
const port = parseInt(process.env.SMTP_PORT) || 2525;
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
});

/**
 * Send OTP for verification or password reset
 */
exports.sendOTPEmail = async (email, otp, purpose = 'Verification') => {
    const mailOptions = {
        from: `"MFM System" <${process.env.SMTP_FROM || 'no-reply@mfm.com'}>`,
        to: email,
        subject: `MFM – ${purpose} OTP Code`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #7B57E4;">MFM Security Verification</h2>
                <p>Hello,</p>
                <p>You requested a code for <strong>${purpose}</strong>.</p>
                <div style="background: #F0EAFB; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #7B57E4;">${otp}</span>
                </div>
                <p>This code expires in <strong>5 minutes</strong>. If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #777;">MFM Preschool Management System</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP Email sent to ${email}`);
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw new Error('Failed to send OTP email');
    }
};

/**
 * Send Temporary Credentials to staff/teachers
 */
exports.sendTempPasswordEmail = async (email, username, tempPassword) => {
    const mailOptions = {
        from: `"MFM System" <${process.env.SMTP_FROM || 'admin@mfm.com'}>`,
        to: email,
        subject: 'MFM – Temporary Login Credentials',
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #7B57E4;">Welcome to MFM Team</h2>
                <p>Your account has been created by the administrator.</p>
                <p>Following are your temporary login credentials:</p>
                <div style="background: #F0EAFB; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Username:</strong> ${username}</p>
                    <p><strong>Temporary Password:</strong> <code style="background: #fff; padding: 2px 5px; border: 1px solid #ddd;">${tempPassword}</code></p>
                </div>
                <p style="color: #d9534f;"><strong>Note:</strong> You are required to change this password immediately upon your first login for security reasons.</p>
                <p>This password will expire in 24 hours.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #777;">MFM Preschool Management System</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Temp Credential Email sent to ${email}`);
    } catch (error) {
        console.error('Error sending Temp Password email:', error);
        throw new Error('Failed to send temporary credential email');
    }
};
