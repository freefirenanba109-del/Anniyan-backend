/**
 * routes/auth.js — Authentication Routes
 * Handles sign-up, sign-in, code verification (OTP simulation), logout
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// In-memory OTP store: { contact -> { code, expiresAt } }
const otpStore = new Map();

/**
 * POST /api/auth/send-code
 * Sends (simulates) an OTP to the provided contact.
 * Body: { contact: string, mode: 'signin' | 'signup' }
 */
router.post('/send-code', (req, res) => {
  const { contact, mode } = req.body;

  if (!contact || !contact.trim()) {
    return res.status(400).json({ error: 'Contact is required.' });
  }

  const existing = db.findOne('users', { contact: contact.trim() });

  if (mode === 'signin' && !existing) {
    return res.status(404).json({ error: 'User not found. Please Sign Up.' });
  }
  if (mode === 'signup' && existing) {
    return res.status(409).json({ error: 'User already exists. Please Sign In.' });
  }

  // Generate a 4-digit OTP (fixed to "1234" for demo, real impl would use SMS/email)
  const code = '1234';
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(contact.trim(), { code, expiresAt });

  // In production: send actual SMS/email here
  console.log(`[OTP] Code for ${contact}: ${code}`);

  return res.json({ success: true, message: 'Code sent. (Use 1234 for testing)' });
});

/**
 * POST /api/auth/verify-code
 * Verifies OTP and logs in / completes registration.
 * Body: { contact, code, mode, name? }
 */
router.post('/verify-code', (req, res) => {
  const { contact, code, mode, name } = req.body;

  if (!contact || !code) {
    return res.status(400).json({ error: 'Contact and code are required.' });
  }

  const stored = otpStore.get(contact.trim());
  if (!stored) {
    return res.status(400).json({ error: 'No OTP found. Please request a new code.' });
  }
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(contact.trim());
    return res.status(400).json({ error: 'OTP expired. Please request a new code.' });
  }
  if (stored.code !== code.trim()) {
    return res.status(401).json({ error: 'Invalid code. Try again.' });
  }

  otpStore.delete(contact.trim());

  if (mode === 'signin') {
    const user = db.findOne('users', { contact: contact.trim() });
    if (!user) return res.status(404).json({ error: 'User not found. Please Sign Up.' });
    return res.json({ success: true, user });
  }

  // Sign Up — name required
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required for sign up.' });
  }

  const newUser = {
    id: uuidv4(),
    name: name.trim(),
    contact: contact.trim(),
    joinedAt: Date.now()
  };

  db.insert('users', newUser);
  return res.json({ success: true, user: newUser });
});

/**
 * POST /api/auth/logout
 * Body: { userId }
 * Simply acknowledges logout (no server-side session in this demo)
 */
router.post('/logout', (req, res) => {
  return res.json({ success: true });
});

/**
 * GET /api/auth/user/:id
 * Returns user profile by ID.
 */
router.get('/user/:id', (req, res) => {
  const user = db.findOne('users', { id: req.params.id });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json(user);
});

module.exports = router;
