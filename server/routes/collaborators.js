
import express from 'express';
import pool from '../config/database.js';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { checkProjectAccess } from '../middleware/permissions.js';
import { auditMiddleware, updateRecentAuditUser } from '../middleware/audit.js';

const router = express.Router();

router.use(auditMiddleware);

router.post('/', authenticateToken, [
  body('taskId').isInt(),
  body('userId').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId, userId } = req.body;

    const taskCheck = await pool.query(
      'SELECT project_id FROM tasks WHERE id = $1',
      [taskId]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const projectId = taskCheck.rows[0].project_id;

    const { hasAccess } = await checkProjectAccess(req.user.id, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const userAccess = await checkProjectAccess(userId, projectId);
    if (!userAccess.hasAccess) {
      return res.status(400).json({ error: 'User does not have access to this project' });
    }

    const existingCollaborator = await pool.query(
      'SELECT id FROM task_collaborators WHERE task_id = $1 AND user_id = $2',
      [taskId, userId]
    );

    if (existingCollaborator.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a collaborator on this task' });
    }

    const result = await pool.query(
      `INSERT INTO task_collaborators (task_id, user_id)
       VALUES ($1, $2)
       RETURNING *`,
      [taskId, userId]
    );

    await updateRecentAuditUser(projectId, req.user.id, 'task_collaborator', result.rows[0].id);

    const collaboratorWithUser = await pool.query(
      `SELECT
        tc.*,
        u.email,
        u.full_name,
        u.avatar_url,
        u.username
       FROM task_collaborators tc
       JOIN users u ON tc.user_id = u.id
       WHERE tc.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(collaboratorWithUser.rows[0]);
  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const collaboratorCheck = await pool.query(
      `SELECT tc.task_id, tc.user_id, t.project_id
       FROM task_collaborators tc
       JOIN tasks t ON tc.task_id = t.id
       WHERE tc.id = $1`,
      [id]
    );

    if (collaboratorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Collaborator not found' });
    }

    const { task_id, user_id, project_id } = collaboratorCheck.rows[0];

    const { hasAccess } = await checkProjectAccess(req.user.id, project_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM task_collaborators WHERE id = $1', [id]);

    await updateRecentAuditUser(project_id, req.user.id, 'task_collaborator', id);

    res.json({ message: 'Collaborator removed successfully' });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/task/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;

    const taskCheck = await pool.query(
      'SELECT project_id FROM tasks WHERE id = $1',
      [taskId]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const projectId = taskCheck.rows[0].project_id;

    const { hasAccess } = await checkProjectAccess(req.user.id, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT
        tc.*,
        u.email,
        u.full_name,
        u.avatar_url,
        u.username
       FROM task_collaborators tc
       JOIN users u ON tc.user_id = u.id
       WHERE tc.task_id = $1
       ORDER BY tc.created_at ASC`,
      [taskId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get collaborators error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;