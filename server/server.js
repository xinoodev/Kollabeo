import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from './config/database.js';
import { initSocket } from './config/socket.js';
import projectChatRoutes from './routes/projectChats.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import columnRoutes from './routes/columns.js';
import taskRoutes from './routes/tasks.js';
import memberRoutes from './routes/members.js';
import profileRoutes from './routes/profile.js';
import commentRoutes from './routes/comments.js';
import collaboratorRoutes from './routes/collaborators.js';
import invitationRoutes from './routes/invitations.js';
import invitationLinkRoutes from './routes/invitation-links.js';
import auditRoutes from './routes/audit.js';
import notificationRoutes from './routes/notifications.js';

dotenv.config();

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Socket.IO
const io = new IOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Make the io instance available to other modules
initSocket(io);

// Basic token auth for sockets (reads Bearer token from query)
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication error'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT id, email, full_name, username, avatar_url FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) return next(new Error('Authentication error'));
    socket.user = result.rows[0];
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);
  // Join a user-specific room so we can emit direct notifications
  try {
    if (socket.user && socket.user.id) {
      const userRoom = `user_${socket.user.id}`;
      socket.join(userRoom);
    }
  } catch (e) {
    // ignore
  }

  socket.on('joinProject', ({ projectId, channel }) => {
    const room = `project_${projectId}_${channel}`;
    socket.join(room);
  });

  socket.on('leaveProject', ({ projectId, channel }) => {
    const room = `project_${projectId}_${channel}`;
    socket.leave(room);
  });

  socket.on('message', (msg) => {
    try {
      const { projectId, channel, message } = msg;
      const room = `project_${projectId}_${channel}`;
      // Emit to all other sockets in the room, excluding the sender to avoid duplicates
      // Include the channel in the payload so clients (including background listeners) know which channel the message belongs to
      socket.to(room).emit('message', { channel, message });
    } catch (err) {
      console.error('Socket message error', err);
    }
  });
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger to help diagnose routing issues (method + path + auth present)
app.use((req, res, next) => {
  try {
    console.log(`[HTTP] ${req.method} ${req.originalUrl} Auth=${!!req.headers.authorization}`);
  } catch (err) {
    // ignore logging errors
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/columns', columnRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/collaborators', collaboratorRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/invitation-links', invitationLinkRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/project-chats', projectChatRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'TaskForge API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`🚀 Kollabeo server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});