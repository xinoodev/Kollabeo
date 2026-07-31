import React, { useEffect, useState, useRef } from 'react';
import { ChatMessage } from '../../types';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';
import { MessageCircle, Shield } from 'lucide-react';

interface ProjectChatProps {
  projectId: number;
  canViewAdmins?: boolean;
  initialChannel?: 'general' | 'admins';
}

export const ProjectChat: React.FC<ProjectChatProps> = ({ projectId, canViewAdmins, initialChannel = 'general' }) => {
  const [selectedChannel, setSelectedChannel] = useState<'general' | 'admins'>(initialChannel);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();
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

  // Initialize socket once
  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io((process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5000'), { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      // join initial channel
      socket.emit('joinProject', { projectId, channel: selectedChannel });
      prevChannelRef.current = selectedChannel;
    });

    socket.on('message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
    });

    return () => {
      try {
        if (prevChannelRef.current) {
          socket.emit('leaveProject', { projectId, channel: prevChannelRef.current });
        }
      } catch (e) {}
      socket.disconnect();
    };
  }, [projectId]);

  // Handle joining/leaving when channel changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

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
      setMessages(prev => [...prev, saved]);
    } catch (err) {
      console.error('Send message failed', err);
    }
  };

  return (
    <div className="w-full max-w-full bg-white dark:bg-gray-800 rounded-lg shadow p-2">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="text-sm font-semibold text-white">{selectedChannel === 'general' ? 'Team Chat' : 'Admin Chat'}</div>
        </div>
        <div className="flex items-center space-x-2">
          {selectedChannel === 'general' ? (
            canViewAdmins ? (
              <button
                onClick={() => setSelectedChannel('admins')}
                className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-sm hover:from-blue-700 hover:to-blue-600 transition"
                title="Open Admin chat"
              >
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Admin chat</span>
              </button>
            ) : null
          ) : (
            <button
              onClick={() => setSelectedChannel('general')}
              className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:shadow hover:bg-gradient-to-br hover:from-blue-600 hover:to-blue-500 hover:text-white hover:border-transparent transition"
              title="Go to Team chat"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Team chat</span>
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="h-64 overflow-y-auto mb-3 p-3 space-y-2">
        {messages.map(m => (
          <div key={m.id} className="flex items-start space-x-2">
            <img src={m.avatar_url || '/avatar.png'} alt="avatar" className="w-8 h-8 rounded-full" />
            <div>
              <div className="text-sm font-medium">{m.full_name || 'Unknown'}</div>
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
          className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700"
          placeholder={selectedChannel === 'general' ? 'Write a message to the team...' : 'Admins only...'}
        />
        <button onClick={sendMessage} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Send</button>
      </div>
    </div>
  );
};
