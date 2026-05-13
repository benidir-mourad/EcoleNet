import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, BarChart2, BookOpen, CheckCircle2, Clock,
  FileCheck2, MessageSquare, TrendingUp, Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`rounded-lg border-l-4 bg-white p-5 shadow-sm ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-800">{value ?? '...'}</p>
        </div>
        <Icon size={30} className="text-gray-300" />
      </div>
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
      {children}
    </div>
  );
}

function formatDate(value) {
  if (!value) return 'Aucune activite';
  return new Date(value).toLocaleDateString('fr-BE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AlertCard({ icon: Icon, label, value, tone }) {
  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <div>
          <p className="text-xs font-medium uppercase opacity-70">{label}</p>
          <p className="text-2xl font-bold">{value ?? 0}</p>
        </div>
      </div>
    </div>
  );
}

function AtRiskStudents({ students }) {
  if (!students?.length) {
    return <EmptyState>Aucun eleve a surveiller pour le moment.</EmptyState>;
  }

  return (
    <div className="space-y-3">
      {students.map(student => (
        <div key={`${student.student_id}-${student.course_id}`} className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{student.student_name}</p>
              <p className="mt-0.5 text-sm text-gray-600">{student.course_name}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white px-2 py-1 text-amber-700">
                  Progression {student.progress_percent}%
                </span>
                <span className="rounded-full bg-white px-2 py-1 text-red-700">
                  {student.overdue_exercises} en retard
                </span>
                <span className="rounded-full bg-white px-2 py-1 text-gray-600">
                  Derniere activite: {formatDate(student.last_activity_at)}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                to={student.course_url}
                className="rounded p-2 text-amber-700 hover:bg-white"
                title="Ouvrir le cours"
              >
                <BookOpen size={18} />
              </Link>
              <Link
                to={student.message_url}
                className="rounded p-2 text-amber-700 hover:bg-white"
                title="Envoyer un message"
              >
                <MessageSquare size={18} />
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CourseHealth({ courses }) {
  if (!courses?.length) return <EmptyState>Aucun cours disponible.</EmptyState>;

  return (
    <div className="space-y-3">
      {courses.map(course => (
        <Link key={course.course_id} to={course.url} className="block rounded-lg border border-gray-100 p-4 hover:bg-indigo-50">
          <div className="mb-2 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">{course.course_name}</p>
              <p className="text-xs text-gray-500">{course.class_name} · {course.students} eleves</p>
            </div>
            <span className="shrink-0 text-sm font-bold text-indigo-700">{course.progress_percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${course.progress_percent}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>{course.visible_resources} ressources visibles</span>
            <span>{course.pending_corrections} corrections en attente</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function RecentSubmissions({ submissions }) {
  if (!submissions?.length) return <EmptyState>Aucun rendu recent.</EmptyState>;

  return (
    <div className="space-y-3">
      {submissions.map(submission => (
        <Link key={submission.submission_id} to={submission.url} className="block rounded-lg border border-gray-100 p-4 hover:bg-emerald-50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">{submission.exercise_title}</p>
              <p className="mt-0.5 text-sm text-gray-500">{submission.student_name} · {submission.course_name}</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
              {submission.status === 'submitted' ? 'A corriger' : submission.status}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">{formatDate(submission.submitted_at)}</p>
        </Link>
      ))}
    </div>
  );
}

export default function TeacherDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['teacher-stats'],
    queryFn: () => api.get('/teacher/stats/overview').then(r => r.data),
  });

  const { data: pending } = useQuery({
    queryKey: ['pending-enrollments'],
    queryFn: () => api.get('/teacher/enrollments/pending').then(r => r.data),
  });

  const alerts = stats?.pedagogical_alerts || {};

  return (
    <TeacherLayout>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-sm font-medium text-indigo-700">
            <TrendingUp size={16} /> Suivi pedagogique
          </p>
          <h1 className="text-2xl font-bold text-gray-800">Tableau de bord professeur</h1>
          <p className="mt-1 text-sm text-gray-500">Les priorites de correction, de progression et d'accompagnement.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/teacher/classes" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white">
            Cours
          </Link>
          <Link to="/teacher/messages" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Messages
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpen} label="Classes" value={stats?.total_classes} color="border-indigo-500" />
        <StatCard icon={Users} label="Eleves actifs" value={stats?.total_students} color="border-emerald-500" />
        <StatCard icon={Clock} label="Inscriptions" value={stats?.pending_enrollments} color="border-amber-500" />
        <StatCard icon={BarChart2} label="Cours" value={stats?.total_courses} color="border-purple-500" />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <AlertCard icon={AlertTriangle} label="Eleves a surveiller" value={alerts.at_risk_students?.length} tone="border-amber-200 bg-amber-50 text-amber-800" />
        <AlertCard icon={FileCheck2} label="Corrections en attente" value={alerts.pending_corrections} tone="border-blue-200 bg-blue-50 text-blue-800" />
        <AlertCard icon={CheckCircle2} label="Inactifs 7 jours" value={alerts.inactive_students} tone="border-red-200 bg-red-50 text-red-800" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-semibold text-gray-800">Eleves a surveiller</h2>
            <Link to="/teacher/messages" className="text-sm font-medium text-indigo-600 hover:underline">
              Contacter
            </Link>
          </div>
          <AtRiskStudents students={alerts.at_risk_students} />
        </section>

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-semibold text-gray-800">Activite recente</h2>
            <Link to="/teacher/stats" className="text-sm font-medium text-indigo-600 hover:underline">
              Statistiques
            </Link>
          </div>
          <RecentSubmissions submissions={stats?.recent_activity?.submissions} />
        </section>

        <section className="rounded-lg bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-semibold text-gray-800">Vue par cours</h2>
            <Link to="/teacher/classes" className="text-sm font-medium text-indigo-600 hover:underline">
              Gerer les cours
            </Link>
          </div>
          <CourseHealth courses={stats?.course_health} />
        </section>
      </div>

      {pending?.enrollments?.length > 0 && (
        <section className="mt-6 rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Inscriptions en attente</h2>
            <Link to="/teacher/enrollments" className="text-sm font-medium text-indigo-600 hover:underline">
              Tout voir
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {pending.enrollments.slice(0, 4).map(enrollment => (
              <div key={enrollment.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-800">
                    {enrollment.student?.first_name} {enrollment.student?.last_name}
                  </p>
                  <p className="truncate text-sm text-gray-500">{enrollment.school_class?.name} · {enrollment.student?.email}</p>
                </div>
                <Link to="/teacher/enrollments" className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700">
                  Gerer
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </TeacherLayout>
  );
}
