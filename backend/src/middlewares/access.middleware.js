const prisma = require('../config/prisma');

/**
 * Middleware to restrict Teachers/Staff to their assigned classroom data.
 * Injects req.classroomScope with the assigned ID.
 */
exports.checkClassroomScope = async (req, res, next) => {
    try {
        const user = req.user;

        // If not a teacher/staff, no mandatory scoping (Admin/SuperAdmin can see all)
        if (user.role !== 'TEACHER' && user.role !== 'STAFF') {
            return next();
        }

        // Find the teacher profile to get assigned classroom
        const profile = await prisma.teacherprofile.findUnique({
            where: { teacherId: user.id }
        });

        if (!profile || !profile.assignedClassroomId) {
            // Teachers without a classroom assigned are restricted from data views
            // They can still log in, but many scoped actions will return empty or 403
            req.classroomScope = null;
        } else {
            req.classroomScope = profile.assignedClassroomId;
        }

        console.log(`[Access] User ${user.username} scoped to classroom: ${req.classroomScope || 'NONE'}`);
        next();
    } catch (error) {
        console.error('[Access] Error in classroom scoping middleware:', error);
        res.status(500).json({ message: 'Internal server error in access control' });
    }
};

/**
 * Mandatory Scoping: Block access if no classroom is assigned for teachers
 */
exports.requireClassroom = (req, res, next) => {
    if ((req.user.role === 'TEACHER' || req.user.role === 'STAFF') && !req.classroomScope) {
        return res.status(403).json({
            message: 'Access denied: You are not assigned to any classroom. Please contact administrator.'
        });
    }
    next();
};
