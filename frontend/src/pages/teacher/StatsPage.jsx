import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart2, Users, BookOpen, Clock, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import TeacherLayout from '../../components/layout/TeacherLayout';

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600',  icon: 'bg-indigo-100'  },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'bg-emerald-100' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   icon: 'bg-amber-100'   },
    purple:  { bg: 'bg-purple-50',  text: 'text-purple-600',  icon: 'bg-purple-100'  },
  };
  const c = colors[color] || colors.indigo;

  return (
    <div className={`${c.bg} rounded-xl p-6 flex items-center gap-4`}>
      <div className={`w-12 h-12 ${c.icon} rounded-xl flex items-center justify-center`}>
        <Icon size={22} className={c.text} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-3xl font-bold ${c.text}`}>{value ?? '…'}</p>
      </div>
    </div>
  );
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6'];

export default function StatsPage() {
  const { data: stats } = useQuery({
    queryKey: ['teacher-stats'],
    queryFn: () => api.get('/teacher/stats/overview').then(r => r.data),
  });

  const { data: coursesData } = useQuery({
    queryKey: ['teacher-stats-courses'],
    queryFn: () => api.get('/teacher/stats/courses').then(r => r.data),
  });

  const courses = coursesData?.courses || [];
  const chartData = courses
    .filter(c => c.qcm_attempts > 0)
    .map(c => ({ name: c.name.length > 20 ? c.name.slice(0, 18) + '…' : c.name, score: c.avg_qcm_percent, attempts: c.qcm_attempts }));

  return (
    <TeacherLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Statistiques</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard label="Classes actives"        value={stats?.total_classes}       icon={BookOpen}   color="indigo"  />
        <StatCard label="Élèves inscrits"        value={stats?.total_students}      icon={Users}      color="emerald" />
        <StatCard label="Inscriptions en attente" value={stats?.pending_enrollments} icon={Clock}      color="amber"   />
        <StatCard label="Cours créés"            value={stats?.total_courses}       icon={TrendingUp}  color="purple"  />
      </div>

      {/* QCM chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Scores QCM moyens par cours</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 60 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                formatter={(v, name) => [
                  name === 'score' ? `${v}%` : v,
                  name === 'score' ? 'Score moyen' : 'Tentatives',
                ]}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-400 py-12">
            <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
            <p>Aucune tentative de QCM enregistrée pour l'instant.</p>
          </div>
        )}
      </div>

      {/* Courses table */}
      {courses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-800">Détail par cours</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cours</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Classe</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tentatives QCM</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Score moyen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {courses.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{c.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.class} — {c.section}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 text-right">{c.qcm_attempts}</td>
                  <td className="px-6 py-4 text-right">
                    {c.qcm_attempts > 0 ? (
                      <span className={`text-sm font-semibold ${c.avg_qcm_percent >= 70 ? 'text-emerald-600' : c.avg_qcm_percent >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {c.avg_qcm_percent}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TeacherLayout>
  );
}
