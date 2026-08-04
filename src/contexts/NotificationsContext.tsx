import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '../lib/api';

type Notification = {
  id: number;
  user_id: number;
  project_id?: number;
  project_name?: string;
  type: string;
  data: any;
  is_read: boolean;
  created_at: string;
};

type NotificationsContextValue = {
  notifications: Notification[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiClient.getNotifications();
      setNotifications(data || []);
      const count = await apiClient.getNotificationsUnreadCount();
      setUnreadCount(count?.count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 15000);
    return () => clearInterval(iv);
  }, [fetchNotifications]);

  const markRead = async (id: number) => {
    try {
      await apiClient.markNotificationRead(id);
      setNotifications((n) => n.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications((n) => n.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, refresh: fetchNotifications, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};

export default NotificationsContext;
