import axios from 'axios';

const apiOrigin = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const baseURL = apiOrigin.endsWith('/api')
  ? apiOrigin
  : `${apiOrigin.replace(/\/$/, '')}/api`;

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      return Promise.reject({
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          'An unexpected error occurred',
        statusCode: error.response?.status || 500,
      });
    }

    return Promise.reject({
      success: false,
      message: 'Network error. Please check your connection.',
      statusCode: 0,
    });
  },
);
