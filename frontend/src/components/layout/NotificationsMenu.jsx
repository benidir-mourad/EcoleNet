import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ListChecks } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import api from '../../services/api';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fr-BE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsMenu({ color = 'emerald' }) {
  const qc = useQueryClient();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const rolePath = pathname.startsWith('/teacher') ? '/teacher' : '/student';
  const theme = color === 'indigo'
    ? { active: 'bg-indigo-600', hover: 'hover:bg-indigo-700/60', text: 'text-indigo-200', badge: 'bg-violet-400' }
    : { active: 'bg-emerald-600', hover: 'hover:bg-emerald-700/60', text: 'text-emerald-200', badge: 'bg-cyan-300' };

  const { data } = useRealtimeNotifications({ limit: 8 });

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className={clsx(
          'flex items-center gap-3 px-4 py-2.5 w-full rounded-lg transition text-sm font-medium',
          open ? `${theme.active} text-white shadow-sm` : `${theme.text} ${theme.hover}`,
        )}
      >
        <span className="relative">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className={`absolute -right-1.5 -top-1.5 h-4 min-w-4 rounded-full ${theme.badge} px-1 text-[10px] font-bold leading-4 text-gray-900`}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        Notifications
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-800 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-xs font-semibold uppercase text-gray-500">Notifications</span>
            <div className="flex items-center gap-1">
              <Link
                to={`${rolePath}/notifications`}
                onClick={() => setOpen(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                title="Voir toutes les notifications"
              >
                <ListChecks size={15} />
              </Link>
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={unreadCount === 0 || markAllRead.isPending}
                className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30"
                title="Tout marquer comme lu"
              >
                <CheckCheck size={15} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">Aucune notification</div>
            ) : notifications.map(notification => {
              const content = (
                <div
                  className={clsx(
                    'block border-b border-gray-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-gray-50',
                    !notification.read_at && 'bg-emerald-50/60',
                  )}
                  onClick={() => !notification.read_at && markRead.mutate(notification.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className={clsx(
                      'mt-1 h-2 w-2 shrink-0 rounded-full',
                      notification.read_at ? 'bg-gray-200' : theme.badge,
                    )} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{notification.title}</p>
                      {notification.body && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{notification.body}</p>}
                      <p className="mt-1 text-[11px] text-gray-400">{formatDate(notification.created_at)}</p>
                    </div>
                  </div>
                </div>
              );

              return notification.data?.url
                ? <Link key={notification.id} to={notification.data.url} onClick={() => setOpen(false)}>{content}</Link>
                : <button key={notification.id} type="button" className="w-full">{content}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
