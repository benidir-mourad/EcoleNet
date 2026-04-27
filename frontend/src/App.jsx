import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import TeacherDashboard from './pages/teacher/Dashboard';
import ClassesPage from './pages/teacher/ClassesPage';
import ClassDetailPage from './pages/teacher/ClassDetailPage';
import CourseDetailPage from './pages/teacher/CourseDetailPage';
import EnrollmentsPage from './pages/teacher/EnrollmentsPage';
import TeacherMessagesPage from './pages/teacher/MessagesPage';
import StatsPage from './pages/teacher/StatsPage';
import QcmBuilderPage from './pages/teacher/QcmBuilderPage';
import StudentDashboard from './pages/student/Dashboard';
import CoursePage from './pages/student/CoursePage';
import QcmPage from './pages/student/QcmPage';
import ProgressPage from './pages/student/ProgressPage';
import StudentMessagesPage from './pages/student/MessagesPage';
import AdminDashboard from './pages/admin/Dashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Teacher */}
          <Route path="/teacher/dashboard" element={
            <ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/classes" element={
            <ProtectedRoute role="teacher"><ClassesPage /></ProtectedRoute>} />
          <Route path="/teacher/classes/:classId" element={
            <ProtectedRoute role="teacher"><ClassDetailPage /></ProtectedRoute>} />
          <Route path="/teacher/courses/:courseId" element={
            <ProtectedRoute role="teacher"><CourseDetailPage /></ProtectedRoute>} />
          <Route path="/teacher/enrollments" element={
            <ProtectedRoute role="teacher"><EnrollmentsPage /></ProtectedRoute>} />
          <Route path="/teacher/messages" element={
            <ProtectedRoute role="teacher"><TeacherMessagesPage /></ProtectedRoute>} />
          <Route path="/teacher/stats" element={
            <ProtectedRoute role="teacher"><StatsPage /></ProtectedRoute>} />
          <Route path="/teacher/resources/:resourceId/qcm" element={
            <ProtectedRoute role="teacher"><QcmBuilderPage /></ProtectedRoute>} />

          {/* Student */}
          <Route path="/student/dashboard" element={
            <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/courses/:courseId" element={
            <ProtectedRoute role="student"><CoursePage /></ProtectedRoute>} />
          <Route path="/student/resources/:resourceId/qcm" element={
            <ProtectedRoute role="student"><QcmPage /></ProtectedRoute>} />
          <Route path="/student/progress" element={
            <ProtectedRoute role="student"><ProgressPage /></ProtectedRoute>} />
          <Route path="/student/messages" element={
            <ProtectedRoute role="student"><StudentMessagesPage /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
