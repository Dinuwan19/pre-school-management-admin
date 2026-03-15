import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Android Emulator uses 10.0.2.2 to access host localhost
// For physical device, change this to your PC's LAN IP (e.g., 172.x.x.x)
const API_URL = 'http://192.168.1.5:5000/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach token to every outgoing request
api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response Interceptor: Handle token expiration/rejection automatically
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            const message = error.response.data?.message || '';
            // If the error message explicitly mentions token or jwt, it's a security rejection
            if (message.toLowerCase().includes('token') || message.toLowerCase().includes('jwt')) {
                console.log('[API] Session expired or invalid. Clearing storage.');
                await SecureStore.deleteItemAsync('userToken');
                await SecureStore.deleteItemAsync('userData');
                // The app will remain on current screen, but next action or reload will force Login
            }
        }
        return Promise.reject(error);
    }
);

export default api;
