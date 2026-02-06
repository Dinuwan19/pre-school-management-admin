const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

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
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Debug Middleware: Log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
    next();
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

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
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/events', require('./routes/event.routes'));

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

    // Catch-up logic: If server starts after 9:30 AM, run the attendance check once
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // If it's 9:30 AM or later, trigger the check
    if (currentHour > 9 || (currentHour === 9 && currentMinute >= 30)) {
        const { markAbsentStudents } = require('./services/cron.service');
        console.log('[Server Startup] Past 9:30 AM, running attendance catch-up check...');
        try {
            await markAbsentStudents();
        } catch (err) {
            console.error('[Server Startup] Catch-up attendance failed:', err);
        }
    }
});
