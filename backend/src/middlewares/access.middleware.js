const prisma = require('../config/prisma');

/**
 * Middleware to restrict Teachers/Staff to their assigned classroom data.
 * Injects req.classroomScope with the assigned ID.
 */
exports.checkClassroomScope = async (req, res, next) => {
    try {
        const user = req.user;
        const role = user?.role?.toUpperCase().trim();

        // If not a teacher/staff, no mandatory scoping (Admin/SuperAdmin can see all)
        if (role !== 'TEACHER' && role !== 'STAFF') {
            return next();
        }

        // Find the teacher profile to get assigned assigned classrooms
        const profile = await prisma.teacherprofile.findUnique({
            where: { teacherId: user.id },
            include: { classrooms: true }
        });

        if (!profile || !profile.classrooms || profile.classrooms.length === 0) {
            // Teachers without a classroom assigned are restricted from data views
            // They can still log in, but many scoped actions will return empty or 403
            req.classroomScope = [];
        } else {
            req.classroomScope = profile.classrooms.map(c => c.id);
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
    if ((req.user.role === 'TEACHER' || req.user.role === 'STAFF') && (!req.classroomScope || req.classroomScope.length === 0)) {
        return res.status(403).json({
            message: 'Access denied: You are not assigned to any classroom. Please contact administrator.'
        });
    }
    next();
};
/**
 * Middleware to restrict Parents to their enrolled children's data.
 * Blocks access if no active children are found.
 */
exports.checkParentAccess = async (req, res, next) => {
    try {
        const user = req.user;
        const role = user?.role?.toUpperCase().trim();

        // Only enforce for PARENT role
        if (role !== 'PARENT') {
            return next();
        }

        // Find the parent profile and their students
        const parent = await prisma.parent.findFirst({
            where: {
                OR: [
                    { userId: user.id },
                    { email: user.username }
                ]
            },
            include: {
                student_student_parentIdToparent: {
                    where: { status: 'ACTIVE' }
                },
                student_student_secondParentIdToparent: {
                    where: { status: 'ACTIVE' }
                }
            }
        });

        if (!parent) {
            console.log(`[Access] Parent profile not found for user: ${user.username}`);
            return res.status(403).json({
                message: 'Access denied: Parent profile not found.',
                reason: 'NO_PROFILE'
            });
        }

        const activeChildren = [
            ...(parent.student_student_parentIdToparent || []),
            ...(parent.student_student_secondParentIdToparent || [])
        ];

        // We no longer block access for parents without active student enrollments.
        // Instead, we allow them to access the app with empty data states.

        // Inject data for scoped controllers
        req.parentProfile = parent;
        req.parentChildrenIds = activeChildren.map(s => s.id);

        next();
    } catch (error) {
        console.error('[Access] Error in parent access middleware:', error);
        res.status(500).json({ message: 'Internal server error in access control' });
    }
};
