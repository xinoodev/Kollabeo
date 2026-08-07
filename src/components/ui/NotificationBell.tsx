import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from './Button';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const items = notifications.slice(0, 20);

  const renderMessage = (n: any) => {
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
        vars = {
          task_title: n.data?.task_title || t('notifications.defaults.task'),
        };
        break;
      case 'task_moved':
        vars = {
          title: n.data?.title || t('notifications.defaults.task'),
          to_column: n.data?.to_column || '',
        };
        break;
      case 'removed_from_project':
        vars = {
          project_name: n.project_name || n.data?.project_name || '',
        };
        break;
      case 'project_invitation':
        vars = {
          project_name: n.project_name || n.data?.project_name || '',
        };
        break;
      case 'new_message':
        vars = {
          project_name: n.project_name || n.data?.project_name || t('notifications.defaults.project'),
          snippet: n.data?.snippet || '',
        };
        break;
      case 'removed_from_task':
        vars = {
          task_title: n.data?.task_title || t('notifications.defaults.task'),
        };
        break;
      default:
        return n.data?.message || n.type;
    }

    const message = t(key, vars);
    if (message === key) return n.data?.message || n.type;
    return message;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
        aria-label={t('notifications.title')}
      >
        <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('notifications.title')}</div>
            <div className="flex items-center space-x-2">
              <button onClick={() => markAllRead()} className="text-xs text-blue-600 hover:underline">{t('notifications.markAll')}</button>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-4 w-4 text-gray-600 dark:text-gray-300"/></button>
            </div>
          </div>

          <ul className="p-2">
            {items.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">{t('notifications.noNotifications')}</li>
            )}

            {items.map((n: any) => (
              <li key={n.id} className={`px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 ${n.is_read ? 'opacity-70' : 'bg-white dark:bg-gray-800'}`}>
                <div className="flex items-start justify-between">
                  <div className="text-sm text-gray-800 dark:text-gray-100">{renderMessage(n)}</div>
                  <div className="ml-2 text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                {!n.is_read && (
                  <div className="mt-2">
                    <Button size="sm" variant="secondary" onClick={() => markRead(n.id)}>{t('notifications.markAsRead')}</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
