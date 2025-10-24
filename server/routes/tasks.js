
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

    const { hasAccess } = await checkProjectAccess(req.user.id, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT
        t.*,
        COALESCE(u.username, u.full_name) as assignee_name,
        COALESCE(COUNT(DISTINCT tc.id), 0)::integer as comments_count
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN task_comments tc ON t.id = tc.task_id
      WHERE t.project_id = $1
      GROUP BY t.id, u.username, u.full_name
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

    const { title, description, column_id, project_id, priority, due_date, assignee_id, tags } = req.body;

    const { hasAccess } = await checkProjectAccess(req.user.id, project_id, 'member');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const positionResult = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM tasks WHERE column_id = $1',
      [column_id]
    );
    const position = positionResult.rows[0].next_position;

    const result = await pool.query(
      `INSERT INTO tasks (title, description, column_id, project_id, position, priority, due_date, assignee_id, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, description || null, column_id, project_id, position, priority, due_date || null, assignee_id || null, tags || []]
    );

    // Get the task with comments count
    const taskWithCount = await pool.query(
      `SELECT
        t.*,
        COALESCE(u.username, u.full_name) as assignee_name,
        COALESCE(COUNT(DISTINCT tc.id), 0)::integer as comments_count
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN task_comments tc ON t.id = tc.task_id
      WHERE t.id = $1
      GROUP BY t.id, u.username, u.full_name`,
      [result.rows[0].id]
    );

    res.status(201).json(taskWithCount.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task

router.put('/:id', authenticateToken, [
  body('title').optional().trim().isLength({ min: 1 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('column_id').optional().isInt() // Add validation for column_id
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, description, priority, due_date, assignee_id, tags, checkbox_states, column_id } = req.body;

    const taskResult = await pool.query('SELECT project_id FROM tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { hasAccess } = await checkProjectAccess(req.user.id, taskResult.rows[0].project_id, 'member');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(priority);
    }
    if (due_date !== undefined) {
      updates.push(`due_date = $${paramCount++}`);
      values.push(due_date);
    }
    if (assignee_id !== undefined) {
      updates.push(`assignee_id = $${paramCount++}`);
      values.push(assignee_id);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      values.push(tags);
    }
    if (checkbox_states !== undefined) {
      updates.push(`checkbox_states = $${paramCount++}`);
      values.push(JSON.stringify(checkbox_states));
    }
    if (column_id !== undefined) {
      updates.push(`column_id = $${paramCount++}`);
      values.push(column_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    // Get the updated task with comments count
    const result = await pool.query(
      `SELECT
        t.*,
        COALESCE(u.username, u.full_name) as assignee_name,
        COALESCE(COUNT(DISTINCT tc.id), 0)::integer as comments_count
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN task_comments tc ON t.id = tc.task_id
      WHERE t.id = $1
      GROUP BY t.id, u.username, u.full_name`,
      [id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const taskResult = await client.query('SELECT project_id, column_id, position FROM tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];
    const { hasAccess } = await checkProjectAccess(req.user.id, task.project_id, 'member');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await client.query('BEGIN');

    await client.query('DELETE FROM task_comments WHERE task_id = $1', [id]);
    await client.query('DELETE FROM tasks WHERE id = $1', [id]);
    await client.query(
      'UPDATE tasks SET position = position - 1 WHERE column_id = $1 AND position > $2',
      [task.column_id, task.position]
    );

    await client.query('COMMIT');

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;