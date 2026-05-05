import axios from 'axios';
import { APP_URL } from '../config';

export function getApiErrorMessage(error, fallback = 'Une erreur est survenue.') {
  const data = error?.response?.data;

  if (data?.message) {
    return data.message;
  }

  if (data?.errors) {
    const firstField = Object.keys(data.errors)[0];
    const firstError = data.errors[firstField]?.[0];
    if (firstError) return firstError;
  }

  if (error?.code === 'ERR_NETWORK') {
    return 'Impossible de joindre le serveur.';
  }

  return fallback;
}

const api = axios.create({
  baseURL: `${APP_URL}/api`,
  headers: { 'Accept': 'application/json' },
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    error.displayMessage = getApiErrorMessage(error);

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
