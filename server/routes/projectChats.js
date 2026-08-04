import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireProjectAccess, checkProjectAccess } from '../middleware/permissions.js';
import { createNotification } from '../config/notifications.js';

const router = express.Router();

// Get unread message counts for the current user on a project (per channel)
router.get('/:projectId/unread', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const { hasAccess, role } = await checkProjectAccess(req.user.id, projectId);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    // general channel
    const lastGeneral = await pool.query(
      'SELECT last_read_at FROM project_chat_reads WHERE project_id = $1 AND user_id = $2 AND channel = $3',
      [projectId, req.user.id, 'general']
    );
    const lastGeneralAt = lastGeneral.rows[0] ? lastGeneral.rows[0].last_read_at : null;
    const generalCountRes = await pool.query(
      'SELECT COUNT(*) FROM project_chats WHERE project_id = $1 AND channel = $2 AND created_at > COALESCE($3, to_timestamp(0))',
      [projectId, 'general', lastGeneralAt]
    );
    const general = parseInt(generalCountRes.rows[0].count, 10);

    let admins = 0;
    if (role === 'owner' || role === 'admin') {
      const lastAdmins = await pool.query(
        'SELECT last_read_at FROM project_chat_reads WHERE project_id = $1 AND user_id = $2 AND channel = $3',
        [projectId, req.user.id, 'admins']
      );
      const lastAdminsAt = lastAdmins.rows[0] ? lastAdmins.rows[0].last_read_at : null;
      const adminsCountRes = await pool.query(
        'SELECT COUNT(*) FROM project_chats WHERE project_id = $1 AND channel = $2 AND created_at > COALESCE($3, to_timestamp(0))',
        [projectId, 'admins', lastAdminsAt]
      );
      admins = parseInt(adminsCountRes.rows[0].count, 10);
    }

    res.json({ general, admins, total: general + admins });
  } catch (error) {
    console.error('Get unread counts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

    try {
      // Notify project members (including owner) except the sender
      const membersRes = await pool.query('SELECT user_id FROM project_members WHERE project_id = $1', [projectId]);
      const ownerRes = await pool.query('SELECT owner_id, name FROM projects WHERE id = $1', [projectId]);
      const recipients = new Set();
      membersRes.rows.forEach(r => recipients.add(r.user_id));
      if (ownerRes.rows.length > 0) recipients.add(ownerRes.rows[0].owner_id);
      recipients.delete(req.user.id);

      const snippet = content.length > 140 ? content.substring(0, 137) + '...' : content;

      for (const userId of recipients) {
        await createNotification(userId, projectId, 'new_message', { message_id: message.id, snippet, channel, project_name: ownerRes.rows[0]?.name });
      }
    } catch (err) {
      console.error('Error notifying project chat members:', err);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Post chat message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark a channel as read for the current user
router.post('/:projectId/:channel/read', authenticateToken, async (req, res) => {
  try {
    const { projectId, channel } = req.params;

    const { hasAccess, role } = await checkProjectAccess(req.user.id, projectId);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    if (channel === 'admins') {
      const allowed = role === 'owner' || role === 'admin';
      if (!allowed) return res.status(403).json({ error: 'Admins only channel' });
    }

    await pool.query(
      `INSERT INTO project_chat_reads (project_id, user_id, channel, last_read_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (project_id, user_id, channel)
       DO UPDATE SET last_read_at = NOW()`,
      [projectId, req.user.id, channel]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Mark channel read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
