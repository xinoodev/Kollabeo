import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendProjectInvitationEmail } from '../config/email.js';
import crypto from 'crypto';

const router = express.Router();

const checkProjectPermission = async (userId, projectId, requiredRole = null) => {
  const roleHierarchy = { owner: 3, admin: 2, member: 1 };

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

  if (!requiredRole) {
    return { hasAccess: true, role: userRole };
  }

  const hasAccess = roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  return { hasAccess, role: userRole };
};

router.post('/', authenticateToken, [
  body('project_id').isInt(),
  body('email').isEmail(),
  body('role').isIn(['admin', 'member'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, email, role } = req.body;

    const { hasAccess } = await checkProjectPermission(req.user.id, project_id, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only admins and owners can invite members' });
    }

    const projectResult = await pool.query(
      'SELECT name, owner_id FROM projects WHERE id = $1',
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;

      const ownerCheck = await pool.query(
        'SELECT id FROM projects WHERE id = $1 AND owner_id = $2',
        [project_id, userId]
      );

      if (ownerCheck.rows.length > 0) {
        return res.status(400).json({ error: 'User is already the project owner' });
      }

      const existingMember = await pool.query(
        'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
        [project_id, userId]
      );

      if (existingMember.rows.length > 0) {
        return res.status(400).json({ error: 'User is already a member of this project' });
      }
    }

    const existingInvitation = await pool.query(
      'SELECT id FROM project_invitations WHERE project_id = $1 AND email = $2 AND status = $3',
      [project_id, email, 'pending']
    );

    if (existingInvitation.rows.length > 0) {
      return res.status(400).json({ error: 'An invitation is already pending for this email' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO project_invitations (project_id, email, role, token, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [project_id, email, role, token, req.user.id, expiresAt]
    );

    const inviterResult = await pool.query(
      'SELECT full_name, username FROM users WHERE id = $1',
      [req.user.id]
    );

    const inviterName = inviterResult.rows[0].username || inviterResult.rows[0].full_name;

    const emailResult = await sendProjectInvitationEmail(
      email,
      token,
      project.name,
      inviterName,
      role
    );

    if (!emailResult.success) {
      await pool.query('DELETE FROM project_invitations WHERE id = $1', [result.rows[0].id]);
      return res.status(500).json({ error: 'Failed to send invitation email' });
    }

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: result.rows[0],
      emailPreview: emailResult.isTestMode ? emailResult.previewUrl : undefined
    });

  } catch (error) {
    console.error('Send invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/accept', [
  body('token').notEmpty()
], async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;

    const invitationResult = await client.query(
      `SELECT * FROM project_invitations
       WHERE token = $1
       FOR UPDATE`,
      [token]
    );

    if (invitationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        error: 'Invitation not found',
        shouldRedirect: true 
      });
    }

    const invitation = invitationResult.rows[0];

    if (invitation.status === 'accepted') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'This invitation has already been accepted',
        shouldRedirect: true 
      });
    }

    if (invitation.status === 'expired' || new Date() > new Date(invitation.expires_at)) {
      if (invitation.status !== 'expired') {
        await client.query(
          'UPDATE project_invitations SET status = $1 WHERE id = $2',
          ['expired', invitation.id]
        );
      }
      await client.query('COMMIT');
      return res.status(400).json({ 
        error: 'Invitation has expired',
        shouldRedirect: true 
      });
    }

    if (invitation.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Invitation is no longer valid',
        shouldRedirect: true 
      });
    }

    const userResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [invitation.email]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'No account found with this email. Please register first.',
        needsRegistration: true,
        shouldRedirect: true
      });
    }

    const userId = userResult.rows[0].id;

    const existingMember = await client.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [invitation.project_id, userId]
    );

    if (existingMember.rows.length > 0) {
      await client.query(
        'UPDATE project_invitations SET status = $1, accepted_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['accepted', invitation.id]
      );
      await client.query('COMMIT');
      
      const projectResult = await client.query(
        'SELECT name FROM projects WHERE id = $1',
        [invitation.project_id]
      );
      
      return res.status(200).json({ 
        message: 'You are already a member of this project',
        projectId: invitation.project_id,
        projectName: projectResult.rows[0].name,
        alreadyMember: true
      });
    }

    await client.query(
      'UPDATE project_invitations SET status = $1, accepted_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['accepted', invitation.id]
    );

    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [invitation.project_id, userId, invitation.role]
    );

    const projectResult = await client.query(
      'SELECT name FROM projects WHERE id = $1',
      [invitation.project_id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Invitation accepted successfully',
      projectId: invitation.project_id,
      projectName: projectResult.rows[0].name,
      success: true
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Accept invitation error:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ 
        error: 'This invitation has already been processed. Please refresh and try again.',
        shouldRedirect: true
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      shouldRedirect: true 
    });
  } finally {
    client.release();
  }
});

router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const { hasAccess } = await checkProjectPermission(req.user.id, projectId, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT
        pi.*,
        u.full_name as inviter_name,
        u.username as inviter_username
       FROM project_invitations pi
       JOIN users u ON pi.invited_by = u.id
       WHERE pi.project_id = $1 AND pi.status = 'pending'
       ORDER BY pi.created_at DESC`,
      [projectId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const invitationResult = await pool.query(
      'SELECT project_id FROM project_invitations WHERE id = $1',
      [id]
    );

    if (invitationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const { project_id } = invitationResult.rows[0];

    const { hasAccess } = await checkProjectPermission(req.user.id, project_id, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM project_invitations WHERE id = $1', [id]);

    res.json({ message: 'Invitation cancelled successfully' });

  } catch (error) {
    console.error('Delete invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;