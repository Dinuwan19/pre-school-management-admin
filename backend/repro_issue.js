const fs = require('fs');
const logFile = './repro_log.txt';
fs.writeFileSync(logFile, '');

const log = (...args) => {
    const msg = args.map(a => {
        if (a instanceof Error) return a.stack || a.message;
        if (typeof a === 'object') return JSON.stringify(a, null, 2);
        return a;
    }).join(' ') + '\n';
    fs.appendFileSync(logFile, msg);
    process.stdout.write(msg);
};

console.log = log;
console.error = log;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dashboardController = require('./src/controllers/dashboard.controller');
const parentAuthController = require('./src/controllers/parent_auth.controller');
const notificationController = require('./src/controllers/notification.controller');

// Mock Request/Response
const req = {
    user: { id: 6, username: 'roshini@example.com', role: 'PARENT' },
    query: {},
    params: {},
    headers: {}
};

const res = {
    json: function (data) {
        log('JSON Response (simulated):', data);
        return this;
    },
    status: function (code) {
        log('Status Code Set:', code);
        return this;
    },
    sendStatus: function (code) {
        log('Send Status:', code);
        return this;
    }
};

const next = (err) => {
    log('NEXT CALLED WITH ERROR:', err);
};

const { checkParentAccess } = require('./src/middlewares/access.middleware');

async function test() {
    try {
        log('--- STARTING TEST ---');

        log('--- Testing checkParentAccess Middleware ---');
        await new Promise((resolve, reject) => {
            checkParentAccess(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        log('Middleware passed.');

        log('Calling getParentStats...');
        await dashboardController.getParentStats(req, res, next);

        log('\n--- Testing getAllNotifications ---');
        // Mocking behavior for notification controller
        const parent = await prisma.parent.findUnique({ where: { userId: 6 } });
        if (parent) {
            const children = await prisma.student.findMany({
                where: { OR: [{ parentId: parent.id }, { secondParentId: parent.id }] }
            });
            const classroomIds = children.map(c => c.classroomId);

            // NOTE: notification controller expects req.classroomScope for teachers, 
            // but for parents it derives from DB.
            // We just need to make sure req.user is set (which it is).
            await notificationController.getAllNotifications(req, res, next);
            log('Mocking classroom scope:', classroomIds);
            // In the actual app, notification controller might expect query params or user id usage
            await notificationController.getAllNotifications(req, res, next);
        } else {
            log('Parent not found for user 6');
        }

        log('\n--- Testing getAllEvents ---');
        // event controller also uses req.user
        const eventController = require('./src/controllers/event.controller');
        await eventController.getAllEvents(req, res, next);

    } catch (e) {
        log('CRASH CAUGHT IN MAIN:', e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
