import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export function useAuth() {
  const { user, token, setAuth, logout: clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/login', { email, password });
    setAuth(data.user, data.token);
    redirectByRole(data.user.role, navigate);
    return data;
  }, [setAuth, navigate]);

  const register = useCallback(async (formData) => {
    const { data } = await api.post('/register', formData);
    navigate('/login');
    return data;
  }, [navigate]);

  const logout = useCallback(async () => {
    try { await api.post('/logout'); } catch {
      // Local cleanup still needs to happen if the token is already invalid.
    }
    clearAuth();
    navigate('/login');
  }, [clearAuth, navigate]);

  return { user, token, login, register, logout, isAuthenticated: !!token };
}

function redirectByRole(role, navigate) {
  const routes = { teacher: '/teacher/dashboard', student: '/student/dashboard', admin: '/admin/dashboard' };
  navigate(routes[role] || '/login');
}
