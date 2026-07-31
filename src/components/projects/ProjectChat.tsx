import React, { useEffect, useState, useRef } from 'react';
import { ChatMessage } from '../../types';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

interface ProjectChatProps {
  projectId: number;
  channel: 'general' | 'admins';
  canViewAdmins?: boolean;
}

export const ProjectChat: React.FC<ProjectChatProps> = ({ projectId, channel, canViewAdmins }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiClient.getProjectChat(projectId, channel);
        if (!mounted) return;
        setMessages(data || []);
      } catch (err) {
        console.error('Failed to load chat', err);
      }
    })();

    return () => { mounted = false; };
  }, [projectId, channel]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io('http://localhost:5000', { auth: { token } });
    socketRef.current = socket;

    socket.emit('joinProject', { projectId, channel });

    socket.on('message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.emit('leaveProject', { projectId, channel });
      socket.disconnect();
    };
  }, [projectId, channel]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    try {
      // Post via REST to persist, then emit via socket
      const saved = await apiClient.postProjectChat(projectId, channel, text.trim());
      setText('');
      // Emit message to room
      socketRef.current?.emit('message', { projectId, channel, message: saved });
      setMessages(prev => [...prev, saved]);
    } catch (err) {
      console.error('Send message failed', err);
    }
  };

  return (
    <div className="w-full max-w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="text-lg font-semibold mb-2">{channel === 'general' ? 'Team Chat' : 'Admins'}</div>
      <div className="h-64 overflow-y-auto mb-3 space-y-2">
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
      <div className="flex space-x-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700"
          placeholder={channel === 'general' ? 'Write a message to the team...' : 'Admins only...'}
        />
        <button onClick={sendMessage} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Send</button>
      </div>
    </div>
  );
};
