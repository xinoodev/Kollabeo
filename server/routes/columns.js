import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all columns for a project
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify user owns the project
    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND owner_id = $2',
      [projectId, req.user.id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
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

    // Verify user owns the project
    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND owner_id = $2',
      [project_id, req.user.id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
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
  body('color').optional().isHexColor(),
  body('position').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, color, position } = req.body;

    // Verify user owns the column through project ownership
    const columnCheck = await pool.query(
      `SELECT tc.id FROM task_columns tc 
       JOIN projects p ON tc.project_id = p.id 
       WHERE tc.id = $1 AND p.owner_id = $2`,
      [id, req.user.id]
    );

    if (columnCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const result = await pool.query(
      `UPDATE task_columns SET 
       name = COALESCE($1, name),
       color = COALESCE($2, color),
       position = COALESCE($3, position)
       WHERE id = $4 RETURNING *`,
      [name, color, position, id]
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

    // Verify user owns the column through project ownership
    const columnCheck = await pool.query(
      `SELECT tc.id, tc.project_id FROM task_columns tc 
       JOIN projects p ON tc.project_id = p.id 
       WHERE tc.id = $1 AND p.owner_id = $2`,
      [id, req.user.id]
    );

    if (columnCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const projectId = columnCheck.rows[0].project_id;

    // Check if there are tasks in this column
    const tasksCheck = await pool.query(
      'SELECT COUNT(*) as task_count FROM tasks WHERE column_id = $1',
      [id]
    );

    const taskCount = parseInt(tasksCheck.rows[0].task_count);

    if (taskCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete column with tasks. Please move or delete all tasks first.' 
      });
    }

    // Check if this is the last column in the project
    const columnsCheck = await pool.query(
      'SELECT COUNT(*) as column_count FROM task_columns WHERE project_id = $1',
      [projectId]
    );

    const columnCount = parseInt(columnsCheck.rows[0].column_count);

    if (columnCount <= 1) {
      return res.status(400).json({ 
        error: 'Cannot delete the last column. A project must have at least one column.' 
      });
    }

    const result = await pool.query(
      'DELETE FROM task_columns WHERE id = $1 RETURNING *',
      [id]
    );

    res.json({ message: 'Column deleted successfully' });
  } catch (error) {
    console.error('Delete column error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;