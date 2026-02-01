import api from '../config/api';

export const requestMeeting = async (studentId, title, description, requestDate, preferredTime, teacherId) => {
    try {
        const response = await api.post('/meetings/request', {
            studentId,
            title,
            description,
            requestDate,
            preferredTime,
            teacherId
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to request meeting' };
    }
};

export const getParentMeetings = async () => {
    try {
        const response = await api.get('/meetings/parent');
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch meetings' };
    }
};

export const getHomework = async () => {
    try {
        const response = await api.get('/homework');
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch homework' };
    }
};

export const getNotifications = async () => {
    try {
        const response = await api.get('/notifications');
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch notifications' };
    }
};
