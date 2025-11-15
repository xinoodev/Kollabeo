
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
  body('name').trim().isLength({ min: 1 }),
  body('position').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, name, position } = req.body;

    const { hasAccess } = await checkProjectAccess(req.user.id, project_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let finalPosition = position;
    if (finalPosition === undefined) {
      const maxPositionResult = await pool.query(
        'SELECT COALESCE(MAX(position), -1) as max_position FROM task_columns WHERE project_id = $1',
        [project_id]
      );
      finalPosition = maxPositionResult.rows[0].max_position + 1;
    }

    const result = await pool.query(
      `INSERT INTO task_columns (project_id, name, position)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [project_id, name, finalPosition]
    );

    await updateRecentAuditUser(project_id, req.user.id, 'column', result.rows[0].id);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create column error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, [
  body('name').optional().trim().isLength({ min: 1 }),
  body('position').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, position } = req.body;

    const columnCheck = await pool.query(
      'SELECT project_id FROM task_columns WHERE id = $1',
      [id]
    );

    if (columnCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const projectId = columnCheck.rows[0].project_id;
    const { hasAccess } = await checkProjectAccess(req.user.id, projectId);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (position !== undefined) {
      updates.push(`position = $${paramCount++}`);
      values.push(position);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE task_columns SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    await updateRecentAuditUser(projectId, req.user.id, 'column', id);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update column error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const columnCheck = await pool.query(
      'SELECT project_id, name FROM task_columns WHERE id = $1',
      [id]
    );

    if (columnCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const { project_id, name } = columnCheck.rows[0];
    const { hasAccess } = await checkProjectAccess(req.user.id, project_id);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tasksCheck = await pool.query(
      'SELECT COUNT(*) as count FROM tasks WHERE column_id = $1',
      [id]
    );

    if (parseInt(tasksCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete column with tasks. Please move or delete tasks first.' 
      });
    }

    await pool.query('DELETE FROM task_columns WHERE id = $1', [id]);

    await updateRecentAuditUser(project_id, req.user.id, 'column', id);

    res.json({ message: 'Column deleted successfully' });
  } catch (error) {
    console.error('Delete column error:', error);
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
      `SELECT * FROM task_columns 
       WHERE project_id = $1 
       ORDER BY position ASC`,
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get columns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/reorder', authenticateToken, [
  body('projectId').isInt(),
  body('columns').isArray(),
  body('columns.*.id').isInt(),
  body('columns.*.position').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, columns } = req.body;

    const { hasAccess } = await checkProjectAccess(req.user.id, projectId);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const column of columns) {
        await client.query(
          'UPDATE task_columns SET position = $1, updated_at = NOW() WHERE id = $2 AND project_id = $3',
          [column.position, column.id, projectId]
        );
      }

      await client.query('COMMIT');

      const result = await pool.query(
        'SELECT * FROM task_columns WHERE project_id = $1 ORDER BY position',
        [projectId]
      );

      for (const column of columns) {
        await updateRecentAuditUser(projectId, req.user.id, 'column', column.id);
      }

      res.json(result.rows);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Reorder columns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;