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

// Helper function to get JWT token
export const getAuthToken = () => {
  // First try localStorage
  let token = localStorage.getItem("jwt");
  
  // If not found, try cookies (for development)
  if (!token && typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    const jwtCookie = cookies.find(cookie => cookie.trim().startsWith('jwt='));
    if (jwtCookie) {
      token = jwtCookie.split('=')[1];
    }
  }
  
  // Validate token format (basic JWT structure check)
  if (token && token.split('.').length === 3) {
    return token;
  }
  
  return null;
};