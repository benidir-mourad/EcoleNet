import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, MessageSquare, BarChart2, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import clsx from 'clsx';

const nav = [
  { to: '/teacher/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/teacher/classes', icon: BookOpen, label: 'Classes & Cours' },
  { to: '/teacher/enrollments', icon: Users, label: 'Inscriptions' },
  { to: '/teacher/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/teacher/stats', icon: BarChart2, label: 'Statistiques' },
];

export default function TeacherLayout({ children }) {
  const { logout, user } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-800 text-white flex flex-col">
        <div className="p-6 border-b border-indigo-700">
          <h2 className="text-xl font-bold">EcoleNet</h2>
          <p className="text-indigo-300 text-sm mt-1">{user?.full_name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm font-medium',
                pathname.startsWith(to)
                  ? 'bg-indigo-600 text-white'
                  : 'text-indigo-200 hover:bg-indigo-700'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-indigo-700">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-indigo-200 hover:bg-indigo-700 transition text-sm"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
