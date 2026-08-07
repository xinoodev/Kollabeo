import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiClient } from '../lib/api';
import { io as createSocket } from 'socket.io-client';

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
  const socketRef = useRef<any>(null);

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
    // Poll more frequently so notifications appear faster for users.
    const iv = setInterval(fetchNotifications, 5000);
    return () => clearInterval(iv);
  }, [fetchNotifications]);

  // Socket.IO: listen for server-pushed notifications and update state instantly
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = createSocket(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // connected
    });

    socket.on('notification', (n: Notification) => {
      setNotifications((prev) => [n, ...prev].slice(0, 100));
      setUnreadCount((c) => c + 1);
    });

    socket.on('disconnect', () => {
      // disconnected
    });

    return () => {
      try { socket.disconnect(); } catch (e) {}
    };
  }, []);

  const markRead = async (id: number) => {
    // Optimistic update: mark locally first so toasts don't reappear during network latency
    setNotifications((n) => n.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await apiClient.markNotificationRead(id);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
      // Revert optimistic update on error
      setNotifications((n) => n.map((item) => (item.id === id ? { ...item, is_read: false } : item)));
      setUnreadCount((c) => c + 1);
    }
  };

  const markAllRead = async () => {
    // Optimistic update: mark locally first
    const prev = notifications;
    setNotifications((n) => n.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);
    try {
      await apiClient.markAllNotificationsRead();
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
      // Revert to previous state on error
      setNotifications(prev);
      const unread = prev.filter(item => !item.is_read).length;
      setUnreadCount(unread);
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
