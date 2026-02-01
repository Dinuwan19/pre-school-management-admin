const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Log a system action to the database.
 * @param {number|null} userId - The ID of the user performing the action.
 * @param {string} action - Short description of action (e.g., "CREATE_STUDENT")
 * @param {string|object} details - Additional context/data (will be stringified if object)
 */
const logAction = async (userId, action, details = '') => {
    try {
        const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details);
        const fullActionString = `${action} | ${detailsStr}`.trim();

        await prisma.auditlog.create({
            data: {
                userId: userId ? parseInt(userId) : null,
                action: fullActionString,
                actionTime: new Date(),
            },
        });
        // console.log(`📝 Audit Log: [${action}] by User ${userId}`);
    } catch (error) {
        console.error('❌ Audit Log Failed:', error.message);
        // requirement: "System continues operation" even if logging fails
    }
};

module.exports = {
    logAction,
};
