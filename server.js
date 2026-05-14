/**
 * server.js — Anniyan Justice System Backend
 * 
 * REST API for authentication, complaints, and dashboard analytics.
 * Runs on port 5000, proxied by Vite on port 3000.
 *
 * Routes:
 *   POST   /api/auth/send-code          — Request OTP
 *   POST   /api/auth/verify-code        — Verify OTP + login/register
 *   POST   /api/auth/logout             — Logout
 *   GET    /api/auth/user/:id           — Get user profile
 *
 *   POST   /api/complaints              — Save complaint + analysis
 *   GET    /api/complaints/:userId      — Get user complaint history
 *   DELETE /api/complaints/:userId/:id  — Delete a complaint
 *   GET    /api/complaints/:userId/stats/summary — User stats
 *
 *   GET    /api/dashboard/global        — Global platform statistics
 *   GET    /api/dashboard/user/:userId  — Per-user dashboard
 *
 *   GET    /api/health                  — Health check
 */

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 10000; // Render and other hosts use dynamic ports

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors()); // Allow all origins
app.use(express.json({ limit: '10mb' })); // Allow large payloads for base64 images/audio
app.use(express.urlencoded({ extended: true }));

// Add explicit headers for strict browsers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.send(`
    <body style="background:#000;color:#f00;font-family:serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">
      <h1 style="font-size:3rem;letter-spacing:0.5rem;text-shadow:0 0 20px #f00;">ANNIYAN</h1>
      <p style="color:#555;text-transform:uppercase;letter-spacing:0.2rem;">Justice System API — Live & Watching</p>
      <div style="margin-top:20px;padding:15px;border:1px solid #300;border-radius:10px;background:#0a0000;font-size:0.8rem;color:#888;">
        Status: <span style="color:#0f0;">ACTIVE</span> | 
        Version: 1.0.0 | 
        Auth: ENABLED
      </div>
    </body>
  `);
});

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Anniyan Justice System API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal server error.', details: err.message });
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   ANNIYAN JUSTICE SYSTEM — BACKEND API           ║
║   Running on http://localhost:${PORT}              ║
║   Anniyan is watching...                         ║
╚══════════════════════════════════════════════════╝
  `);
});

module.exports = app;
