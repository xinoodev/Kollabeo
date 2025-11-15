
import express from 'express';
import pool from '../config/database.js';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { checkProjectAccess } from '../middleware/permissions.js';
import { auditMiddleware, updateRecentAuditUser } from '../middleware/audit.js';

const router = express.Router();

// Aplicar middleware de auditoría
router.use(auditMiddleware);

// Añadir colaborador a una tarea
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

    // Verificar que la tarea existe y obtener el project_id
    const taskCheck = await pool.query(
      'SELECT project_id FROM tasks WHERE id = $1',
      [taskId]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const projectId = taskCheck.rows[0].project_id;

    // Verificar acceso al proyecto
    const { hasAccess } = await checkProjectAccess(req.user.id, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verificar que el usuario a añadir tiene acceso al proyecto
    const userAccess = await checkProjectAccess(userId, projectId);
    if (!userAccess.hasAccess) {
      return res.status(400).json({ error: 'User does not have access to this project' });
    }

    // Verificar si ya es colaborador
    const existingCollaborator = await pool.query(
      'SELECT id FROM task_collaborators WHERE task_id = $1 AND user_id = $2',
      [taskId, userId]
    );

    if (existingCollaborator.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a collaborator on this task' });
    }

    // Añadir colaborador
    const result = await pool.query(
      `INSERT INTO task_collaborators (task_id, user_id)
       VALUES ($1, $2)
       RETURNING *`,
      [taskId, userId]
    );

    // Actualizar user_id en el log de auditoría del trigger
    await updateRecentAuditUser(projectId, req.user.id, 'task_collaborator', result.rows[0].id);

    // Obtener información completa del colaborador
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

// Eliminar colaborador de una tarea
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener información del colaborador y la tarea
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

    // Verificar acceso al proyecto
    const { hasAccess } = await checkProjectAccess(req.user.id, project_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Eliminar colaborador
    await pool.query('DELETE FROM task_collaborators WHERE id = $1', [id]);

    // Actualizar user_id en el log de auditoría del trigger
    await updateRecentAuditUser(project_id, req.user.id, 'task_collaborator', id);

    res.json({ message: 'Collaborator removed successfully' });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener colaboradores de una tarea
router.get('/task/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Verificar que la tarea existe y obtener el project_id
    const taskCheck = await pool.query(
      'SELECT project_id FROM tasks WHERE id = $1',
      [taskId]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const projectId = taskCheck.rows[0].project_id;

    // Verificar acceso al proyecto
    const { hasAccess } = await checkProjectAccess(req.user.id, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Obtener colaboradores
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