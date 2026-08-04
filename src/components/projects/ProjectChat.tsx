import React, { useEffect, useState, useRef } from 'react';
import { ChatMessage } from '../../types';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';
import { MessageCircle, Shield, User } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ProjectChatProps {
  projectId: number;
  canViewAdmins?: boolean;
  initialChannel?: 'general' | 'admins';
  socket?: Socket | null;
  onNewMessage?: (msg: ChatMessage, channel: 'general' | 'admins') => void;
}

export const ProjectChat: React.FC<ProjectChatProps> = ({ projectId, canViewAdmins, initialChannel = 'general', socket: providedSocket = null, onNewMessage }) => {
  const [selectedChannel, setSelectedChannel] = useState<'general' | 'admins'>(initialChannel);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();
  const { t } = useLanguage();
  const prevChannelRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Load messages when channel or project changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiClient.getProjectChat(projectId, selectedChannel);
        if (!mounted) return;
        setMessages(data || []);
        // scroll to bottom - done after render
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
      } catch (err) {
        console.error('Failed to load chat', err);
      }
    })();

    return () => { mounted = false; };
  }, [projectId, selectedChannel]);

  // Initialize socket once (use provided socket if available)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.MODE === 'production' ? window.location.origin : 'http://localhost:5000';
    const localSocket = providedSocket ?? io(baseUrl, { auth: { token } });
    socketRef.current = localSocket;

    const handleIncoming = (payload: any) => {
      const incoming: ChatMessage = payload && payload.message ? payload.message : payload;
      const channelFromPayload: 'general' | 'admins' = payload && payload.channel ? payload.channel : selectedChannel;
      // Only add messages for the currently selected channel
      if (channelFromPayload !== selectedChannel) return;
      setMessages(prev => [...prev, incoming]);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
      if (onNewMessage && incoming.user_id !== user?.id) {
        onNewMessage(incoming, channelFromPayload);
      }
    };

    localSocket.on('message', handleIncoming);

    return () => {
      localSocket.off('message', handleIncoming);
      try {
        if (prevChannelRef.current && !providedSocket) {
          localSocket.emit('leaveProject', { projectId, channel: prevChannelRef.current });
        }
      } catch (e) {}
      if (!providedSocket) {
        try { localSocket.disconnect(); } catch (e) {}
      }
    };
  }, [projectId, providedSocket, selectedChannel, onNewMessage, user?.id]);

  // Handle joining/leaving when channel changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // If using a shared socket provided by the parent, joining/leaving is handled there
    if (providedSocket) {
      prevChannelRef.current = selectedChannel;
      return;
    }

    const prev = prevChannelRef.current;
    if (prev && prev !== selectedChannel) {
      socket.emit('leaveProject', { projectId, channel: prev });
    }
    socket.emit('joinProject', { projectId, channel: selectedChannel });
    prevChannelRef.current = selectedChannel;
  }, [projectId, selectedChannel]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    try {
      const saved = await apiClient.postProjectChat(projectId, selectedChannel, text.trim());
      setText('');
      socketRef.current?.emit('message', { projectId, channel: selectedChannel, message: saved });
      setMessages(prev => {
        const next = [...prev, saved];
        setTimeout(() => {
          try {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
          } catch (e) {}
        }, 50);
        return next;
      });
    } catch (err) {
      console.error('Send message failed', err);
    }
  };

  return (
    <div className="w-full max-w-full bg-white dark:bg-gray-800 rounded-lg shadow p-2">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="text-sm font-semibold text-white">{selectedChannel === 'general' ? t('chat.teamTitle') : t('chat.adminTitle')}</div>
        </div>
        <div className="flex items-center space-x-2">
          {selectedChannel === 'general' ? (
            canViewAdmins ? (
              <button
                onClick={() => setSelectedChannel('admins')}
                className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-sm hover:from-blue-700 hover:to-blue-600 transition"
                title={t('chat.openAdmin')}
              >
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">{t('chat.adminTitle')}</span>
              </button>
            ) : null
          ) : (
            <button
              onClick={() => setSelectedChannel('general')}
              className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:shadow hover:bg-gradient-to-br hover:from-blue-600 hover:to-blue-500 hover:text-white hover:border-transparent transition"
              title={t('chat.goToTeam')}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{t('chat.teamTitle')}</span>
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="h-64 overflow-y-auto mb-3 p-3 space-y-2">
        {messages.map(m => (
          <div key={m.id} className="flex items-start space-x-2">
            {m.avatar_url ? (
              <img src={m.avatar_url} alt={m.full_name || 'avatar'} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
            )}
            <div>
              {(() => {
                const displayName = m.full_name || (m.user_id === user?.id ? t('chat.you') : t('chat.unknown'));
                return (
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-medium text-blue-500">{displayName}</div>
                    {m.user_id === user?.id && (
                      <div className="text-xs text-gray-400">({t('chat.youShort')})</div>
                    )}
                  </div>
                );
              })()}
              <div className="text-sm text-gray-700 dark:text-gray-200">{m.content}</div>
              <div className="text-xs text-gray-400">{new Date(m.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex space-x-2 px-3 pb-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              sendMessage();
            }
          }}
          className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          placeholder={selectedChannel === 'general' ? t('chat.placeholderGeneral') : t('chat.placeholderAdmins')}
        />
        <button onClick={sendMessage} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{t('buttons.send')}</button>
      </div>
    </div>
  );
};
