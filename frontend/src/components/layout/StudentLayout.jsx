import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, MessageSquare, TrendingUp, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import clsx from 'clsx';

const nav = [
  { to: '/student/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/student/courses', icon: BookOpen, label: 'Mes cours' },
  { to: '/student/progress', icon: TrendingUp, label: 'Ma progression' },
  { to: '/student/messages', icon: MessageSquare, label: 'Messages' },
];

export default function StudentLayout({ children }) {
  const { logout, user } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-emerald-800 text-white flex flex-col">
        <div className="p-6 border-b border-emerald-700">
          <h2 className="text-xl font-bold">EcoleNet</h2>
          <p className="text-emerald-300 text-sm mt-1">{user?.full_name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm font-medium',
                pathname.startsWith(to)
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-200 hover:bg-emerald-700'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-emerald-700">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-emerald-200 hover:bg-emerald-700 transition text-sm"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
