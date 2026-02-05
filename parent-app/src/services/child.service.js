import api from '../config/api';

export const getLinkedChildren = async () => {
    try {
        const response = await api.get('/parent-auth/children');
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch children' };
    }
};

export const getStudentDetails = async (studentId, params = {}) => {
    try {
        const response = await api.get(`/students/${studentId}`, { params });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch student details' };
    }
};

export const getChildBillings = async (studentId) => {
    try {
        const response = await api.get('/parent-auth/billings', { params: { studentId } });

        if (Array.isArray(response.data)) {
            return response.data.filter(b => b.studentId === studentId);
        }
        // If it's the new unified object { billings, payments, stats }
        return {
            ...response.data,
            billings: response.data.billings?.filter(b => b.studentId === studentId) || [],
            payments: response.data.payments?.filter(p => true) // All payments for this student context
        };
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch billings' };
    }
};

export const requestMeeting = async (data) => {
    try {
        const response = await api.post('/meetings/request', data);
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

export const getParentProfile = async () => {
    try {
        const response = await api.get('/parent-auth/profile');
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch profile' };
    }
};

export const updateParentProfile = async (data) => {
    try {
        const response = await api.put('/parent-auth/profile', data);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to update profile' };
    }
};
export const updateStudentDetails = async (studentId, data) => {
    try {
        const response = await api.put(`/students/${studentId}`, data);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to update student details' };
    }
};
