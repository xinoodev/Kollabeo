import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
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

router.get('/project/:projectId', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const { hasAccess } = await checkProjectPermission(req.user.id, projectId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Only admins and owners can view invitation links' });
        }

        const result = await pool.query(
            `SELECT * project_invitation_links
            WHERE project_id = $1 AND is_active = TRUE AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1`,
            [projectId]
        );

        if (result.rows.length === 0) {
            return res.json({ link: null });
        }

        res.json({ link: result.rows[0] });
    } catch (error) {
        console.error('Get invitation link error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/project/:projectId', authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { projectId } = req.params;

        const hasAccess = await checkProjectPermission(req.user.id, projectId, 'admin');
        if (!hasAccess) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Only admins and owners can create invitation links' });
        }

        const projectResult = await pool.query(
            'SELECT name FROM projects WHERE id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Project not found' });
        }

        const existingLink = await pool.query(
            `SELECT * FROM project_invitation_links
            WHERE project_id = $1 AND is_active = TRUE AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1`,
            [projectId]
        );

        if (existingLink.rows.length > 0) {
            await client.query('COMMIT');
            return res.json({
                link: existingLink.rows[0],
                message: 'Active invitation link already exists'
            });
        }

        await client.query(
            `UPDATE project_invitation_links
            SET is_active = FALSE
            WHERE project_id = $1 AND is_active = TRUE`,
            [projectId]
        );

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const result = await client.query(
            `INSERT INTO project_invitation_links (project_id, token, created_by, expires_at)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [projectId, token, req.user.id, expiresAt]
        );

        await client.query('COMMIT');

        res.status(201).json({
            link: result.rows[0],
            message: 'Invitation link created successfully'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create invitation link error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

router.post('/accept/:token', authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { token } = req.params;

        const linkResult = await client.query(
            `SELECT * FROM project_invitation_links
            WHERE token = $1 AND is_active = TRUE`,
            [token]
        );

        if (linkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Invitation link not found or has been deactivated' });
        }

        const link = linkResult.rows[0];

        if (new Date() > new Date(link.expires_at)) {
            await client.query(
                'UPDATE project_invitation_links SET is_active = FALSE WHERE id = $1',
                [link.id]
            );
            await client.query('COMMIT');
            return res.status(400).json({ error: 'Invitation link has expired' });
        }

        const ownerCheck = await client.query(
            `SELECT id FROM projects WHERE id = $1 AND owner_id = $2`,
            [link.project_id, req.user.id]
        );

        if (ownerCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'You are already the project owner' });
        }

        const existingMember = await client.query(
            'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
            [link.project_id, req.user.id]
        );

        if (existingMember.rows.length > 0) {
            await client.query('COMMIT');
            
            const projectResult = await client.query(
                `SELECT name FROM projects WHERE id = $1`,
                [link.project_id]
            );

            return res.status(201).json({
                message: 'You are already a member of this project',
                projectId: link.project_id,
                projectName: projectResult.rows[0].name,
                alreadyMember: true
            });
        }

        await client.query(
            `INSERT INTO project_members (project_id, user_id, role)
            VALUES ($1, $2, 'member')`,
            [link.project_id, req.user.id]
        );

        const projectResult = await client.query(
            'SELECT name FROM projects WHERE id = $1',
            [link.project_id]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Successfully joined the project',
            projectId: link.project_id,
            projectName: projectResult.rows[0].name,
            success: true
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Accept invitation link error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

router.delete('/project/:projectId', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;

        const hasAccess = await checkProjectPermission(req.user.id, projectId, 'admin');
        if (!hasAccess) {
            return res.status(403).json({ error: 'Only admins and owners can deactivate invitation links' });
        }

        await pool.query(
            `UPDATE project_invitation_links
            SET is_active = FALSE
            WHERE project_id = $1 AND is_active = TRUE`,
            [projectId]
        );

        res.json({ message: 'Invitation link deactivated successfully' });
    } catch (error) {
        console.error('Deactivate invitation link error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;