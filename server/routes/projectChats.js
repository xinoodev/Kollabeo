import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireProjectAccess, checkProjectAccess } from '../middleware/permissions.js';

const router = express.Router();

// Get chat history for a project and channel
router.get('/:projectId/:channel', authenticateToken, async (req, res) => {
  try {
    const { projectId, channel } = req.params;

    const { hasAccess, role } = await checkProjectAccess(req.user.id, projectId);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    if (channel === 'admins') {
      const allowed = role === 'owner' || role === 'admin';
      if (!allowed) return res.status(403).json({ error: 'Admins only channel' });
    }

    const result = await pool.query(
      'SELECT pc.*, u.full_name, u.avatar_url FROM project_chats pc LEFT JOIN users u ON pc.user_id = u.id WHERE pc.project_id = $1 AND pc.channel = $2 ORDER BY pc.created_at ASC LIMIT 100',
      [projectId, channel]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Post a message (also used by server-side Socket.IO flows)
router.post('/:projectId/:channel', authenticateToken, async (req, res) => {
  try {
    const { projectId, channel } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content required' });
    }

    const { hasAccess, role } = await checkProjectAccess(req.user.id, projectId);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    if (channel === 'admins') {
      const allowed = role === 'owner' || role === 'admin';
      if (!allowed) return res.status(403).json({ error: 'Admins only channel' });
    }

    const insert = await pool.query(
      'INSERT INTO project_chats (project_id, channel, user_id, content) VALUES ($1, $2, $3, $4) RETURNING *',
      [projectId, channel, req.user.id, content]
    );

    const message = insert.rows[0];

    // Attach user info
    message.full_name = req.user.full_name;
    message.avatar_url = req.user.avatar_url;

    res.status(201).json(message);
  } catch (error) {
    console.error('Post chat message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
