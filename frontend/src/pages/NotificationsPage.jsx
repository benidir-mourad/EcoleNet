import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, ExternalLink, Filter, Trash2, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api, { getApiErrorMessage } from '../services/api';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

const typeLabels = {
  teacher_message: 'Messages',
  student_message: 'Messages',
  forum_reply: 'Forum',
  forum_post: 'Forum',
  enrollment_approved: 'Inscriptions',
  new_exercise: 'Exercices',
  new_assignment: 'Exercices',
  submission_corrected: 'Corrections',
  correction_published: 'Corrections',
};

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fr-BE', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsPage({ color = 'emerald' }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('');
  const theme = color === 'indigo'
    ? { main: 'text-indigo-700', bg: 'bg-indigo-600', soft: 'bg-indigo-50', ring: 'ring-indigo-500' }
    : { main: 'text-emerald-700', bg: 'bg-emerald-600', soft: 'bg-emerald-50', ring: 'ring-emerald-500' };

  const { data, isLoading } = useRealtimeNotifications({ limit: 100, status, type, toastNew: false });
  const { data: preferencesData } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => api.get('/notifications/preferences').then(r => r.data),
  });
  const notifications = data?.notifications || [];
  const typeCounts = useMemo(() => data?.type_counts || {}, [data?.type_counts]);
  const types = useMemo(() => Object.keys(typeCounts).sort(), [typeCounts]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });

  const mutationOptions = {
    onSuccess: refresh,
    onError: (error) => toast.error(getApiErrorMessage(error)),
  };

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    ...mutationOptions,
  });

  const markUnread = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/unread`),
    ...mutationOptions,
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      toast.success('Notifications marquees comme lues');
      refresh();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/notifications/${id}`),
    onSuccess: refresh,
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updatePreferences = useMutation({
    mutationFn: (preferences) => api.put('/notifications/preferences', { preferences }).then(r => r.data),
    onSuccess: () => {
      toast.success('Preferences enregistrees');
      qc.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const togglePreference = (key) => {
    const current = preferencesData?.preferences || {};
    updatePreferences.mutate({
      ...current,
      [key]: current[key] === false,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className={clsx('mb-2 inline-flex items-center gap-2 text-sm font-semibold', theme.main)}>
            <Bell size={18} />
            Centre de notifications
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Toutes les notifications</h1>
        </div>
        <button
          type="button"
          onClick={() => markAllRead.mutate()}
          disabled={(data?.unread_count || 0) === 0 || markAllRead.isPending}
          className={clsx('inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50', theme.bg)}
        >
          <CheckCheck size={17} />
          Tout marquer comme lu
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-y border-gray-200 py-4">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-500">
          <Filter size={16} />
          Filtres
        </div>
        {['all', 'unread', 'read'].map(value => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={clsx(
              'rounded-lg border px-3 py-1.5 text-sm font-medium',
              status === value ? `${theme.soft} ${theme.main} border-current` : 'border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            {value === 'all' ? 'Toutes' : value === 'unread' ? 'Non lues' : 'Lues'}
          </button>
        ))}
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className={clsx('rounded-lg border-gray-200 text-sm focus:border-transparent focus:outline-none focus:ring-2', theme.ring)}
        >
          <option value="">Tous les types</option>
          {types.map(value => (
            <option key={value} value={value}>
              {typeLabels[value] || value} ({typeCounts[value]})
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Chargement...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Aucune notification pour ces filtres.</div>
        ) : notifications.map(notification => (
          <div
            key={notification.id}
            className={clsx('flex items-start justify-between gap-4 border-b border-gray-100 p-4 last:border-b-0', !notification.read_at && theme.soft)}
          >
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-900">{notification.title}</span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  {typeLabels[notification.type] || notification.type}
                </span>
                {!notification.read_at && <span className={clsx('h-2 w-2 rounded-full', theme.bg)} />}
              </div>
              {notification.body && <p className="text-sm text-gray-600">{notification.body}</p>}
              <p className="mt-2 text-xs text-gray-400">{formatDate(notification.created_at)}</p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {notification.data?.url && (
                <Link
                  to={notification.data.url}
                  className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  title="Ouvrir"
                >
                  <ExternalLink size={17} />
                </Link>
              )}
              {notification.read_at ? (
                <button
                  type="button"
                  onClick={() => markUnread.mutate(notification.id)}
                  className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  title="Marquer comme non lue"
                >
                  <Undo2 size={17} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => markRead.mutate(notification.id)}
                  className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  title="Marquer comme lue"
                >
                  <Check size={17} />
                </button>
              )}
              <button
                type="button"
                onClick={() => remove.mutate(notification.id)}
                className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                title="Supprimer"
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {preferencesData && (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-gray-900">Preferences</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(preferencesData.types).map(([key, label]) => {
              const enabled = preferencesData.preferences?.[key] !== false;

              return (
                <label key={key} className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 px-4 py-3">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={updatePreferences.isPending}
                    onChange={() => togglePreference(key)}
                    className={clsx('rounded border-gray-300 focus:ring-2', theme.ring)}
                  />
                </label>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
