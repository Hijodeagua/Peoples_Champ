import axios from "axios";

type RetriableRequestConfig = {
  __retryCount?: number;
  url?: string;
  [key: string]: unknown;
};

// VITE_API_URL must be set in Vercel environment variables for production
// In development, use empty string to leverage Vite's proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 10000);
const IS_DEV = import.meta.env.DEV;

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 2;

// Warn if in production without API URL configured
if (typeof window !== 'undefined' && !API_BASE_URL && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  console.warn('[API] WARNING: VITE_API_URL is not set in production! API calls will fail.');
  console.warn('[API] Set VITE_API_URL in your Vercel/Netlify environment variables.');
}

if (IS_DEV) {
  console.log('[API] Base URL:', API_BASE_URL || '(using proxy)');
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Required for cross-origin cookies
  timeout: API_TIMEOUT_MS,
});

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    if (IS_DEV) {
      console.log('[API] Success:', response.config.url, response.status);
    }
    return response;
  },
  async (error) => {
    const config = error.config as RetriableRequestConfig | undefined;
    const status = error.response?.status;

    if (config && RETRYABLE_STATUS.has(status) && !config.url?.includes('/auth/')) {
      const retryCount = config.__retryCount || 0;
      if (retryCount < MAX_RETRIES) {
        config.__retryCount = retryCount + 1;
        const backoffMs = Math.min(800 * (retryCount + 1), 1600);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return api.request(config as never);
      }
    }

    if (IS_DEV) {
      console.error('[API] Error:', error.config?.url, error.message, error.response?.data);
    }

    return Promise.reject(error);
  }
);

export default api;
