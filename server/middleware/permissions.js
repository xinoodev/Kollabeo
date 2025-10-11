import pool from '../config/database.js';

const roleHierarchy = {
  owner: 3,
  admin: 2,
  member: 1,
};

export const checkProjectAccess = async (userId, projectId, requiredRole = 'member') => {
  const result = await pool.query(
    `SELECT pm.role FROM project_members pm
     WHERE pm.project_id = $1 AND pm.user_id = $2
     UNION
     SELECT 'owner' as role FROM projects p
     WHERE p.id = $1 AND p.owner_id = $2`,
    [projectId, userId]
  );

  if (result.rows.length === 0) {
    return { hasAccess: false, role: null };
  }

  const userRole = result.rows[0].role;
  const hasAccess = roleHierarchy[userRole] >= roleHierarchy[requiredRole];

  return { hasAccess, role: userRole };
};

export const requireProjectAccess = (requiredRole = 'member') => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.body.project_id;

      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      const { hasAccess, role } = await checkProjectAccess(req.user.id, projectId, requiredRole);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
      }

      req.projectRole = role;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
