import { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, MessageSquare, BarChart2,
  LogOut, Camera, X, Cpu, Library,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';

const nav = [
  { to: '/teacher/dashboard',   icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/teacher/classes',     icon: BookOpen,         label: 'Classes & Cours' },
  { to: '/teacher/library',     icon: Library,          label: 'Bibliothèque'    },
  { to: '/teacher/enrollments', icon: Users,            label: 'Inscriptions'    },
  { to: '/teacher/messages',    icon: MessageSquare,    label: 'Messages'        },
  { to: '/teacher/stats',       icon: BarChart2,        label: 'Statistiques'   },
];

function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuthStore();
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    email:      user?.email      || '',
    password:   '',
    password_confirmation: '',
  });
  const [preview, setPreview] = useState(
    user?.avatar ? `http://localhost:8000/storage/${user.avatar}` : null
  );
  const [avatarFile, setAvatarFile] = useState(null);

  const updateProfile = useMutation({
    mutationFn: (d) => api.put('/profile', d).then(r => r.data),
    onSuccess: (data) => { updateUser(data.user); toast.success('Profil mis à jour'); },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const uploadAvatar = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('avatar', file);
      return api.post('/profile/avatar', fd).then(r => r.data);
    },
    onSuccess: (data) => { updateUser(data.user); toast.success('Photo mise à jour'); },
    onError: () => toast.error('Erreur upload avatar'),
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (avatarFile) await uploadAvatar.mutateAsync(avatarFile);
    const payload = {};
    if (form.first_name !== user?.first_name) payload.first_name = form.first_name;
    if (form.last_name  !== user?.last_name)  payload.last_name  = form.last_name;
    if (form.email      !== user?.email)      payload.email      = form.email;
    if (form.password) {
      payload.password = form.password;
      payload.password_confirmation = form.password_confirmation;
    }
    if (Object.keys(payload).length > 0) await updateProfile.mutateAsync(payload);
    onClose();
  };

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold text-gray-800">Mon profil</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex flex-col items-center gap-3 pb-2">
            <div
              className="relative w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center cursor-pointer group"
              onClick={() => fileRef.current?.click()}
            >
              {preview
                ? <img src={preview} alt="avatar" className="w-20 h-20 rounded-full object-cover" />
                : <span className="text-indigo-700 font-bold text-2xl">{initials}</span>
              }
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Camera size={20} className="text-white" />
              </div>
            </div>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-xs text-indigo-600 hover:underline">
              Changer la photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
              <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
              <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Changer le mot de passe (optionnel)</p>
            <div className="space-y-2">
              <input type="password" placeholder="Nouveau mot de passe" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input type="password" placeholder="Confirmer le mot de passe" value={form.password_confirmation}
                onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              disabled={updateProfile.isPending || uploadAvatar.isPending}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Circuit board SVG ───────────────────────────────────── */
function CircuitDecoration() {
  return (
    <div className="px-4 pb-1 anim-circuit">
      <svg viewBox="0 0 200 52" fill="none" stroke="currentColor" strokeWidth="1.4"
        className="w-full text-white/60">
        <line x1="0"   y1="12" x2="50"  y2="12" />
        <circle cx="50"  cy="12" r="3" fill="currentColor" />
        <line x1="50"  y1="12" x2="50"  y2="28" />
        <line x1="50"  y1="28" x2="90"  y2="28" />
        <rect  x="90"  y="22"  width="28" height="12" rx="2" />
        <line x1="95"  y1="22" x2="95"  y2="16" />
        <line x1="103" y1="22" x2="103" y2="16" />
        <line x1="111" y1="22" x2="111" y2="16" />
        <line x1="95"  y1="34" x2="95"  y2="40" />
        <line x1="103" y1="34" x2="103" y2="40" />
        <line x1="111" y1="34" x2="111" y2="40" />
        <line x1="118" y1="28" x2="160" y2="28" />
        <circle cx="160" cy="28" r="3" fill="currentColor" />
        <line x1="160" y1="28" x2="160" y2="12" />
        <line x1="160" y1="12" x2="200" y2="12" />
        <circle cx="20"  cy="12" r="2" />
        <circle cx="180" cy="12" r="2" />
        <circle cx="75"  cy="28" r="2" />
        <line x1="0"   y1="44" x2="40"  y2="44" />
        <circle cx="40"  cy="44" r="2" />
        <line x1="40"  y1="44" x2="40"  y2="40" />
        <line x1="140" y1="44" x2="200" y2="44" />
        <circle cx="140" cy="44" r="2" />
        <line x1="140" y1="44" x2="140" y2="40" />
      </svg>
    </div>
  );
}

export default function TeacherLayout({ children }) {
  const { logout } = useAuth();
  const { user } = useAuthStore();
  const { pathname } = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();
  const avatarUrl = user?.avatar ? `http://localhost:8000/storage/${user.avatar}` : null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Sidebar ────────────────────────────────── */}
      <aside className="w-64 bg-indigo-900 text-white flex flex-col"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }}
      >
        {/* Logo */}
        <div className="p-5 border-b border-indigo-700/60">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Cpu size={17} className="text-indigo-200" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-indigo-900 anim-pulse-dot" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono leading-tight">
                Ecole<span className="text-indigo-300">Net</span>
              </h2>
              <p className="text-xs text-indigo-400 font-mono">Professeur</p>
            </div>
          </div>

          {/* Profile button */}
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-3 w-full hover:bg-indigo-700/50 rounded-lg p-2 transition text-left"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 overflow-hidden border border-indigo-500">
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="w-9 h-9 object-cover" />
                : <span className="text-sm font-semibold">{initials}</span>
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-indigo-300">Mon profil</p>
            </div>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm font-medium',
                pathname.startsWith(to)
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-indigo-200 hover:bg-indigo-700/60'
              )}
            >
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>

        {/* Circuit + Logout */}
        <div className="border-t border-indigo-700/60">
          <CircuitDecoration />
          <div className="px-4 pb-4">
            <button onClick={logout}
              className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-indigo-300 hover:bg-indigo-700/60 transition text-sm">
              <LogOut size={18} /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <AppHeader color="indigo" />
        <main className="flex-1 overflow-auto">
          <div className="p-8 anim-slide-up">
            {children}
            <AppFooter color="indigo" />
          </div>
        </main>
      </div>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
