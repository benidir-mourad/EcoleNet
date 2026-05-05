import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import ProtectedRoute from './components/layout/ProtectedRoute';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));

const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'));
const ClassesPage = lazy(() => import('./pages/teacher/ClassesPage'));
const ClassDetailPage = lazy(() => import('./pages/teacher/ClassDetailPage'));
const CourseDetailPage = lazy(() => import('./pages/teacher/CourseDetailPage'));
const EnrollmentsPage = lazy(() => import('./pages/teacher/EnrollmentsPage'));
const TeacherMessagesPage = lazy(() => import('./pages/teacher/MessagesPage'));
const StatsPage = lazy(() => import('./pages/teacher/StatsPage'));
const QcmBuilderPage = lazy(() => import('./pages/teacher/QcmBuilderPage'));
const TeacherForumPage = lazy(() => import('./pages/teacher/ForumPage'));
const DragDropBuilderPage = lazy(() => import('./pages/teacher/DragDropBuilderPage'));
const SubmissionsPage = lazy(() => import('./pages/teacher/SubmissionsPage'));
const ExerciseEditorPage = lazy(() => import('./pages/teacher/ExerciseEditorPage'));
const LibraryPage = lazy(() => import('./pages/teacher/LibraryPage'));
const FillBlanksBuilderPage = lazy(() => import('./pages/teacher/FillBlanksBuilderPage'));
const OrderingBuilderPage = lazy(() => import('./pages/teacher/OrderingBuilderPage'));
const CodeEditorBuilderPage = lazy(() => import('./pages/teacher/CodeEditorBuilderPage'));
const TruthTableBuilderPage = lazy(() => import('./pages/teacher/TruthTableBuilderPage'));

const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const CoursePage = lazy(() => import('./pages/student/CoursePage'));
const QcmPage = lazy(() => import('./pages/student/QcmPage'));
const ProgressPage = lazy(() => import('./pages/student/ProgressPage'));
const StudentMessagesPage = lazy(() => import('./pages/student/MessagesPage'));
const StudentForumPage = lazy(() => import('./pages/student/ForumPage'));
const DragDropPage = lazy(() => import('./pages/student/DragDropPage'));
const ExercisePage = lazy(() => import('./pages/student/ExercisePage'));
const FillBlanksPage = lazy(() => import('./pages/student/FillBlanksPage'));
const OrderingPage = lazy(() => import('./pages/student/OrderingPage'));
const CodeEditorPage = lazy(() => import('./pages/student/CodeEditorPage'));
const TruthTablePage = lazy(() => import('./pages/student/TruthTablePage'));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

function T(component) {
  return <ProtectedRoute role="teacher"><Page>{component}</Page></ProtectedRoute>;
}
function S(component) {
  return <ProtectedRoute role="student"><Page>{component}</Page></ProtectedRoute>;
}
function A(component) {
  return <ProtectedRoute role="admin"><Page>{component}</Page></ProtectedRoute>;
}
function Page({ children }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<Page><LoginPage /></Page>} />
          <Route path="/register" element={<Page><RegisterPage /></Page>} />
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
          <Route path="/teacher/library"                              element={T(<LibraryPage />)} />

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
          <Route path="/admin/dashboard" element={A(<AdminDashboard />)} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
