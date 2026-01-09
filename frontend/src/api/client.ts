import axios from "axios";

// VITE_API_URL must be set in Vercel environment variables for production
// In development, use empty string to leverage Vite's proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

console.log('[API] Base URL:', API_BASE_URL || '(using proxy)');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Required for cross-origin cookies
});

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('[API] Success:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('[API] Error:', error.config?.url, error.message, error.response?.data);
    return Promise.reject(error);
  }
);
