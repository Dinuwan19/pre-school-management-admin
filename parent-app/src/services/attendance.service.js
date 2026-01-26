import api from '../config/api';

export const getStudentAttendanceSummary = async (studentId) => {
    try {
        const response = await api.get(`/attendance/student-summary/${studentId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch attendance summary' };
    }
};
