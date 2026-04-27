import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import api from '../../services/api';
import StudentLayout from '../../components/layout/StudentLayout';

export default function ProgressPage() {
  const { data } = useQuery({
    queryKey: ['student-progress'],
    queryFn: () => api.get('/student/progress').then(r => r.data),
  });

  const summary = data?.summary || [];

  return (
    <StudentLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Ma progression</h1>

      <div className="space-y-4">
        {summary.map(item => (
          <div key={item.course_id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">{item.course_name}</h3>
              <span className="text-sm font-bold text-emerald-600">{item.percent}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${item.percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {item.viewed} / {item.total} ressources consultées
              {item.completed > 0 && ` · ${item.completed} complétées`}
            </p>
          </div>
        ))}

        {summary.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
            <TrendingUp size={48} className="mx-auto mb-4 opacity-30" />
            <p>Aucune progression enregistrée pour l'instant.</p>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
