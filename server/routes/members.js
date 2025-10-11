import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const checkProjectPermission = async (userId, projectId, requiredRole = null) => {
  const roleHierarchy = { owner: 3, admin: 2, member: 1 };

  const result = await pool.query(
    `SELECT pm.role FROM project_members pm
     WHERE pm.project_id = $1 AND pm.user_id = $2
     UNION
     SELECT 'owner' as role FROM projects p
     WHERE p.id = $1 AND p.owner_id = $2`,
    [projectId, userId]
  );

  if (result.rows.length === 0) {
    return { hasAccess: false, role: null };
  }

  const userRole = result.rows[0].role;

  if (!requiredRole) {
    return { hasAccess: true, role: userRole };
  }

  const hasAccess = roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  return { hasAccess, role: userRole };
};

router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const { hasAccess } = await checkProjectPermission(req.user.id, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT * FROM (
        SELECT
          pm.id,
          pm.project_id,
          pm.user_id,
          pm.role,
          pm.joined_at,
          u.email,
          u.full_name,
          u.avatar_url,
          CASE pm.role
            WHEN 'admin' THEN 2
            WHEN 'member' THEN 3
          END as role_order
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = $1
        UNION
        SELECT
          NULL as id,
          p.id as project_id,
          p.owner_id as user_id,
          'owner' as role,
          p.created_at as joined_at,
          u.email,
          u.full_name,
          u.avatar_url,
          1 as role_order
        FROM projects p
        JOIN users u ON p.owner_id = u.id
        WHERE p.id = $1
      ) as members
      ORDER BY role_order ASC, joined_at ASC`,
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

    const { hasAccess, role: userRole } = await checkProjectPermission(req.user.id, project_id, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only admins and owners can add members' });
    }

    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newUserId = userResult.rows[0].id;

    const ownerCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND owner_id = $2',
      [project_id, newUserId]
    );

    if (ownerCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User is already the project owner' });
    }

    const existingMember = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [project_id, newUserId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a member of this project' });
    }

    const result = await pool.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [project_id, newUserId, role]
    );

    const memberWithUser = await pool.query(
      `SELECT
        pm.*,
        u.email,
        u.full_name,
        u.avatar_url
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

    const memberResult = await pool.query(
      'SELECT project_id, user_id FROM project_members WHERE id = $1',
      [id]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { project_id } = memberResult.rows[0];

    const { hasAccess } = await checkProjectPermission(req.user.id, project_id, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only admins and owners can change roles' });
    }

    const result = await pool.query(
      `UPDATE project_members
       SET role = $1
       WHERE id = $2
       RETURNING *`,
      [role, id]
    );

    const memberWithUser = await pool.query(
      `SELECT
        pm.*,
        u.email,
        u.full_name,
        u.avatar_url
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

    const memberResult = await pool.query(
      'SELECT project_id, user_id FROM project_members WHERE id = $1',
      [id]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { project_id, user_id } = memberResult.rows[0];

    const { hasAccess, role: userRole } = await checkProjectPermission(req.user.id, project_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.user.id !== user_id && userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only admins and owners can remove other members' });
    }

    await pool.query('DELETE FROM project_members WHERE id = $1', [id]);

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;