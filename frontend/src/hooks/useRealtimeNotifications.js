import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../services/api';

export function useRealtimeNotifications(options = {}) {
  const { limit = 30, status = 'all', type = '', toastNew = true } = options;
  const latestSeenId = useRef(null);

  const query = useQuery({
    queryKey: ['notifications', { limit, status, type }],
    queryFn: () => api.get('/notifications', { params: { limit, status, type: type || undefined } }).then(r => r.data),
    refetchInterval: 15000,
  });

  useEffect(() => {
    const notifications = query.data?.notifications || [];
    if (notifications.length === 0) return;

    const latestId = Math.max(...notifications.map(notification => notification.id));
    if (latestSeenId.current === null) {
      latestSeenId.current = latestId;
      return;
    }

    const fresh = notifications
      .filter(notification => notification.id > latestSeenId.current && !notification.read_at)
      .sort((a, b) => a.id - b.id);

    if (toastNew && fresh.length > 0) {
      fresh.slice(-3).forEach(notification => {
        toast(notification.title, {
          icon: '!',
          duration: 4500,
        });
      });
    }

    latestSeenId.current = Math.max(latestSeenId.current, latestId);
  }, [query.data, toastNew]);

  return query;
}
