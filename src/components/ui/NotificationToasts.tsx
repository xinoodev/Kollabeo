import React, { useEffect, useState } from 'react';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useLanguage } from '../../contexts/LanguageContext';

const Toast: React.FC<{ n: any; onClose: () => void }> = ({ n, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [n, onClose]);
  const { t } = useLanguage();

  const message = (() => {
    const key = `notifications.types.${n.type}`;
    let vars: Record<string, string | number> = {};
    switch (n.type) {
      case 'task_created':
        vars = {
          title: n.data?.title || t('notifications.defaults.task'),
          project: n.project_name || n.data?.project_name || t('notifications.defaults.project'),
        };
        break;
      case 'added_as_collaborator':
        vars = { task_title: n.data?.task_title || t('notifications.defaults.task') };
        break;
      case 'task_moved':
        vars = { title: n.data?.title || t('notifications.defaults.task'), to_column: n.data?.to_column || '' };
        break;
      case 'project_invitation':
        vars = { project_name: n.project_name || n.data?.project_name || '' };
        break;
      case 'new_message':
        vars = { project_name: n.project_name || n.data?.project_name || t('notifications.defaults.project'), snippet: n.data?.snippet || '' };
        break;
      case 'removed_from_project':
        vars = { project_name: n.project_name || n.data?.project_name || '' };
        break;
      default:
        return n.data?.message || n.type;
    }
    const msg = t(key, vars);
    if (msg === key) return n.data?.message || n.type;
    return msg;
  })();

  return (
    <div className="mb-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-3">
      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">{t('notifications.newNotification')}</h2>
      <div className="flex items-start justify-between">
        <div className="text-sm text-gray-800 dark:text-gray-100">{message}</div>
        <button onClick={onClose} className="text-xs text-gray-500 ml-2">{t('buttons.close')}</button>
      </div>
      <div className="mt-1 text-xs text-gray-500">{new Date(n.created_at).toLocaleTimeString()}</div>
    </div>
  );
};

const NotificationToasts: React.FC = () => {
  const { notifications, markRead } = useNotifications();
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    const unread = notifications.filter(n => !n.is_read);
    // Add new unread notifications to queue if not already present
    setQueue(q => {
      const ids = new Set(q.map((i: any) => i.id));
      const toAdd = unread.filter(u => !ids.has(u.id)).slice(0, 3);
      return [...toAdd, ...q].slice(0, 5);
    });
  }, [notifications]);

  const handleClose = (id: number) => {
    setQueue(q => q.filter(i => i.id !== id));
    markRead(id);
  };

  if (queue.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end">
      {queue.map(n => (
        <Toast key={n.id} n={n} onClose={() => handleClose(n.id)} />
      ))}
    </div>
  );
};

export default NotificationToasts;
