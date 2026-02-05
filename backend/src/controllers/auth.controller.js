const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { logAction } = require('../services/audit.service');
const { generateOTP, generateTempPassword, hashToken } = require('../utils/auth.utils');
const { sendTempPasswordEmail, sendOTPEmail } = require('../services/mailer.service');

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
};

exports.login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { username },
            include: { temppasswordlog: { where: { used: false, expiresAt: { gte: new Date() } } } }
        });

        if (!user || user.status !== 'ACTIVE' || !user.isActive) {
            return res.status(401).json({ message: 'Invalid credentials or inactive account' });
        }

        // Parent specific verification check
        if (user.role === 'PARENT' && !user.isEmailVerified) {
            return res.status(403).json({
                message: 'Your email is not verified yet.',
                requiresVerification: true,
                userId: user.id
            });
        }

        let isMatch = await bcrypt.compare(password, user.password);
        let usedTempPassword = false;

        // If regular password fails, check temp passwords
        if (!isMatch && user.temppasswordlog && user.temppasswordlog.length > 0) {
            for (const log of user.temppasswordlog) {
                const tempMatch = await bcrypt.compare(password, log.passwordHash);
                if (tempMatch) {
                    isMatch = true;
                    usedTempPassword = true;
                    // Mark this temp password as used
                    await prisma.temppasswordlog.update({
                        where: { id: log.id },
                        data: { used: true }
                    });
                    break;
                }
            }
        }

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user);
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                fullName: user.fullName,
                firstLogin: user.firstLogin || usedTempPassword // Force reset if temp password used
            },
        });

        // Log successful login
        await logAction(user.id, `LOGIN_SUCCESS: User logged in as ${user.role}`);
    } catch (error) {
        next(error);
    }
};

exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                firstLogin: false
            }
        });

        await logAction(userId, 'PASSWORD_RESET: User changed their password');

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};

exports.register = async (req, res, next) => {
    try {
        const { username, email, role, fullName } = req.body;

        // Staff/Teacher prefix validation
        if ((role === 'TEACHER' || role === 'STAFF' || role === 'ADMIN') && !username.startsWith('MFM_')) {
            return res.status(400).json({ message: 'Staff usernames must start with MFM_' });
        }

        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Generate temporary password
        const tempRawPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempRawPassword, 10);

        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword, // Store initially as standard password for first login
                role: role || 'TEACHER',
                fullName,
                firstLogin: true,
                isActive: true
            },
        });

        // Also log it in TempPasswordLog for redundancy/expiry logic
        await prisma.tempPasswordLog.create({
            data: {
                userId: user.id,
                passwordHash: hashedPassword,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            }
        });

        // Send email with credentials
        if (email) {
            try {
                await sendTempPasswordEmail(email, username, tempRawPassword);
            } catch (mailError) {
                console.error('Failed to send credential email:', mailError);
                // We still return success as user is created, but notify about email failure
                return res.status(201).json({
                    message: 'User created but email failed. Please provide temp password manually.',
                    userId: user.id,
                    _dev_temp_pass: tempRawPassword
                });
            }
        }

        res.status(201).json({ message: 'User created and credentials emailed successfully', userId: user.id });
    } catch (error) {
        next(error);
    }
};

exports.requestPasswordReset = async (req, res, next) => {
    try {
        const { username } = req.body;
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user || !user.email) {
            return res.json({ message: 'If an account exists, an OTP will be sent to your email.' });
        }

        const otpCode = generateOTP();
        const otpHash = hashToken(otpCode);
        const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await prisma.otp.create({
            data: {
                userId: user.id,
                codeHash: otpHash,
                expiresAt: expires,
                purpose: 'FORGOT_PASSWORD'
            }
        });

        // Send OTP via Email
        try {
            await sendOTPEmail(user.email, otpCode, 'Password Reset');
        } catch (mailError) {
            console.error('OTP Mail Error:', mailError);
            // Developer fallback for testing without SMTP
            return res.json({
                message: 'OTP generation failed. (Dev: Check server logs)',
                _dev_otp: otpCode
            });
        }

        await logAction(user.id, `PASSWORD_RESET_OTP: Sent to ${user.email}`);

        res.json({ message: 'An OTP has been sent to your registered email.' });
    } catch (error) {
        next(error);
    }
};

exports.verifyOTPOnly = async (req, res, next) => {
    try {
        const { username, otp } = req.body;
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const otpHash = hashToken(otp);
        const validOtp = await prisma.otp.findFirst({
            where: {
                userId: user.id,
                codeHash: otpHash,
                isUsed: false,
                expiresAt: { gte: new Date() }
            }
        });

        if (!validOtp) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        res.json({ message: 'OTP verified successfully. You may now change your password.' });
    } catch (error) {
        next(error);
    }
};

exports.verifyOTPAndReset = async (req, res, next) => {
    try {
        const { username, otp, newPassword } = req.body;
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user) return res.status(404).json({ message: 'User not found' });

        const otpHash = hashToken(otp);
        const validOtp = await prisma.otp.findFirst({
            where: {
                userId: user.id,
                codeHash: otpHash,
                isUsed: false,
                expiresAt: { gte: new Date() }
            }
        });

        if (!validOtp) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword, firstLogin: false, isEmailVerified: true }
            }),
            prisma.otp.update({
                where: { id: validOtp.id },
                data: { isUsed: true }
            })
        ]);

        await logAction(user.id, 'PASSWORD_RESET_SUCCESS: User reset password via OTP');
        res.json({ message: 'Password reset successful. You can now login.' });
    } catch (error) {
        next(error);
    }
};

exports.resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const user = await prisma.user.findFirst({
            where: {
                resetToken: tokenHash,
                resetTokenExpires: { gte: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpires: null,
                firstLogin: false // Resetting password counts as first login completion if applicable
            }
        });

        await logAction(user.id, 'PASSWORD_RESET_SUCCESS: User reset their password via token');

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        next(error);
    }
};
