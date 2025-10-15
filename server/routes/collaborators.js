import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkProjectAccess } from '../middleware/permissions.js';

const router = express.Router();

router.get('/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;

    const taskResult = await pool.query(
      'SELECT project_id FROM tasks WHERE id = $1',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const projectId = taskResult.rows[0].project_id;
    const isMember = await checkProjectAccess(req.user.userId, projectId);

    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }

    const result = await pool.query(
      `SELECT tc.id, tc.user_id, tc.added_at, u.full_name, u.email, u.avatar_url, u.username
       FROM task_collaborators tc
       JOIN users u ON tc.user_id = u.id
       WHERE tc.task_id = $1
       ORDER BY tc.added_at ASC`,
      [taskId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    res.status(500).json({ error: 'Failed to fetch collaborators' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { taskId, userId } = req.body;

    const taskResult = await pool.query(
      'SELECT project_id, assignee_id FROM tasks WHERE id = $1',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { project_id, assignee_id } = taskResult.rows[0];

    if (assignee_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the assignee can add collaborators' });
    }

    const memberResult = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [project_id, userId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(400).json({ error: 'User is not a member of this project' });
    }

    const existingResult = await pool.query(
      'SELECT id FROM task_collaborators WHERE task_id = $1 AND user_id = $2',
      [taskId, userId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a collaborator' });
    }

    const result = await pool.query(
      `INSERT INTO task_collaborators (task_id, user_id, added_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [taskId, userId, req.user.userId]
    );

    const userResult = await pool.query(
      'SELECT full_name, email, avatar_url, username FROM users WHERE id = $1',
      [userId]
    );

    res.status(201).json({
      ...result.rows[0],
      ...userResult.rows[0]
    });
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(500).json({ error: 'Failed to add collaborator' });
  }
});

router.delete('/:collaboratorId', authenticateToken, async (req, res) => {
  try {
    const { collaboratorId } = req.params;

    const collabResult = await pool.query(
      `SELECT tc.task_id, t.assignee_id, t.project_id
       FROM task_collaborators tc
       JOIN tasks t ON tc.task_id = t.id
       WHERE tc.id = $1`,
      [collaboratorId]
    );

    if (collabResult.rows.length === 0) {
      return res.status(404).json({ error: 'Collaborator not found' });
    }

    const { assignee_id } = collabResult.rows[0];

    if (assignee_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the assignee can remove collaborators' });
    }

    await pool.query('DELETE FROM task_collaborators WHERE id = $1', [collaboratorId]);

    res.json({ message: 'Collaborator removed successfully' });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});

export default router;