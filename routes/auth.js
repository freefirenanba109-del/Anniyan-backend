const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('../db');

// In-memory store for OTPs
const otpStore = new Map();

// ─── EMAIL CONFIGURATION ─────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * POST /api/auth/register-start
 * Step 1: User enters email, send OTP
 */
router.post('/register-start', async (req, res) => {
  const { contact } = req.body;
  if (!contact) return res.status(400).json({ error: 'Email/Mobile is required.' });

  const existing = db.findOne('users', { contact: contact.trim() });
  if (existing) return res.status(409).json({ error: 'User already exists. Log in instead.' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(contact.trim(), { code, expiresAt: Date.now() + 10 * 60 * 1000 });

  // ─── SEND REAL EMAIL ───────────────────────────────────────────────────────
  const mailOptions = {
    from: `"Anniyan Justice System" <${process.env.EMAIL_USER}>`,
    to: contact.trim(),
    subject: 'Your Anniyan Verification Code',
    html: `
      <div style="font-family: serif; background: #000; color: #fff; padding: 40px; text-align: center; border: 2px solid #f00;">
        <h1 style="color: #f00; letter-spacing: 5px;">ANNIYAN</h1>
        <p style="font-size: 1.2rem; color: #ccc;">JUSTICE IS WATCHING YOU</p>
        <hr style="border: 0; border-top: 1px solid #300; margin: 20px 0;">
        <p>Use the code below to verify your identity and join the struggle for justice:</p>
        <div style="font-size: 3rem; font-weight: bold; color: #f00; margin: 30px 0; letter-spacing: 10px;">
          ${code}
        </div>
        <p style="font-size: 0.8rem; color: #555;">This code will expire in 10 minutes.</p>
        <p style="color: #f00; margin-top: 40px;">IF YOU COMMIT A CRIME, ANNIYAN WILL FIND YOU.</p>
      </div>
    `
  };

  // ─── SEND REAL EMAIL (Background) ──────────────────────────────────────────
  transporter.sendMail(mailOptions)
    .then(() => console.log(`[EMAIL SENT] Code for ${contact}: ${code}`))
    .catch(err => {
      console.error('[EMAIL ERROR]', err);
      console.log(`[FALLBACK OTP] ${contact}: ${code}`);
    });

  // Respond immediately so the user isn't stuck waiting
  return res.json({ success: true, message: 'OTP generated.' });
});

/**
 * POST /api/auth/register-verify
 * Step 2: Verify OTP
 */
router.post('/register-verify', (req, res) => {
  const { contact, code } = req.body;
  const stored = otpStore.get(contact?.trim());

  if (!stored || stored.code !== code || Date.now() > stored.expiresAt) {
    return res.status(401).json({ error: 'Invalid or expired code.' });
  }

  return res.json({ success: true, message: 'Code verified.' });
});

/**
 * POST /api/auth/register-complete
 * Step 3: Save user with name, username, password
 */
router.post('/register-complete', async (req, res) => {
  const { contact, name, username, password } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const existingUser = db.findOne('users', { username: username.trim().toLowerCase() });
  if (existingUser) return res.status(409).json({ error: 'Username already taken.' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: uuidv4(),
    name: name.trim(),
    username: username.trim().toLowerCase(),
    contact: contact.trim(),
    password: hashedPassword,
    joinedAt: Date.now()
  };

  db.insert('users', newUser);
  const { password: _, ...userWithoutPass } = newUser;
  return res.json({ success: true, user: userWithoutPass });
});

/**
 * POST /api/auth/login
 * Simple username/password login
 */
router.post('/login', async (req, res) => {
  const { loginId, password } = req.body; // loginId can be username or email

  if (!loginId || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }

  // Find user by username OR contact
  let user = db.findOne('users', { username: loginId.trim().toLowerCase() });
  if (!user) {
    user = db.findOne('users', { contact: loginId.trim() });
  }

  if (!user) return res.status(404).json({ error: 'User not found.' });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(401).json({ error: 'Invalid password.' });

  const { password: _, ...userWithoutPass } = user;
  return res.json({ success: true, user: userWithoutPass });
});

module.exports = router;
