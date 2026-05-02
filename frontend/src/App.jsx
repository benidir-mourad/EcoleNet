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
import TeacherForumPage from './pages/teacher/ForumPage';
import DragDropBuilderPage from './pages/teacher/DragDropBuilderPage';
import SubmissionsPage from './pages/teacher/SubmissionsPage';
import ExerciseEditorPage from './pages/teacher/ExerciseEditorPage';
import FillBlanksBuilderPage from './pages/teacher/FillBlanksBuilderPage';
import OrderingBuilderPage from './pages/teacher/OrderingBuilderPage';
import CodeEditorBuilderPage from './pages/teacher/CodeEditorBuilderPage';
import TruthTableBuilderPage from './pages/teacher/TruthTableBuilderPage';

import StudentDashboard from './pages/student/Dashboard';
import CoursePage from './pages/student/CoursePage';
import QcmPage from './pages/student/QcmPage';
import ProgressPage from './pages/student/ProgressPage';
import StudentMessagesPage from './pages/student/MessagesPage';
import StudentForumPage from './pages/student/ForumPage';
import DragDropPage from './pages/student/DragDropPage';
import ExercisePage from './pages/student/ExercisePage';
import FillBlanksPage from './pages/student/FillBlanksPage';
import OrderingPage from './pages/student/OrderingPage';
import CodeEditorPage from './pages/student/CodeEditorPage';
import TruthTablePage from './pages/student/TruthTablePage';

import AdminDashboard from './pages/admin/Dashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

function T(component) {
  return <ProtectedRoute role="teacher">{component}</ProtectedRoute>;
}
function S(component) {
  return <ProtectedRoute role="student">{component}</ProtectedRoute>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/"         element={<Navigate to="/login" replace />} />

          {/* Teacher */}
          <Route path="/teacher/dashboard"                        element={T(<TeacherDashboard />)} />
          <Route path="/teacher/classes"                          element={T(<ClassesPage />)} />
          <Route path="/teacher/classes/:classId"                 element={T(<ClassDetailPage />)} />
          <Route path="/teacher/courses/:courseId"                element={T(<CourseDetailPage />)} />
          <Route path="/teacher/courses/:courseId/forum"          element={T(<TeacherForumPage />)} />
          <Route path="/teacher/enrollments"                      element={T(<EnrollmentsPage />)} />
          <Route path="/teacher/messages"                         element={T(<TeacherMessagesPage />)} />
          <Route path="/teacher/stats"                            element={T(<StatsPage />)} />
          <Route path="/teacher/resources/:resourceId/qcm"          element={T(<QcmBuilderPage />)} />
          <Route path="/teacher/resources/:resourceId/dragdrop"     element={T(<DragDropBuilderPage />)} />
          <Route path="/teacher/resources/:resourceId/submissions"     element={T(<SubmissionsPage />)} />
          <Route path="/teacher/resources/:resourceId/exercise-editor" element={T(<ExerciseEditorPage />)} />
          <Route path="/teacher/resources/:resourceId/fill-blanks"    element={T(<FillBlanksBuilderPage />)} />
          <Route path="/teacher/resources/:resourceId/ordering"       element={T(<OrderingBuilderPage />)} />
          <Route path="/teacher/resources/:resourceId/code-editor"    element={T(<CodeEditorBuilderPage />)} />
          <Route path="/teacher/resources/:resourceId/truth-table"    element={T(<TruthTableBuilderPage />)} />

          {/* Student */}
          <Route path="/student/dashboard"                        element={S(<StudentDashboard />)} />
          <Route path="/student/courses/:courseId"                element={S(<CoursePage />)} />
          <Route path="/student/courses/:courseId/forum"          element={S(<StudentForumPage />)} />
          <Route path="/student/resources/:resourceId/qcm"          element={S(<QcmPage />)} />
          <Route path="/student/resources/:resourceId/dragdrop"     element={S(<DragDropPage />)} />
          <Route path="/student/resources/:resourceId/exercise"      element={S(<ExercisePage />)} />
          <Route path="/student/resources/:resourceId/fill-blanks"  element={S(<FillBlanksPage />)} />
          <Route path="/student/resources/:resourceId/ordering"     element={S(<OrderingPage />)} />
          <Route path="/student/resources/:resourceId/code-editor"  element={S(<CodeEditorPage />)} />
          <Route path="/student/resources/:resourceId/truth-table"  element={S(<TruthTablePage />)} />
          <Route path="/student/progress"                         element={S(<ProgressPage />)} />
          <Route path="/student/messages"                         element={S(<StudentMessagesPage />)} />

          {/* Admin */}
          <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
