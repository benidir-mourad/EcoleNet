import { useQuery } from '@tanstack/react-query';
import { BarChart2 } from 'lucide-react';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';

export default function StatsPage() {
  const { data: stats } = useQuery({
    queryKey: ['teacher-stats'],
    queryFn: () => api.get('/teacher/stats/overview').then(r => r.data),
  });

  return (
    <TeacherLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Statistiques</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-1">Classes actives</p>
          <p className="text-4xl font-bold text-indigo-600">{stats?.total_classes ?? '...'}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-1">Élèves inscrits</p>
          <p className="text-4xl font-bold text-emerald-600">{stats?.total_students ?? '...'}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-1">Inscriptions en attente</p>
          <p className="text-4xl font-bold text-amber-600">{stats?.pending_enrollments ?? '...'}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-1">Cours créés</p>
          <p className="text-4xl font-bold text-purple-600">{stats?.total_courses ?? '...'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
        <BarChart2 size={48} className="mx-auto mb-4 opacity-30" />
        <p>Les graphiques détaillés par cours seront disponibles prochainement.</p>
      </div>
    </TeacherLayout>
  );
}
