import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, Search, Shield, UserX, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import api, { getApiErrorMessage } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';

const STATUS_LABELS = { pending: 'En attente', active: 'Actif', inactive: 'Inactif' };
const ROLE_LABELS = { admin: 'Admin', teacher: 'Professeur', student: 'Élève' };
const STATUS_CLASSES = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
};

function AdminLayout({ children }) {
  const { logout } = useAuth();
  const { user } = useAuthStore();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold">EcoleNet Admin</h2>
          <p className="text-gray-400 text-sm mt-1">{user?.full_name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link to="/admin/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 text-sm">
            <Users size={18} /> Utilisateurs
          </Link>
          <Link to="/teacher/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 text-sm">
            <Shield size={18} /> Vue professeur
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button onClick={logout} className="text-gray-400 hover:text-white text-sm px-4 py-2 w-full text-left">
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}

export default function AdminDashboard() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data } = useQuery({
    queryKey: ['admin-users', search, roleFilter, statusFilter],
    queryFn: () => api.get('/admin/users', {
      params: {
        search,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      },
    }).then(r => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/users/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Statut mis à jour');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Impossible de mettre à jour le statut')),
  });

  const deleteUser = useMutation({
    mutationFn: (id) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Utilisateur supprimé');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Impossible de supprimer l’utilisateur')),
  });

  const users = data?.users?.data || [];
  const pendingUsers = users.filter(u => u.status === 'pending');
  const counts = users.reduce((acc, user) => {
    acc[user.status] = (acc[user.status] || 0) + 1;
    return acc;
  }, { pending: 0, active: 0, inactive: 0 });

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Gestion des utilisateurs</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatusCard active={statusFilter === 'pending'} icon={Clock} label="Comptes en attente" value={counts.pending} tone="amber" onClick={() => setStatusFilter('pending')} />
        <StatusCard active={statusFilter === 'active'} icon={CheckCircle} label="Comptes actifs" value={counts.active} tone="green" onClick={() => setStatusFilter('active')} />
        <StatusCard active={statusFilter === 'inactive'} icon={UserX} label="Comptes inactifs" value={counts.inactive} tone="gray" onClick={() => setStatusFilter('inactive')} />
      </div>

      {pendingUsers.length > 0 && !statusFilter && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-amber-900">Demandes en attente</h2>
              <p className="text-sm text-amber-700">Validez ou refusez rapidement les nouveaux comptes.</p>
            </div>
            <button onClick={() => setStatusFilter('pending')} className="text-sm font-medium text-amber-800 hover:underline">
              Voir tout
            </button>
          </div>
          <div className="grid gap-2">
            {pendingUsers.slice(0, 4).map(u => (
              <div key={u.id} className="bg-white rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{u.first_name} {u.last_name}</p>
                  <p className="text-sm text-gray-500">{u.email} · {ROLE_LABELS[u.role]}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateStatus.mutate({ id: u.id, status: 'active' })}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Valider
                  </button>
                  <button onClick={() => updateStatus.mutate({ id: u.id, status: 'inactive' })}
                    className="px-3 py-1.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500">
          <option value="">Tous les rôles</option>
          <option value="teacher">Professeur</option>
          <option value="student">Élève</option>
          <option value="admin">Admin</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-500">
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
        </select>
        {(roleFilter || statusFilter || search) && (
          <button onClick={resetFilters}
            className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
            Réinitialiser
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nom</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rôle</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-800">{u.first_name} {u.last_name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{ROLE_LABELS[u.role]}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_CLASSES[u.status]}`}>
                    {STATUS_LABELS[u.status]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 justify-end">
                    {u.status === 'pending' && (
                      <button onClick={() => updateStatus.mutate({ id: u.id, status: 'active' })}
                        className="text-sm bg-green-600 text-white rounded px-3 py-1 hover:bg-green-700">
                        Valider
                      </button>
                    )}
                    <select value={u.status}
                      onChange={e => updateStatus.mutate({ id: u.id, status: e.target.value })}
                      className="text-sm border border-gray-200 rounded px-2 py-1">
                      <option value="pending">En attente</option>
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                    </select>
                    <button onClick={() => confirm('Supprimer ?') && deleteUser.mutate(u.id)}
                      className="text-sm text-red-500 hover:text-red-700 px-2">x</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-12 text-center text-gray-400">Aucun utilisateur.</div>
        )}
      </div>
    </AdminLayout>
  );
}

function StatusCard({ active, icon: Icon, label, value, tone, onClick }) {
  const classes = {
    amber: active ? 'border-amber-300 ring-2 ring-amber-100' : 'border-transparent',
    green: active ? 'border-green-300 ring-2 ring-green-100' : 'border-transparent',
    gray: active ? 'border-gray-300 ring-2 ring-gray-100' : 'border-transparent',
  };
  const iconClasses = {
    amber: 'text-amber-500',
    green: 'text-green-500',
    gray: 'text-gray-500',
  };

  return (
    <button onClick={onClick} className={`bg-white rounded-xl shadow-sm p-4 text-left border ${classes[tone]}`}>
      <div className="flex items-center gap-3">
        <Icon size={22} className={iconClasses[tone]} />
        <div>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </button>
  );
}
