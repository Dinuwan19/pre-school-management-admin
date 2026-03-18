import api from './client';
import { message } from 'antd';

// Shared error handler
const handleApiError = (error, defaultMessage, showToast = true) => {
    const errMsg = error.response?.data?.message || defaultMessage;
    if (showToast) message.error(errMsg);
    throw error;
};

// ==========================================
// AUTHENTICATION & USERS
// ==========================================

export const loginUser = async (credentials) => {
    try {
        const response = await api.post('/auth/login', credentials);
        return response;
    } catch (error) {
        return handleApiError(error, 'Login failed');
    }
};

export const fetchCurrentUser = async () => {
    try {
        const response = await api.get('/auth/me');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch user context');
    }
};

export const changePassword = async (data) => {
    try {
        const response = await api.post('/auth/change-password', data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to update password');
    }
};

export const requestOtp = async (data) => {
    try {
        const response = await api.post('/auth/forgot-password', data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to send OTP');
    }
};

export const validateOtp = async (data) => {
    try {
        const response = await api.post('/auth/validate-otp', data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Verification failed');
    }
};

export const verifyOtpResetPassword = async (data) => {
    try {
        const response = await api.post('/auth/verify-otp', data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Reset failed');
    }
};

export const executePasswordReset = async (token, newPassword) => {
    try {
        const response = await api.post('/auth/reset-password', { token, newPassword });
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to reset password');
    }
};

// ==========================================
// DASHBOARD & REPORTS
// ==========================================

export const fetchDashboardStats = async () => {
    try {
        const response = await api.get('/dashboard/stats');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to load stats', false);
    }
};

// ==========================================
// STUDENTS
// ==========================================

export const fetchStudents = async () => {
    try {
        const response = await api.get('/students');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch students', false);
    }
};

export const fetchStudentById = async (id) => {
    try {
        const response = await api.get(`/students/${id}`);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch student details', false);
    }
};

export const createStudent = async (formData) => {
    try {
        const response = await api.post('/students', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to create student');
    }
};

export const updateStudent = async (id, formData) => {
    try {
        const response = await api.put(`/students/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to update student');
    }
};

export const updateStudentProgress = async (id, data) => {
    try {
        const response = await api.put(`/students/${id}/progress`, data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to update progress');
    }
};

export const fetchStudentSkillsMetadata = async () => {
    try {
        const response = await api.get('/students/metadata/skills');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch skills metadata', false);
    }
};

export const createSubSkill = async (categoryId, data) => {
    try {
        const response = await api.post(`/students/metadata/skills/${categoryId}/subskills`, data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to create subskill');
    }
};

// ==========================================
// PARENTS
// ==========================================

export const fetchParents = async () => {
    try {
        const response = await api.get('/parents');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch parents', false);
    }
};

export const fetchParentById = async (id) => {
    try {
        const response = await api.get(`/parents/${id}`);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch parent details', false);
    }
};

export const createParent = async (data) => {
    try {
        const response = await api.post('/parents', data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to create parent');
    }
};

export const updateParent = async (id, data) => {
    try {
        const response = await api.put(`/parents/${id}`, data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to update parent');
    }
};

// ==========================================
// CLASSROOMS
// ==========================================

export const fetchClassrooms = async () => {
    try {
        const response = await api.get('/classrooms');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch classrooms', false);
    }
};

export const fetchClassroomById = async (id) => {
    try {
        const response = await api.get(`/classrooms/${id}`);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch classroom details', false);
    }
};

export const createClassroom = async (data) => {
    try {
        const response = await api.post('/classrooms', data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to create classroom');
    }
};

export const updateClassroom = async (id, data) => {
    try {
        const response = await api.put(`/classrooms/${id}`, data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to update classroom');
    }
};

export const assignTeacherToClassroom = async (classroomId, data) => {
    try {
        const response = await api.post(`/classrooms/${classroomId}/teachers`, data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to assign teacher');
    }
};

// ==========================================
// STAFF
// ==========================================

export const fetchStaff = async () => {
    try {
        const response = await api.get('/staff');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch staff', false);
    }
};

export const fetchStaffById = async (id) => {
    try {
        const response = await api.get(`/staff/${id}`);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch staff details', false);
    }
};

export const createStaff = async (data) => {
    try {
        const response = await api.post('/staff', data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to add staff');
    }
};

export const updateStaff = async (id, data) => {
    try {
        const response = await api.put(`/staff/${id}`, data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to update staff');
    }
};

// ==========================================
// ATTENDANCE
// ==========================================

export const fetchStudentAttendance = async (id) => {
    try {
        const response = await api.get(`/attendance/student/${id}`);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch attendance', false);
    }
};

export const scanAttendance = async (data) => {
    try {
        const response = await api.post('/attendance/scan', data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to record attendance');
    }
};

// ==========================================
// BILLING & EXPENSES
// ==========================================

export const fetchBillingList = async () => {
    try {
        const response = await api.get('/billing');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch billing list', false);
    }
};

export const fetchPendingPayments = async () => {
    try {
        const response = await api.get('/payments/pending');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch pending payments', false);
    }
};

export const fetchOverdueBilling = async () => {
    try {
        const response = await api.get('/billing/overdue');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch overdue billing', false);
    }
};

export const fetchPaymentHistory = async () => {
    try {
        const response = await api.get('/payments/history');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch payment history', false);
    }
};

export const generateBilling = async (payload) => {
    try {
        const response = await api.post('/billing/generate', payload);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to generate bills');
    }
};

export const verifyPayment = async (data) => {
    try {
        const response = await api.post('/payments/verify', data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to verify payment');
    }
};

export const notifyBilling = async (data) => {
    try {
        const response = await api.post('/billing/notify', data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to send notification');
    }
};

export const payBillingCash = async (data) => {
    try {
        const response = await api.post('/billing/pay-cash', data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to process cash payment');
    }
};

export const fetchBillingStats = async () => {
    try {
        const response = await api.get('/billing/dashboard-stats');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch billing stats', false);
    }
};

export const fetchExpenses = async () => {
    try {
        const response = await api.get('/expenses');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch expenses', false);
    }
};

export const fetchExpenseSummary = async () => {
    try {
        const response = await api.get('/expenses/summary');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch expense summary', false);
    }
};

export const createExpense = async (formData) => {
    try {
        const response = await api.post('/expenses', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to create expense');
    }
};

// ==========================================
// BILLING CATEGORIES
// ==========================================

export const fetchBillingCategories = async () => {
    try {
        const response = await api.get('/billing-categories');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch billing categories', false);
    }
};

export const fetchActiveBillingCategories = async () => {
    try {
        const response = await api.get('/billing-categories?activeOnly=true');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch active categories', false);
    }
};

export const fetchBillingCategoryStats = async (id) => {
    try {
        const response = await api.get(`/billing-categories/${id}/stats`);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch category stats', false);
    }
};

export const createBillingCategory = async (payload) => {
    try {
        const response = await api.post('/billing-categories', payload);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to create billing category');
    }
};

export const deleteBillingCategory = async (id) => {
    try {
        const response = await api.delete(`/billing-categories/${id}`);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to delete billing category');
    }
};

// ==========================================
// ANNOUNCEMENTS & MEETINGS
// ==========================================

export const fetchMeetingRequests = async (endpoint) => {
    try {
        const response = await api.get(endpoint);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch meetings', false);
    }
};

export const updateMeetingStatus = async (id, status) => {
    try {
        const response = await api.put(`/meetings/${id}/status`, { status });
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to update meeting status');
    }
};

export const fetchNotifications = async () => {
    try {
        const response = await api.get('/notifications');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch notifications', false);
    }
};

export const createNotification = async (data) => {
    try {
        const response = await api.post('/notifications', data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to create notification');
    }
};

export const deleteNotification = async (id) => {
    try {
        const response = await api.delete(`/notifications/${id}`);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to delete notification');
    }
};

// ==========================================
// ACADEMIC (HOMEWORK & ATTENDANCE)
// ==========================================

export const fetchHomework = async () => {
    try {
        const response = await api.get('/homework');
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch homework', false);
    }
};

export const createHomework = async (data) => {
    try {
        const response = await api.post('/homework', data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to create homework');
    }
};

export const deleteHomework = async (id) => {
    try {
        const response = await api.delete(`/homework/${id}`);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to delete homework');
    }
};

export const fetchDailyAttendance = async (date) => {
    try {
        const response = await api.get(`/attendance/daily?date=${date}`);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to fetch daily attendance', false);
    }
};

export const submitBulkAttendance = async (data) => {
    try {
        const response = await api.post('/attendance/bulk', data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to submit bulk attendance');
    }
};

export const submitManualAttendance = async (data) => {
    try {
        const response = await api.post('/attendance/manual', data);
        return response;
    } catch (error) {
        return handleApiError(error, 'Failed to submit manual attendance');
    }
};
