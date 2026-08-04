import React, { useEffect, useState } from 'react';
import { useNotifications } from '../../contexts/NotificationsContext';

const Toast: React.FC<{ n: any; onClose: () => void }> = ({ n, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [n, onClose]);

  const message = (() => {
    switch (n.type) {
      case 'task_created':
        return `Se añadió la tarea "${n.data?.title || 'tarea'}" en ${n.project_name || 'un proyecto'}`;
      case 'added_as_collaborator':
        return `Te añadieron como colaborador en "${n.data?.task_title || 'una tarea'}"`;
      case 'task_moved':
        return `La tarea "${n.data?.title || 'tarea'}" se movió a ${n.data?.to_column || ''}`;
      case 'project_invitation':
        return `Invitación: ${n.project_name || n.data?.project_name || ''} — revisa tu correo`;
      case 'new_message':
        return `Nuevo mensaje en ${n.project_name || n.data?.project_name || 'un proyecto'}: "${n.data?.snippet || ''}"`;
      case 'removed_from_project':
        return `Te eliminaron del proyecto "${n.project_name || n.data?.project_name || ''}"`;
      default:
        return n.data?.message || n.type;
    }
  })();

  return (
    <div className="mb-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-3">
      <div className="flex items-start justify-between">
        <div className="text-sm text-gray-800 dark:text-gray-100">{message}</div>
        <button onClick={onClose} className="text-xs text-gray-500 ml-2">Cerrar</button>
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
