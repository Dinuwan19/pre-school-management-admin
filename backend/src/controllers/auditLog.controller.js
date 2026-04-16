const prisma = require('../config/prisma');

/**
 * Get all system audit logs.
 * Restricted to SUPER_ADMIN.
 */
exports.getAuditLogs = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, action } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let where = {};
        if (action) {
            where.action = { contains: action };
        }

        const [logs, total] = await Promise.all([
            prisma.auditlog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            username: true,
                            fullName: true,
                            role: true
                        }
                    }
                },
                orderBy: {
                    actionTime: 'desc'
                },
                skip,
                take: parseInt(limit)
            }),
            prisma.auditlog.count({ where })
        ]);

        res.json({
            data: logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};
