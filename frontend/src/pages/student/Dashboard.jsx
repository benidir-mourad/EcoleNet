import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StudentLayout from '../../components/layout/StudentLayout';

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
    onSuccess: () => { qc.invalidateQueries(['student-dashboard']); toast.success("Demande d'inscription envoyée !"); },
    onError: (err) => toast.error(err.response?.data?.message || 'Erreur'),
  });

  const enrollment = data?.enrollment;
  const pending = data?.pending_enrollment;

  if (pending) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto mt-12 bg-white rounded-xl shadow-sm p-8 text-center">
          <Clock size={48} className="mx-auto text-amber-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Inscription en attente</h2>
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
        <div className="max-w-md mx-auto mt-12 bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Rejoindre une classe</h2>
          <p className="text-gray-500 mb-6">Sélectionne ta classe pour accéder aux cours.</p>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">-- Choisir une classe --</option>
            {classesData?.classes?.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          <button
            onClick={() => enroll.mutate()}
            disabled={!selectedClass || enroll.isPending}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-60 font-semibold"
          >
            {enroll.isPending ? 'Envoi...' : "Demander l'inscription"}
          </button>
        </div>
      </StudentLayout>
    );
  }

  const sections = enrollment.school_class?.sections || [];
  const totalCourses = sections.reduce((a, s) => a + (s.courses?.length || 0), 0);
  const totalResources = sections.reduce((a, s) =>
    a + s.courses?.reduce((b, c) => b + (c.resources?.filter(r => r.is_visible).length || 0), 0), 0);

  return (
    <StudentLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        {enrollment.school_class?.name}
      </h1>
      <p className="text-gray-500 mb-8">Bienvenue dans ta classe !</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-emerald-400">
          <p className="text-sm text-gray-500">Sections</p>
          <p className="text-3xl font-bold text-gray-800">{sections.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-400">
          <p className="text-sm text-gray-500">Cours</p>
          <p className="text-3xl font-bold text-gray-800">{totalCourses}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-400">
          <p className="text-sm text-gray-500">Ressources disponibles</p>
          <p className="text-3xl font-bold text-gray-800">{totalResources}</p>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map(section => (
          <div key={section.id} className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">{section.name}</h2>
            <div className="grid gap-2">
              {section.courses?.map(course => (
                <Link key={course.id} to={`/student/courses/${course.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-emerald-50 transition group">
                  <div className="flex items-center gap-3">
                    <BookOpen size={16} className="text-gray-400 group-hover:text-emerald-600" />
                    <span className="text-gray-800 group-hover:text-emerald-700">{course.name}</span>
                  </div>
                  <span className="text-xs text-gray-400">
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
