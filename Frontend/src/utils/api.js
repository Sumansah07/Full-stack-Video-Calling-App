import axios from 'axios';

// API configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4002';

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
    // Remove leading slash if present to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Configure axios defaults
axios.defaults.withCredentials = true;

// Add request interceptor to include auth token
axios.interceptors.request.use(
  (config) => {
    // Get token from localStorage or cookies
    let token = localStorage.getItem("jwt");
    if (!token) {
      // Try to get from cookies as fallback
      const cookies = document.cookie.split(';');
      const jwtCookie = cookies.find(cookie => cookie.trim().startsWith('jwt='));
      if (jwtCookie) {
        token = jwtCookie.split('=')[1];
      }
    }
    
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);