const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logAction } = require('../services/audit.service');
const { generateOTP, hashToken } = require('../utils/auth.utils');
const { sendOTPEmail } = require('../services/mailer.service');
const crypto = require('crypto');

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '30d' } // Longer session for parents
    );
};

exports.parentSignup = async (req, res, next) => {
    try {
        const { nationalId, email, password, username } = req.body;

        // 1. Verify parent exists in our records via NIC only (Email check removed as requested)
        const parentRecord = await prisma.parent.findFirst({
            where: {
                nationalId: nationalId,
                status: 'ACTIVE'
            }
        });

        if (!parentRecord) {
            return res.status(404).json({
                message: 'No active parent record found with this NIC. Please contact school admin.'
            });
        }

        // 2. Check if this parent already has a user account linked
        if (parentRecord.userId) {
            return res.status(400).json({
                message: 'A user account already exists for this parent. Please login instead.'
            });
        }

        // 3. Check if username is taken
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: 'Username is already taken' });
        }

        // 4. Create User Record
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate Verification OTP
        const otpCode = generateOTP();
        const otpHash = hashToken(otpCode);
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes for verification

        const newUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    role: 'PARENT',
                    fullName: parentRecord.fullName,
                    email: email || parentRecord.email,
                    phone: parentRecord.phone,
                    status: 'ACTIVE',
                    firstLogin: false,
                    isEmailVerified: false
                }
            });

            await tx.parent.update({
                where: { id: parentRecord.id },
                data: { userId: user.id, email: email || undefined }
            });

            await tx.otp.create({
                data: {
                    userId: user.id,
                    codeHash: otpHash,
                    expiresAt: otpExpires,
                    purpose: 'EMAIL_VERIFY'
                }
            });

            return user;
        });

        // Send Verification Email
        try {
            await sendOTPEmail(email || parentRecord.email, otpCode, 'Email Verification');
        } catch (mailErr) {
            console.error('Failed to send verification email:', mailErr);
        }

        res.status(201).json({
            message: 'Parent account created. Please verify your email.',
            requiresVerification: true,
            user: { id: newUser.id, username: newUser.username, role: 'PARENT' }
        });

        await logAction(newUser.id, `PARENT_SIGNUP: Linked to existing NIC ${nationalId}`);

    } catch (error) {
        next(error);
    }
};

/**
 * Public Signup: Create Parent + User record if NIC doesn't exist
 */
exports.publicSignup = async (req, res, next) => {
    try {
        const { nationalId, email, password, username, fullName, phone, relationship } = req.body;

        // 1. Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) return res.status(400).json({ message: 'Username already taken' });

        // 2. Check if parent record exists by NIC or Phone
        const existingParent = await prisma.parent.findFirst({
            where: { OR: [{ nationalId }, { phone }] }
        });

        if (existingParent && existingParent.userId) {
            return res.status(400).json({ message: 'This NIC or Phone is already linked to an account.' });
        }

        // SECURITY CHECK: If claiming a profile, Email MUST match
        if (existingParent) {
            const inputEmail = email.toLowerCase().trim();
            const storedEmail = existingParent.email ? existingParent.email.toLowerCase().trim() : '';

            // If stored email exists and doesn't match input -> BLOCK
            if (storedEmail && storedEmail !== inputEmail) {
                return res.status(400).json({
                    message: 'Identity verification failed. The provided email does not match our records for this NIC.'
                });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otpCode = generateOTP();
        const otpHash = hashToken(otpCode);
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        const result = await prisma.$transaction(async (tx) => {
            // Create User
            const user = await tx.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    role: 'PARENT',
                    fullName,
                    email,
                    phone,
                    isEmailVerified: false
                }
            });

            // Create or Link Parent
            let parent;
            if (existingParent) {
                parent = await tx.parent.update({
                    where: { id: existingParent.id },
                    data: { userId: user.id } // Only link UserID. Do NOT overwrite Name/Email/Phone from unauthorized input.
                });
            } else {
                // Generate a unique Parent ID
                const count = await tx.parent.count();
                const parentUniqueId = `P${String(count + 1).padStart(4, '0')}`;

                parent = await tx.parent.create({
                    data: {
                        parentUniqueId,
                        fullName,
                        relationship,
                        nationalId,
                        phone,
                        email,
                        userId: user.id
                    }
                });
            }

            await tx.otp.create({
                data: {
                    userId: user.id,
                    codeHash: otpHash,
                    expiresAt: otpExpires,
                    purpose: 'EMAIL_VERIFY'
                }
            });

            return { user, parent };
        });

        try {
            await sendOTPEmail(email, otpCode, 'Email Verification');
        } catch (mailErr) {
            console.error('Mail error in public signup:', mailErr);
        }

        res.status(201).json({
            message: 'Registration successful. Please verify your email.',
            requiresVerification: true,
            userId: result.user.id
        });

    } catch (error) {
        next(error);
    }
};

exports.verifyEmail = async (req, res, next) => {
    try {
        const { userId, otp } = req.body;
        const otpHash = hashToken(otp);

        const validOtp = await prisma.otp.findFirst({
            where: {
                userId: parseInt(userId),
                codeHash: otpHash,
                purpose: 'EMAIL_VERIFY',
                isUsed: false,
                expiresAt: { gte: new Date() }
            }
        });

        if (!validOtp) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: parseInt(userId) },
                data: { isEmailVerified: true, status: 'ACTIVE' }
            }),
            prisma.otp.update({
                where: { id: validOtp.id },
                data: { isUsed: true }
            })
        ]);

        res.json({ message: 'Email verified successfully. You can now login.' });
    } catch (error) {
        next(error);
    }
};

exports.resendVerification = async (req, res, next) => {
    try {
        const { username, email } = req.body;
        const user = await prisma.user.findFirst({
            where: { OR: [{ username }, { email }] }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.isEmailVerified) return res.status(400).json({ message: 'Email already verified' });

        const otpCode = generateOTP();
        const otpHash = hashToken(otpCode);
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.otp.create({
            data: {
                userId: user.id,
                codeHash: otpHash,
                expiresAt: otpExpires,
                purpose: 'EMAIL_VERIFY'
            }
        });

        await sendOTPEmail(user.email || email, otpCode, 'Email Verification');
        res.json({ message: 'A new verification code has been sent to your email.' });
    } catch (error) {
        next(error);
    }
};

exports.getLinkedChildren = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Find parent record linked to this user
        const parentRecord = await prisma.parent.findUnique({
            where: { userId: userId },
            include: {
                student_student_parentIdToparent: {
                    include: {
                        classroom: {
                            include: {
                                teacherprofile: {
                                    where: { designation: 'LEAD' },
                                    include: { user: true }
                                }
                            }
                        },
                        attendance: {
                            orderBy: { attendanceDate: 'desc' },
                            take: 1
                        },
                        studentprogress: {
                            orderBy: { updatedAt: 'desc' },
                            take: 1
                        }
                    }
                }
            }
        });

        if (!parentRecord) {
            return res.status(404).json({ message: 'Parent profile not found' });
        }

        const children = parentRecord.student_student_parentIdToparent.map(child => ({
            id: child.id,
            studentUniqueId: child.studentUniqueId,
            fullName: child.fullName,
            photoUrl: child.photoUrl,
            classroom: child.classroom?.name,
            teacherName: child.classroom?.teacherprofile?.[0]?.user?.fullName || 'N/A',
            lastAttendance: child.attendance[0],
            latestProgress: child.studentprogress[0]
        }));

        res.json(children);
    } catch (error) {
        next(error);
    }
};

exports.getParentBillings = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const parentRecord = await prisma.parent.findUnique({ where: { userId } });

        const students = await prisma.student.findMany({
            where: { parentId: parentRecord.id },
            select: { id: true, fullName: true }
        });

        const studentIds = students.map(s => s.id);

        const billings = await prisma.billing.findMany({
            where: { studentId: { in: studentIds } },
            include: { student: { select: { fullName: true } } },
            orderBy: { billingMonth: 'desc' }
        });

        res.json(billings);
    } catch (error) {
        next(error);
    }
};

exports.getParentProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const parent = await prisma.parent.findUnique({
            where: { userId },
            include: { user: { select: { username: true } } }
        });
        if (!parent) return res.status(404).json({ message: 'Profile not found' });
        res.json(parent);
    } catch (error) {
        next(error);
    }
};

exports.updateParentProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { fullName, phone, email, address, occupation, photoUrl } = req.body;

        const parent = await prisma.parent.findUnique({ where: { userId } });
        if (!parent) return res.status(404).json({ message: 'Profile not found' });

        const updated = await prisma.parent.update({
            where: { id: parent.id },
            data: { fullName, phone, email, address, occupation, photoUrl }
        });

        // Also sync basic info to User record
        await prisma.user.update({
            where: { id: userId },
            data: {
                fullName: fullName || undefined,
                email: email || undefined,
                phone: phone || undefined
            }
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
};
