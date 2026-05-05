export const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8000';

export function storageUrl(path) {
  return `${APP_URL}/storage/${path}`;
}
