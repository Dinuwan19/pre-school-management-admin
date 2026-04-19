import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const BASE_URL = 'https://malkakulufuturemind.me';
export const PROXY_BASE = `${BASE_URL}/api`;
const API_URL = PROXY_BASE;
export const getApiUrl = () => API_URL;

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
