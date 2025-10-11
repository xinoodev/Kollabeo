
import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkProjectAccess } from '../middleware/permissions.js';

const router = express.Router();

// Get all tasks for a project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify user has access to the project (owner or member)
    const { hasAccess } = await checkProjectAccess(req.user.id, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT t.*, u.full_name as assignee_name 
       FROM tasks t 
       LEFT JOIN users u ON t.assignee_id = u.id 
       WHERE t.project_id = $1 
       ORDER BY t.position`,
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new task
router.post('/', authenticateToken, [
  body('title').trim().isLength({ min: 1 }),
  body('column_id').isInt(),
  body('project_id').isInt(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, column_id, project_id, priority, due_date, tags } = req.body;

    const { hasAccess } = await checkProjectAccess(req.user.id, project_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'INSERT INTO tasks (title, description, column_id, project_id, priority, due_date, tags) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [title, description || null, column_id, project_id, priority || 'medium', due_date || null, tags || []]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, column_id, priority, due_date, tags, position, assignee_id } = req.body;

    const taskCheck = await pool.query(
      'SELECT project_id FROM tasks WHERE id = $1',
      [id]
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
      `UPDATE tasks SET 
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       column_id = COALESCE($3, column_id),
       priority = COALESCE($4, priority),
       due_date = COALESCE($5, due_date),
       tags = COALESCE($6, tags),
       position = COALESCE($7, position),
       assignee_id = CASE WHEN $8::integer IS NULL THEN NULL ELSE $8 END
       WHERE id = $9 RETURNING *`,
      [title, description, column_id, priority, due_date, tags, position, assignee_id, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const taskCheck = await pool.query(
      'SELECT project_id FROM tasks WHERE id = $1',
      [id]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const projectId = taskCheck.rows[0].project_id;
    const { hasAccess } = await checkProjectAccess(req.user.id, projectId, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only admins and owners can delete tasks' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;