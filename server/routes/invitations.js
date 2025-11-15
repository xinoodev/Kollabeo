
import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { sendProjectInvitationEmail } from '../config/email.js';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { checkProjectAccess } from '../middleware/permissions.js';
import { auditMiddleware } from '../middleware/audit.js';

const router = express.Router();

router.use(auditMiddleware);

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

    const { hasAccess } = await checkProjectAccess(req.user.id, project_id, 'admin');
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

router.post('/accept/:token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.params;

    const invitationResult = await pool.query(
      `SELECT * FROM project_invitations 
       WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
      [token]
    );

    if (invitationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    const invitation = invitationResult.rows[0];

    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows[0].email !== invitation.email) {
      return res.status(403).json({ error: 'This invitation is for a different email address' });
    }

    const existingMember = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [invitation.project_id, req.user.id]
    );

    if (existingMember.rows.length > 0) {
      await pool.query(
        `UPDATE project_invitations SET status = 'accepted' WHERE id = $1`,
        [invitation.id]
      );
      return res.status(400).json({ error: 'You are already a member of this project' });
    }

    await pool.query('BEGIN');

    try {
      await pool.query(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [invitation.project_id, req.user.id, invitation.role]
      );

      await pool.query(
        `UPDATE project_invitations SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
        [invitation.id]
      );

      await pool.query(
        `UPDATE audit_logs 
         SET user_id = $1 
         WHERE entity_type = 'invitation' 
           AND entity_id = $2 
           AND action = 'invitation_accepted'
           AND created_at > NOW() - INTERVAL '5 seconds'`,
        [req.user.id, invitation.id]
      );

      await pool.query('COMMIT');

      res.json({ message: 'Invitation accepted successfully' });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reject/:token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.params;

    const invitationResult = await pool.query(
      `SELECT * FROM project_invitations 
       WHERE token = $1 AND status = 'pending'`,
      [token]
    );

    if (invitationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invitation' });
    }

    const invitation = invitationResult.rows[0];

    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows[0].email !== invitation.email) {
      return res.status(403).json({ error: 'This invitation is for a different email address' });
    }

    await pool.query(
      `UPDATE project_invitations SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
      [invitation.id]
    );

    await pool.query(
      `UPDATE audit_logs 
       SET user_id = $1 
       WHERE entity_type = 'invitation' 
         AND entity_id = $2 
         AND action = 'invitation_rejected'
         AND created_at > NOW() - INTERVAL '5 seconds'`,
      [req.user.id, invitation.id]
    );

    res.json({ message: 'Invitation rejected successfully' });
  } catch (error) {
    console.error('Reject invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const { hasAccess } = await checkProjectAccess(req.user.id, projectId, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only admins and owners can view invitations' });
    }

    const result = await pool.query(
      `SELECT 
        pi.*,
        u.full_name as inviter_name,
        u.username as inviter_username,
        u.avatar_url as inviter_avatar
       FROM project_invitations pi
       LEFT JOIN users u ON pi.invited_by = u.id
       WHERE pi.project_id = $1
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

    const invitationCheck = await pool.query(
      'SELECT project_id, status FROM project_invitations WHERE id = $1',
      [id]
    );

    if (invitationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const { project_id, status } = invitationCheck.rows[0];

    const { hasAccess } = await checkProjectAccess(req.user.id, project_id, 'admin');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Only admins and owners can cancel invitations' });
    }

    if (status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending invitations' });
    }

    await pool.query(
      `UPDATE project_invitations SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await req.logAudit(
      project_id,
      'invitation_cancelled',
      'invitation',
      id,
      { cancelled_by: req.user.id }
    );

    res.json({ message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;