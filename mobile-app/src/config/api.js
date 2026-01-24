import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Android Emulator uses 10.0.2.2 to access host localhost
// For physical device, change this to your PC's LAN IP (e.g., 172.x.x.x)
const API_URL = 'http://172.19.56.32:5000/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
