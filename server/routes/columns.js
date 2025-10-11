import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkProjectAccess } from '../middleware/permissions.js';

const router = express.Router();

// Get all columns for a project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const { hasAccess } = await checkProjectAccess(req.user.id, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT * FROM task_columns WHERE project_id = $1 ORDER BY position',
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get columns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new column
router.post('/', authenticateToken, [
  body('name').trim().isLength({ min: 1 }),
  body('project_id').isInt(),
  body('color').optional().isHexColor()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, project_id, color, position } = req.body;

    const { hasAccess } = await checkProjectAccess(req.user.id, project_id, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only admins and owners can create columns' });
    }

    // Get the next position if not provided
    let columnPosition = position;
    if (columnPosition === undefined) {
      const positionResult = await pool.query(
        'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM task_columns WHERE project_id = $1',
        [project_id]
      );
      columnPosition = positionResult.rows[0].next_position;
    }

    const result = await pool.query(
      'INSERT INTO task_columns (name, project_id, color, position) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, project_id, color || '#6B7280', columnPosition]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create column error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update column
router.put('/:id', authenticateToken, [
  body('name').optional().trim().isLength({ min: 1 }),
  body('color').optional().isHexColor()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, color } = req.body;

    const columnCheck = await pool.query(
      'SELECT project_id FROM task_columns WHERE id = $1',
      [id]
    );

    if (columnCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const projectId = columnCheck.rows[0].project_id;
    const { hasAccess } = await checkProjectAccess(req.user.id, projectId, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only admins and owners can update columns' });
    }

    const result = await pool.query(
      'UPDATE task_columns SET name = COALESCE($1, name), color = COALESCE($2, color) WHERE id = $3 RETURNING *',
      [name, color, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update column error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete column
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const columnCheck = await pool.query(
      'SELECT project_id FROM task_columns WHERE id = $1',
      [id]
    );

    if (columnCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const projectId = columnCheck.rows[0].project_id;
    const { hasAccess } = await checkProjectAccess(req.user.id, projectId, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only admins and owners can delete columns' });
    }

    // Check if column has tasks
    const tasksCheck = await pool.query(
      'SELECT COUNT(*) as count FROM tasks WHERE column_id = $1',
      [id]
    );

    if (parseInt(tasksCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete column with tasks' });
    }

    await pool.query('DELETE FROM task_columns WHERE id = $1', [id]);

    res.json({ message: 'Column deleted successfully' });
  } catch (error) {
    console.error('Delete column error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder columns
router.patch('/reorder', authenticateToken, [
  body('projectId').isInt(),
  body('columns').isArray()
], async (req, res) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, columns } = req.body;

    const { hasAccess } = await checkProjectAccess(req.user.id, projectId, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only admins and owners can reorder columns' });
    }

    await client.query('BEGIN');

    for (let i = 0; i < columns.length; i++) {
      await client.query(
        'UPDATE task_columns SET position = $1 WHERE id = $2 AND project_id = $3',
        [i, columns[i].id, projectId]
      );
    }

    await client.query('COMMIT');

    const result = await client.query(
      'SELECT * FROM task_columns WHERE project_id = $1 ORDER BY position',
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reorder columns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;