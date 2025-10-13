import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendVerificationEmail } from '../config/email.js';

const router = express.Router();

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').trim().isLength({ min: 2 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, fullName } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, email_verification_token, email_verification_expires) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, email_verified',
      [email, passwordHash, fullName, verificationToken, verificationExpires]
    );

    const user = result.rows[0];

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationToken, fullName);
    
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Don't fail registration if email fails, just log it
    }

    res.status(201).json({
      message: 'User created successfully. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        email_verified: user.email_verified
      },
      requiresVerification: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email
router.post('/verify-email', [
  body('token').isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;

    // Find user with valid token
    const result = await pool.query(
      'SELECT id, email, full_name, email_verified FROM users WHERE email_verification_token = $1 AND email_verification_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Update user as verified and clear token
    await pool.query(
      'UPDATE users SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Email verified successfully',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        email_verified: true
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend verification email
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Find unverified user
    const result = await pool.query(
      'SELECT id, email, full_name, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await pool.query(
      'UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE id = $3',
      [verificationToken, verificationExpires, user.id]
    );

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationToken, user.full_name);
    
    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.json({
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, full_name, username, avatar_url, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({ 
        error: 'Please verify your email address before logging in',
        requiresVerification: true,
        email: user.email
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        username: user.username,
        avatar_url: user.avatar_url,
        email_verified: user.email_verified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;