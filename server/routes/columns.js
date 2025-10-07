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

    const result = await pool.query(
      'INSERT INTO task_columns (name, project_id, color, position) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, project_id, color || '#6B7280', position || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create column error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;