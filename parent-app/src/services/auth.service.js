import api from '../config/api';
import * as SecureStore from 'expo-secure-store';

export const login = async (username, password) => {
    try {
        const response = await api.post('/auth/login', { username, password });
        if (response.data.token) {
            await SecureStore.setItemAsync('parentToken', response.data.token);
            await SecureStore.setItemAsync('parentUser', JSON.stringify(response.data.user));
        }
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Network error' };
    }
};

export const signup = async (data, isPublic = false) => {
    try {
        const endpoint = isPublic ? '/parent-auth/public-signup' : '/parent-auth/signup';
        const response = await api.post(endpoint, data);
        if (response.data.token && !response.data.requiresVerification) {
            await SecureStore.setItemAsync('parentToken', response.data.token);
            await SecureStore.setItemAsync('parentUser', JSON.stringify(response.data.user));
        }
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Network error' };
    }
};

export const logout = async () => {
    await SecureStore.deleteItemAsync('parentToken');
    await SecureStore.deleteItemAsync('parentUser');
};

export const getParentUser = async () => {
    const user = await SecureStore.getItemAsync('parentUser');
    return user ? JSON.parse(user) : null;
};
export const changePassword = async (currentPassword, newPassword) => {
    try {
        const response = await api.post('/auth/change-password', { currentPassword, newPassword });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to update password' };
    }
};
