
import pool from '../config/database.js';

/**
 * Middleware para registrar acciones de auditoría manualmente
 */
export const logAudit = async (projectId, userId, action, entityType, entityId, details = {}) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [projectId, userId, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Error logging audit:', error);
    // No lanzamos el error para no interrumpir la operación principal
  }
};

/**
 * Actualiza el user_id en registros de auditoría recientes que no lo tienen
 */
export const updateRecentAuditUser = async (projectId, userId, entityType, entityId) => {
  try {
    await pool.query(
      `UPDATE audit_logs 
       SET user_id = $1 
       WHERE project_id = $2 
         AND entity_type = $3 
         AND entity_id = $4 
         AND user_id IS NULL 
         AND created_at > NOW() - INTERVAL '5 seconds'`,
      [userId, projectId, entityType, entityId]
    );
  } catch (error) {
    console.error('Error updating audit user:', error);
  }
};

/**
 * Middleware para inyectar funciones de auditoría en req
 */
export const auditMiddleware = (req, res, next) => {
  req.logAudit = async (projectId, action, entityType, entityId, details = {}) => {
    await logAudit(projectId, req.user?.id, action, entityType, entityId, details);
  };
  
  req.updateAuditUser = async (projectId, entityType, entityId) => {
    await updateRecentAuditUser(projectId, req.user?.id, entityType, entityId);
  };
  
  next();
};