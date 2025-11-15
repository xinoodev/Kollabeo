
import express from 'express';
import pool from '../config/database.js';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { checkProjectAccess } from '../middleware/permissions.js';
import { auditMiddleware, updateRecentAuditUser } from '../middleware/audit.js';

const router = express.Router();

router.use(auditMiddleware);

router.post('/', authenticateToken, [
  body('project_id').isInt(),
  body('email').isEmail(),
  body('role').isIn(['admin', 'member'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, email, role } = req.body;

    const { hasAccess, role: userRole } = await checkProjectAccess(req.user.id, project_id, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only admins and owners can add members' });
    }

    const userResult = await pool.query(
      'SELECT id, full_name, username FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newUser = userResult.rows[0];

    const ownerCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND owner_id = $2',
      [project_id, newUser.id]
    );

    if (ownerCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User is already the project owner' });
    }

    const existingMember = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [project_id, newUser.id]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a member of this project' });
    }

    const result = await pool.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [project_id, newUser.id, role]
    );

    await updateRecentAuditUser(project_id, req.user.id, 'project_member', result.rows[0].id);

    const memberWithUser = await pool.query(
      `SELECT
        pm.*,
        u.email,
        u.full_name,
        u.avatar_url,
        u.username
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(memberWithUser.rows[0]);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, [
  body('role').isIn(['admin', 'member'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { role } = req.body;

    const memberCheck = await pool.query(
      'SELECT project_id, user_id FROM project_members WHERE id = $1',
      [id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { project_id, user_id } = memberCheck.rows[0];

    const { hasAccess } = await checkProjectAccess(req.user.id, project_id, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only admins and owners can update member roles' });
    }

    const ownerCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND owner_id = $2',
      [project_id, user_id]
    );

    if (ownerCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    const result = await pool.query(
      `UPDATE project_members 
       SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [role, id]
    );

    await updateRecentAuditUser(project_id, req.user.id, 'project_member', id);

    const memberWithUser = await pool.query(
      `SELECT
        pm.*,
        u.email,
        u.full_name,
        u.avatar_url,
        u.username
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.id = $1`,
      [result.rows[0].id]
    );

    res.json(memberWithUser.rows[0]);
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const memberCheck = await pool.query(
      'SELECT project_id, user_id FROM project_members WHERE id = $1',
      [id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { project_id, user_id } = memberCheck.rows[0];

    const { hasAccess } = await checkProjectAccess(req.user.id, project_id, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only admins and owners can remove members' });
    }

    const ownerCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND owner_id = $2',
      [project_id, user_id]
    );

    if (ownerCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot remove project owner' });
    }

    await pool.query('DELETE FROM project_members WHERE id = $1', [id]);

    await updateRecentAuditUser(project_id, req.user.id, 'project_member', id);

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const { hasAccess } = await checkProjectAccess(req.user.id, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT
        pm.*,
        u.email,
        u.full_name,
        u.avatar_url,
        u.username
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.created_at ASC`,
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;