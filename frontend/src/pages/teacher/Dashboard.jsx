import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, Clock, BarChart2 } from 'lucide-react';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';
import { Link } from 'react-router-dom';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value ?? '...'}</p>
        </div>
        <Icon size={32} className="text-gray-300" />
      </div>
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

  return (
    <TeacherLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={BookOpen} label="Classes" value={stats?.total_classes} color="border-indigo-500" />
        <StatCard icon={Users} label="Élèves actifs" value={stats?.total_students} color="border-emerald-500" />
        <StatCard icon={Clock} label="Inscriptions en attente" value={stats?.pending_enrollments} color="border-amber-500" />
        <StatCard icon={BarChart2} label="Cours" value={stats?.total_courses} color="border-purple-500" />
      </div>

      {pending?.enrollments?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Inscriptions en attente</h2>
            <Link to="/teacher/enrollments" className="text-sm text-indigo-600 hover:underline">
              Tout voir
            </Link>
          </div>
          <div className="space-y-3">
            {pending.enrollments.slice(0, 5).map((enrollment) => (
              <div key={enrollment.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div>
                  <p className="font-medium text-gray-800">
                    {enrollment.student?.first_name} {enrollment.student?.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{enrollment.school_class?.name} — {enrollment.student?.email}</p>
                </div>
                <Link
                  to="/teacher/enrollments"
                  className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700"
                >
                  Gérer
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
