import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, full_name, username, avatar_url, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/name', [
    authenticateToken,
    body('full_name').trim().isLength({ min: 2, max: 255 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { full_name } = req.body;

        const result = await pool.query(
            'UPDATE users SET full_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, full_name, username, avatar_url',
            [full_name, req.user.id]
        );

        res.json({
            message: 'Name updated successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Update name error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/username', [
    authenticateToken,
    body('username').trim().isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/)
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username } = req.body;

        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1 AND id != $2',
            [username, req.user.id]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const result = await pool.query(
            'UPDATE users SET username = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, full_name, username, avatar_url',
            [username, req.user.id]
        );

        res.json({
            message: 'Username updated successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Update username error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/password', [
    authenticateToken,
    body('current_password').exists,
    body('new_password').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { current_password, new_password } = req.body;

        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isValidPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newPasswordHash, req.user.id]
        );

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/avatar', [
    authenticateToken,
    body('avatar_url').trim().isURL()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { avatar_url } = req.body;

        const result = await pool.query(
            'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, full_name, username, avatar_url',
            [avatar_url, req.user.id]
        );

        res.json({
            message: 'Avatar updated successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Update avatar error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM users WHERE id = $1',
            [req.user.id]
        );

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;