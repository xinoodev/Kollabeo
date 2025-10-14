import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkProjectAccess } from '../middleware/permissions.js';

const router = express.Router();

router.get('/:taskId', authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;

        const taskResult = await pool.query(
            'SELECT project_id FROM tasks WHERE id = $1',
            [taskId]
        );

        if (taskResult.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const projectId = taskResult.rows[0].project_id;
        const isMember = await checkProjectAccess(req.user.id, projectId);

        if (!isMember) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await pool.query(
            `SELECT tc.*, u.full_name, u.username, u.avatar_url, u.email
            FROM task_comments tc
            JOIN users u ON tc.user_id = u.id
            WHERE tc.task_id = $1
            ORDER BY tc.created_at ASC`,
            [taskId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { taskId, content, parentId } = req.body;

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Content is required' });
        }

        const taskResult = await pool.query(
            'SELECT project_id FROM tasks WHERE id = $1',
            [taskId]
        );

        if (taskResult.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const projectId = taskResult.rows[0].project_id;
        const isMember = await checkProjectAccess(req.user.id, projectId);

        if (!isMember) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (parentId) {
            const parentResult = await pool.query(
                'SELECT id FROM task_comments WHERE id = $1 AND task_id = $2',
                [parentId, taskId]
            );

            if (parentResult.rows.length === 0) {
                return res.status(404).json({ error: 'Parent comment not found' });
            }
        }

        const result = await pool.query(
            `INSERT INTO task_comments (task_id, user_id, content, parent_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [taskId, req.user.id, content, parentId || null]
        );

        const userResult = await pool.query(
            'SELECT full_name, username, avatar_url, email FROM users WHERE id = $1',
            [req.user.id]
        );

        const comment = {
            ...result.rows[0],
            full_name: userResult.rows[0].full_name,
            username: userResult.rows[0].username,
            avatar_url: userResult.rows[0].avatar_url,
            email: userResult.rows[0].email
        };

        res.status(201).json(comment);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Content is required' });
        }

        const commentResult = await pool.query(
            'SELECT user_id FROM task_comments WHERE id = $1',
            [id]
        );

        if (commentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (commentResult.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await pool.query(
            `UPDATE task_comments
            SET content = $1
            WHERE id = $2
            RETURNING *`,
            [content.trim(), id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({ error: 'Failed to update comment' });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const commentResult = await pool.query(
            'SELECT user_id FROM task_comments WHERE id = $1',
            [id]
        );
        
        if (commentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (commentResult.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await pool.query('DELETE FROM task_comments WHERE id = $1', [id]);

        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

export default router;