import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkProjectAccess } from '../middleware/permissions.js';

const router = express.Router();

// Get all projects for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.*,
        (
          SELECT COUNT(*) + 1 
          FROM project_members pm 
          WHERE pm.project_id = p.id
        ) as member_count
       FROM projects p
       WHERE p.owner_id = $1 
          OR p.id IN (
            SELECT project_id 
            FROM project_members 
            WHERE user_id = $1
          )
       ORDER BY p.updated_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new project
router.post('/', authenticateToken, [
  body('name').trim().isLength({ min: 1 }),
  body('color').optional().isHexColor()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, color } = req.body;

    const result = await pool.query(
      'INSERT INTO projects (name, description, color, owner_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || null, color || '#3B82F6', req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { hasAccess } = await checkProjectAccess(req.user.id, id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT 
        p.*,
        (
          SELECT COUNT(*) + 1 
          FROM project_members pm 
          WHERE pm.project_id = p.id
        ) as member_count
       FROM projects p
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = result.rows[0];
    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update project
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
    const { name, description, color } = req.body;

    const { hasAccess, role } = await checkProjectAccess(req.user.id, id, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only admins and owners can update projects' });
    }

    const result = await pool.query(
      'UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description), color = COALESCE($3, color) WHERE id = $4 RETURNING *',
      [name, description, color, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND owner_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get member project role
router.get('/:id/role', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is owner
    const ownerCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND owner_id = $2',
      [id, req.user.id]
    );

    if (ownerCheck.rows.length > 0) {
      return res.json({ role: 'owner', isOwner: true });
    }

    // Check if user is a member
    const memberCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (memberCheck.rows.length > 0) {
      return res.json({ 
        role: memberCheck.rows[0].role, 
        isOwner: false 
      });
    }

    return res.status(403).json({ error: 'Access denied' });
  } catch (error) {
    console.error('Get project role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;