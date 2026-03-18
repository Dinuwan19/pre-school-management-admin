import axios from 'axios';

const apiURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';
const mediaBaseURL = apiURL.replace(/\/api\/?$/, '');

const api = axios.create({
    baseURL: apiURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper to get full URL for media/uploads
export const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${mediaBaseURL}${normalizedPath}`;
};

// Add a request interceptor to inject the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 Unauthorized
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return Promise.reject(error);
        }

        // Extract error message
        const message = error.response?.data?.message || error.message || 'An unexpected error occurred';

        // Log error details for developers
        console.error('[API Error]', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            message: message,
            data: error.response?.data
        });

        // Add the extracted message to the error object for easy access in components
        error.errorMessage = message;

        return Promise.reject(error);
    }
);

export default api;
