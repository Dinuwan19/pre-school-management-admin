import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Replace with your PC's IP address (ipconfig)
// Replace with your PC's IP address (ipconfig)
export const BASE_URL = 'http://192.168.1.3:5000';
const API_URL = `${BASE_URL}/api`;

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('parentToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
