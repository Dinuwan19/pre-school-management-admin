const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('../swagger-output.json');
const authRoutes = require('./routes/auth.routes');
const parentRoutes = require('./routes/parent.routes');
const classroomRoutes = require('./routes/classroom.routes');
const studentRoutes = require('./routes/student.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const staffRoutes = require('./routes/staff.routes');
const notificationRoutes = require('./routes/notification.routes');
const homeworkRoutes = require('./routes/homework.routes');
const billingRoutes = require('./routes/billing.routes');
const billingCategoryRoutes = require('./routes/billingCategory.routes');
const paymentRoutes = require('./routes/payment.routes');
const expenseRoutes = require('./routes/expense.routes'); // Placeholder for now
const dashboardRoutes = require('./routes/dashboard.routes');
const parentAuthRoutes = require('./routes/parent_auth.routes');
const meetingRoutes = require('./routes/meeting.routes');
const auditLogRoutes = require('./routes/auditLog.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());


// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));
app.use('/api/uploads', express.static(uploadsDir)); // For Nginx compatibility

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/billing-categories', billingCategoryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/parent-auth', parentAuthRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/events', require('./routes/event.routes'));
app.use('/api/special-days', require('./routes/specialDay.routes'));
app.use('/api/skills', require('./routes/skill.routes'));

// Swagger Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.json({ message: 'Preschool Management System API is running' });
});

const { initCronJobs } = require('./services/cron.service');

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server is running on port ${PORT}`);
    initCronJobs(); // Initialize Scheduled Jobs

    const dayjs = require('dayjs');
    const utc = require('dayjs/plugin/utc');
    const timezone = require('dayjs/plugin/timezone');
    dayjs.extend(utc);
    dayjs.extend(timezone);

    const now = dayjs().tz('Asia/Colombo');
    const currentHour = now.hour();
    const currentMinute = now.minute();

    // If it's 9:30 AM or later, trigger the check
    if (currentHour > 9 || (currentHour === 9 && currentMinute >= 30)) {
        const { markAbsentStudents } = require('./services/cron.service');
        console.log(`[Server Startup] Past 9:30 AM (Local: ${now.format('HH:mm')}), running attendance catch-up check...`);
        try {
            await markAbsentStudents();
        } catch (err) {
            console.error('[Server Startup] Catch-up attendance failed:', err);
        }
    }
});
