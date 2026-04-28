import { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, MessageSquare, LogOut, Camera, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

const nav = [
  { to: '/student/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/student/progress',  icon: TrendingUp,       label: 'Ma progression'  },
  { to: '/student/messages',  icon: MessageSquare,    label: 'Messages'        },
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
              className="relative w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center cursor-pointer group"
              onClick={() => fileRef.current?.click()}
            >
              {preview
                ? <img src={preview} alt="avatar" className="w-20 h-20 rounded-full object-cover" />
                : <span className="text-emerald-700 font-bold text-2xl">{initials}</span>
              }
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Camera size={20} className="text-white" />
              </div>
            </div>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-xs text-emerald-600 hover:underline">
              Changer la photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
              <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
              <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Changer le mot de passe (optionnel)</p>
            <div className="space-y-2">
              <input type="password" placeholder="Nouveau mot de passe" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input type="password" placeholder="Confirmer le mot de passe" value={form.password_confirmation}
                onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              disabled={updateProfile.isPending || uploadAvatar.isPending}
              className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-60">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StudentLayout({ children }) {
  const { logout } = useAuth();
  const { user } = useAuthStore();
  const { pathname } = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();
  const avatarUrl = user?.avatar ? `http://localhost:8000/storage/${user.avatar}` : null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-emerald-800 text-white flex flex-col">
        <div className="p-5 border-b border-emerald-700">
          <h2 className="text-xl font-bold mb-3">EcoleNet</h2>
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-3 w-full hover:bg-emerald-700 rounded-lg p-2 transition text-left"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 overflow-hidden">
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="w-9 h-9 object-cover" />
                : <span className="text-sm font-semibold">{initials}</span>
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-emerald-300">Mon profil</p>
            </div>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm font-medium',
                pathname.startsWith(to)
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-200 hover:bg-emerald-700'
              )}
            >
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-emerald-700">
          <button onClick={logout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-emerald-200 hover:bg-emerald-700 transition text-sm">
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
