import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function ProtectedRoute({ children, role }) {
  const { user, token } = useAuthStore();

  if (!token || !user) return <Navigate to="/login" replace />;
  if (role && user.role !== role && !(role === 'teacher' && user.role === 'admin')) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return children;
}
