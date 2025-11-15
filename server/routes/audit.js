
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkProjectAccess } from '../middleware/permissions.js';

const router = express.Router();

// Obtener acciones disponibles para filtrado
router.get('/actions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT action 
       FROM audit_logs 
       ORDER BY action ASC`
    );

    const actions = result.rows.map(row => row.action);
    
    // Agrupar acciones por categoría
    const categorizedActions = {
      tasks: actions.filter(a => a.startsWith('task_')),
      members: actions.filter(a => a.startsWith('member_')),
      invitations: actions.filter(a => a.startsWith('invitation_')),
      collaborators: actions.filter(a => a.startsWith('collaborator_')),
      columns: actions.filter(a => a.startsWith('column_')),
      projects: actions.filter(a => a.startsWith('project_'))
    };

    res.json({
      all: actions,
      categorized: categorizedActions
    });
  } catch (error) {
    console.error('Get audit actions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener logs de auditoría de un proyecto
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      limit = 50, 
      offset = 0, 
      action, 
      startDate, 
      endDate,
      entityType,
      userId 
    } = req.query;

    // Verificar que el usuario es owner o admin
    const { hasAccess, role } = await checkProjectAccess(req.user.id, projectId, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only owners and admins can view audit logs' });
    }

    // Construir query dinámicamente
    let query = `
      SELECT 
        al.*,
        u.full_name as user_name,
        u.username,
        u.email as user_email,
        u.avatar_url as user_avatar
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.project_id = $1
    `;

    const params = [projectId];
    let paramCount = 2;

    // Filtros adicionales
    if (action) {
      query += ` AND al.action = $${paramCount}`;
      params.push(action);
      paramCount++;
    }

    if (entityType) {
      query += ` AND al.entity_type = $${paramCount}`;
      params.push(entityType);
      paramCount++;
    }

    if (userId) {
      query += ` AND al.user_id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    if (startDate) {
      query += ` AND al.created_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND al.created_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    // Obtener total de registros para paginación
    const countQuery = query.replace(
      'SELECT al.*, u.full_name as user_name, u.username, u.email as user_email, u.avatar_url as user_avatar',
      'SELECT COUNT(*) as total'
    );
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Añadir ordenamiento y paginación
    query += ` ORDER BY al.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      logs: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener estadísticas de auditoría
router.get('/project/:projectId/stats', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    // Verificar que el usuario es owner o admin
    const { hasAccess } = await checkProjectAccess(req.user.id, projectId, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only owners and admins can view audit statistics' });
    }

    let dateFilter = '';
    const params = [projectId];
    let paramCount = 2;

    if (startDate) {
      dateFilter += ` AND created_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      dateFilter += ` AND created_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    // Estadísticas por acción
    const actionStats = await pool.query(
      `SELECT action, COUNT(*) as count
       FROM audit_logs
       WHERE project_id = $1 ${dateFilter}
       GROUP BY action
       ORDER BY count DESC`,
      params
    );

    // Estadísticas por usuario
    const userStats = await pool.query(
      `SELECT 
        al.user_id,
        u.full_name,
        u.username,
        u.avatar_url,
        COUNT(*) as action_count
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.project_id = $1 ${dateFilter}
       GROUP BY al.user_id, u.full_name, u.username, u.avatar_url
       ORDER BY action_count DESC
       LIMIT 10`,
      params
    );

    // Estadísticas por tipo de entidad
    const entityStats = await pool.query(
      `SELECT entity_type, COUNT(*) as count
       FROM audit_logs
       WHERE project_id = $1 ${dateFilter}
       GROUP BY entity_type
       ORDER BY count DESC`,
      params
    );

    // Actividad por día (últimos 30 días)
    const activityByDay = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
       FROM audit_logs
       WHERE project_id = $1 
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [projectId]
    );

    res.json({
      byAction: actionStats.rows,
      byUser: userStats.rows,
      byEntityType: entityStats.rows,
      activityByDay: activityByDay.rows
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener detalles de un log específico
router.get('/log/:logId', authenticateToken, async (req, res) => {
  try {
    const { logId } = req.params;

    const result = await pool.query(
      `SELECT 
        al.*,
        u.full_name as user_name,
        u.username,
        u.email as user_email,
        u.avatar_url as user_avatar
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.id = $1`,
      [logId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    const log = result.rows[0];

    // Verificar acceso al proyecto
    const { hasAccess } = await checkProjectAccess(req.user.id, log.project_id, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(log);
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Exportar logs de auditoría (CSV)
router.get('/project/:projectId/export', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate, action, entityType } = req.query;

    // Verificar que el usuario es owner o admin
    const { hasAccess } = await checkProjectAccess(req.user.id, projectId, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only owners and admins can export audit logs' });
    }

    let query = `
      SELECT 
        al.id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.created_at,
        u.full_name as user_name,
        u.username,
        u.email as user_email,
        al.details
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.project_id = $1
    `;

    const params = [projectId];
    let paramCount = 2;

    if (action) {
      query += ` AND al.action = $${paramCount}`;
      params.push(action);
      paramCount++;
    }

    if (entityType) {
      query += ` AND al.entity_type = $${paramCount}`;
      params.push(entityType);
      paramCount++;
    }

    if (startDate) {
      query += ` AND al.created_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND al.created_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ` ORDER BY al.created_at DESC`;

    const result = await pool.query(query, params);

    // Convertir a CSV
    const headers = ['ID', 'Action', 'Entity Type', 'Entity ID', 'Date', 'User Name', 'Username', 'Email', 'Details'];
    const csvRows = [headers.join(',')];

    result.rows.forEach(row => {
      const values = [
        row.id,
        row.action,
        row.entity_type,
        row.entity_id || '',
        new Date(row.created_at).toISOString(),
        row.user_name || '',
        row.username || '',
        row.user_email || '',
        JSON.stringify(row.details || {}).replace(/"/g, '""')
      ];
      csvRows.push(values.map(v => `"${v}"`).join(','));
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${projectId}-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;