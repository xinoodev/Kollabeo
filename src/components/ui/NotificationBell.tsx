import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationsContext';
import { Button } from './Button';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const items = notifications.slice(0, 20);

  const renderMessage = (n: any) => {
    switch (n.type) {
      case 'task_created':
        return `Se añadió la tarea "${n.data?.title || 'tarea'}" en ${n.project_name || 'un proyecto'}`;
      case 'added_as_collaborator':
        return `Te añadieron como colaborador en "${n.data?.task_title || 'una tarea'}"`;
      case 'task_moved':
        return `La tarea "${n.data?.title || 'tarea'}" se movió a ${n.data?.to_column || ''}`;
      case 'removed_from_project':
        return `Te eliminaron del proyecto "${n.project_name || n.data?.project_name || ''}"`;
      case 'project_invitation':
        return `Invitación: ${n.project_name || n.data?.project_name || ''} — revisa tu correo para aceptar`;
      case 'new_message':
        return `Nuevo mensaje en ${n.project_name || n.data?.project_name || 'un proyecto'}: "${n.data?.snippet || ''}"`;
      default:
        return n.data?.message || n.type;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Notificaciones</div>
            <div className="flex items-center space-x-2">
              <button onClick={() => markAllRead()} className="text-xs text-blue-600 hover:underline">Marcar todas</button>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-4 w-4 text-gray-600 dark:text-gray-300"/></button>
            </div>
          </div>

          <ul className="p-2">
            {items.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No hay notificaciones</li>
            )}

            {items.map((n: any) => (
              <li key={n.id} className={`px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 ${n.is_read ? 'opacity-70' : 'bg-white dark:bg-gray-800'}`}>
                <div className="flex items-start justify-between">
                  <div className="text-sm text-gray-800 dark:text-gray-100">{renderMessage(n)}</div>
                  <div className="ml-2 text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                {!n.is_read && (
                  <div className="mt-2">
                    <Button size="sm" variant="secondary" onClick={() => markRead(n.id)}>Marcar leído</Button>
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
