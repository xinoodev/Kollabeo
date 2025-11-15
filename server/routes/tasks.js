
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import { checkProjectAccess } from '../middleware/permissions.js';
import { auditMiddleware, updateRecentAuditUser } from '../middleware/audit.js';
import pool from '../config/database.js';

const router = express.Router();

router.use(auditMiddleware);

router.post('/', authenticateToken, [
  body('project_id').isInt(),
  body('column_id').isInt(),
  body('title').trim().isLength({ min: 1 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, column_id, title, description, priority, due_date, assignee_id, tags } = req.body;

    const { hasAccess } = await checkProjectAccess(req.user.id, project_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const columnCheck = await pool.query(
      'SELECT id FROM task_columns WHERE id = $1 AND project_id = $2',
      [column_id, project_id]
    );

    if (columnCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid column for this project' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (project_id, column_id, title, description, priority, due_date, assignee_id, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [project_id, column_id, title, description, priority, due_date, assignee_id, tags, req.user.id]
    );

    const task = result.rows[0];

    await updateRecentAuditUser(project_id, req.user.id, 'task', task.id);

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, [
  body('title').optional().trim().isLength({ min: 1 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    // Agregar checkbox_states a la desestructuración
    const { title, description, priority, due_date, assignee_id, tags, column_id, checkbox_states } = req.body;

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

    if (column_id) {
      const columnCheck = await pool.query(
        'SELECT id FROM task_columns WHERE id = $1 AND project_id = $2',
        [column_id, projectId]
      );

      if (columnCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid column for this project' });
      }
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

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    // Actualizar user_id en logs de auditoría generados por triggers
    await updateRecentAuditUser(projectId, req.user.id, 'task', id);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const taskCheck = await pool.query(
      'SELECT project_id, title FROM tasks WHERE id = $1',
      [id]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { project_id, title } = taskCheck.rows[0];
    const { hasAccess } = await checkProjectAccess(req.user.id, project_id);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    await updateRecentAuditUser(project_id, req.user.id, 'task', id);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
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
      `SELECT 
        t.*,
        u.full_name as assignee_name,
        u.email as assignee_email,
        creator.full_name as creator_name,
        creator.email as creator_email
       FROM tasks t
       LEFT JOIN users u ON t.assignee_id = u.id
       LEFT JOIN users creator ON t.created_by = creator.id
       WHERE t.project_id = $1
       ORDER BY t.position ASC`,
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;