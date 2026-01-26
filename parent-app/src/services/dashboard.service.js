import api from '../config/api';

export const getParentDashboardStats = async () => {
    try {
        const response = await api.get('/dashboard/parent-stats');
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch dashboard stats' };
    }
};
