import api from '../config/api';
import * as SecureStore from 'expo-secure-store';

export const login = async (username, password) => {
    try {
        const response = await api.post('/auth/login', { username, password });
        if (response.data.token) {
            await SecureStore.setItemAsync('userToken', response.data.token);
            await SecureStore.setItemAsync('userData', JSON.stringify(response.data.user)); // Store user info (role, name)
        }
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : { message: 'Network Error' };
    }
};

export const logout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');
};

export const getUser = async () => {
    const userData = await SecureStore.getItemAsync('userData');
    return userData ? JSON.parse(userData) : null;
};
