import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, CalendarClock, CheckCircle2, Clock, FileText,
  GraduationCap, History, ListChecks, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '../../services/api';
import StudentLayout from '../../components/layout/StudentLayout';

const EXERCISE_ROUTES = {
  qcm: 'qcm',
  drag_drop: 'dragdrop',
  file_upload: 'exercise',
  fill_blanks: 'fill-blanks',
  ordering: 'ordering',
  code_editor: 'code-editor',
  truth_table: 'truth-table',
};

function formatDate(value) {
  if (!value) return 'Sans échéance';
  return new Date(value).toLocaleDateString('fr-BE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function exerciseUrl(item) {
  const route = EXERCISE_ROUTES[item.type];
  return route ? `/student/resources/${item.resource_id}/${route}` : `/student/courses/${item.course_id}`;
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
          <Icon size={19} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value ?? 0}</p>
        </div>
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

function ExerciseList({ items, emptyText }) {
  if (!items?.length) return <EmptyState>{emptyText}</EmptyState>;

  return (
    <div className="space-y-2">
      {items.map(item => (
        <Link
          key={`${item.exercise_id}-${item.resource_id}`}
          to={exerciseUrl(item)}
          className="block rounded-lg border border-gray-100 bg-white p-3 transition hover:border-emerald-200 hover:bg-emerald-50"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-800">{item.title}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500">{item.course_name}</p>
            </div>
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-500">
              {item.submission_status === 'submitted' ? 'Remis' : 'À faire'}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
            <CalendarClock size={13} /> {formatDate(item.deadline)}
          </p>
        </Link>
      ))}
    </div>
  );
}

function ProgressList({ items }) {
  if (!items?.length) return <EmptyState>Aucune progression disponible.</EmptyState>;

  return (
    <div className="space-y-3">
      {items.map(item => (
        <Link key={item.course_id} to={`/student/courses/${item.course_id}`} className="block">
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-gray-700">{item.course_name}</span>
            <span className="text-xs font-semibold text-emerald-700">{item.percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${item.percent}%` }} />
          </div>
          <p className="mt-1 text-xs text-gray-400">{item.viewed} / {item.total} ressources consultées</p>
        </Link>
      ))}
    </div>
  );
}

export default function StudentDashboard() {
  const qc = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('');

  const { data } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => api.get('/student/dashboard').then(r => r.data),
  });

  const { data: classesData } = useQuery({
    queryKey: ['available-classes'],
    queryFn: () => api.get('/student/classes').then(r => r.data),
    enabled: !data?.enrollment && !data?.pending_enrollment,
  });

  const enroll = useMutation({
    mutationFn: () => api.post('/student/enroll', { class_id: selectedClass }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-dashboard'] });
      toast.success("Demande d'inscription envoyée.");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Impossible d’envoyer la demande.')),
  });

  const enrollment = data?.enrollment;
  const pending = data?.pending_enrollment;
  const stats = data?.stats || {};

  if (pending) {
    return (
      <StudentLayout>
        <div className="mx-auto mt-12 max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
          <Clock size={48} className="mx-auto mb-4 text-amber-400" />
          <h2 className="mb-2 text-xl font-bold text-gray-800">Inscription en attente</h2>
          <p className="text-gray-500">
            Ta demande pour <strong>{pending.school_class?.name}</strong> est en cours de validation par le professeur.
          </p>
        </div>
      </StudentLayout>
    );
  }

  if (!enrollment) {
    return (
      <StudentLayout>
        <div className="mx-auto mt-12 max-w-md rounded-lg bg-white p-8 shadow-sm">
          <h2 className="mb-2 text-xl font-bold text-gray-800">Rejoindre une classe</h2>
          <p className="mb-6 text-gray-500">Sélectionne ta classe pour accéder aux cours.</p>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Choisir une classe</option>
            {classesData?.classes?.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          <button
            onClick={() => enroll.mutate()}
            disabled={!selectedClass || enroll.isPending}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {enroll.isPending ? 'Envoi...' : "Demander l'inscription"}
          </button>
        </div>
      </StudentLayout>
    );
  }

  const sections = enrollment.school_class?.sections || [];

  return (
    <StudentLayout>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-sm font-medium text-emerald-700">
            <GraduationCap size={16} /> {enrollment.school_class?.name}
          </p>
          <h1 className="text-2xl font-bold text-gray-800">Tableau de bord élève</h1>
          <p className="mt-1 text-sm text-gray-500">Tes priorités, tes derniers cours et ta progression.</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpen} label="Cours" value={stats.courses} tone="bg-blue-50 text-blue-600" />
        <StatCard icon={FileText} label="Ressources" value={stats.visible_resources} tone="bg-purple-50 text-purple-600" />
        <StatCard icon={ListChecks} label="Exercices à finir" value={stats.pending_exercises} tone="bg-amber-50 text-amber-600" />
        <StatCard icon={CheckCircle2} label="Consultées" value={stats.viewed_resources} tone="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock size={19} className="text-amber-500" />
            <h2 className="font-semibold text-gray-800">Prochaines échéances</h2>
          </div>
          <ExerciseList items={data?.upcoming_deadlines} emptyText="Aucune échéance à venir." />
        </section>

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ListChecks size={19} className="text-emerald-600" />
            <h2 className="font-semibold text-gray-800">Exercices à finir</h2>
          </div>
          <ExerciseList items={data?.exercises_to_finish} emptyText="Tout est à jour pour l’instant." />
        </section>

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <History size={19} className="text-blue-600" />
            <h2 className="font-semibold text-gray-800">Derniers cours consultés</h2>
          </div>
          {data?.recent_resources?.length ? (
            <div className="space-y-2">
              {data.recent_resources.map(item => (
                <Link key={item.resource_id} to={item.url} className="block rounded-lg border border-gray-100 p-3 hover:bg-blue-50">
                  <p className="truncate text-sm font-semibold text-gray-800">{item.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{item.course_name} · {formatDate(item.viewed_at)}</p>
                </Link>
              ))}
            </div>
          ) : <EmptyState>Consulte une ressource pour la retrouver ici.</EmptyState>}
        </section>

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={19} className="text-emerald-600" />
            <h2 className="font-semibold text-gray-800">Progression par matière</h2>
          </div>
          <ProgressList items={data?.progress_by_course} />
        </section>
      </div>

      <div className="mt-6 space-y-4">
        {sections.map(section => (
          <div key={section.id} className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-gray-800">{section.name}</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {section.courses?.map(course => (
                <Link
                  key={course.id}
                  to={`/student/courses/${course.id}`}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition hover:bg-emerald-50"
                >
                  <span className="truncate text-sm font-medium text-gray-800">{course.name}</span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {course.resources?.filter(r => r.is_visible).length || 0} ressources
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </StudentLayout>
  );
}
