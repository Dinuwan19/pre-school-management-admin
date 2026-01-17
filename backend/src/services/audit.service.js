const prisma = require('../config/prisma');

const logAction = async (userId, action) => {
    try {
        await prisma.auditlog.create({
            data: {
                userId,
                action,
                actionTime: new Date()
            }
        });
    } catch (error) {
        console.error('Audit Log Error:', error);
    }
};

module.exports = {
    logAction
};
