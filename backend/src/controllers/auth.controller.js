const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { logAction } = require('../services/audit.service');

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

        const user = await prisma.user.findUnique({ where: { username } });

        if (!user || user.status !== 'ACTIVE') {
            return res.status(401).json({ message: 'Invalid credentials or inactive account' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
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
                firstLogin: user.firstLogin
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
    // NOTE: This endpoint should be protected or removed in production
    try {
        const { username, password, role, fullName } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: role || 'TEACHER',
                fullName,
            },
        });

        res.status(201).json({ message: 'User created successfully', userId: user.id });
    } catch (error) {
        next(error);
    }
};

exports.requestPasswordReset = async (req, res, next) => {
    try {
        const { username } = req.body;
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user || !user.email) {
            // Success even if not found/no email to prevent user enumeration
            return res.json({ message: 'If an account exists with this username and email, a reset link will be sent.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour from now

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: tokenHash,
                resetTokenExpires: expires
            }
        });

        // IMPORTANT: Log token to console since no email server is available
        // In a real system, this would be sent to user.email
        console.log('-----------------------------------------');
        console.log(`PASSWORD RESET REQUEST for user: ${username}`);
        console.log(`TARGET EMAIL: ${user.email}`);
        console.log(`RESET TOKEN: ${token}`);
        console.log(`RESET LINK: http://localhost:5173/reset-password?token=${token}`);
        console.log('-----------------------------------------');

        await logAction(user.id, `PASSWORD_RESET_REQUEST: Reset requested for ${username} (Email: ${user.email})`);

        res.json({
            message: 'If an account exists, a reset link will be sent.',
            _dev_token: token // Still keeping this for their "Developer Mode" UI fix I implemented earlier
        });
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
