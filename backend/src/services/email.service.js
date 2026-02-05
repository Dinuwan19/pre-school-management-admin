const nodemailer = require('nodemailer');

// Configure transporter
// In production, these should be in .env: 
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
const transporter = nodemailer.createTransport({
    service: 'gmail', // Simplest for now, or use host/port
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

exports.sendAccountCredentials = async (toEmail, username, password) => {
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('⚠️ SMTP credentials not found. MOCKING EMAIL SEND.');
            console.log('--- EMAIL TO:', toEmail, '---');
            console.log('Subject: Your Admin Account Credentials');
            console.log(`Username: ${username}`);
            console.log(`Password: ${password}`);
            console.log('---------------------------');
            return true;
        }

        const info = await transporter.sendMail({
            from: `"Malkakulu Admin" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: 'Your Admin Panel Account Details',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #7B57E4;">Welcome to Malkakulu Admin Panel</h2>
                    <p>Your administrator account has been created successfully.</p>
                    <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Username:</strong> ${username}</p>
                        <p><strong>Temporary Password:</strong> ${password}</p>
                    </div>
                    <p>Please login and change your password immediately.</p>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="background: #7B57E4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a>
                </div>
            `
        });

        console.log('Message sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};
