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

app.use(cors({
  origin: '*', // Allow all origins for the public website
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); // Allow large payloads for base64 images/audio
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────

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
