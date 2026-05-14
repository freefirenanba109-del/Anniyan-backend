/**
 * routes/dashboard.js — Dashboard / Analytics Routes
 * Returns global platform stats and per-user analytics
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/dashboard/global
 * Returns aggregate global statistics across all users.
 */
router.get('/global', (req, res) => {
  const complaints = db.readCollection('complaints');
  const users = db.readCollection('users');

  const total = complaints.length;
  const highSeverity = complaints.filter(c => c.analysis?.severity === 'High').length;
  const mediumSeverity = complaints.filter(c => c.analysis?.severity === 'Medium').length;
  const lowSeverity = complaints.filter(c => c.analysis?.severity === 'Low').length;

  // Top categories globally
  const catCounts = complaints.reduce((acc, item) => {
    let cat = (item.analysis?.mistakeType || 'OTHER')
      .replace('CRIMINAL ACT: ', '')
      .replace('CRITICAL SIN: ', '')
      .trim() || 'OTHER';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));

  // Recent activity (last 10)
  const recentActivity = [...complaints]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 10)
    .map(c => ({
      id: c.id,
      mistakeType: c.analysis?.mistakeType || 'UNKNOWN',
      severity: c.analysis?.severity || 'Low',
      language: c.language,
      timestamp: c.timestamp
    }));

  const decayIndex = total > 0 ? Math.round((highSeverity / total) * 100) : 0;
  const dharmaStability = Math.max(0, 100 - decayIndex);

  return res.json({
    totalComplaints: total,
    totalUsers: users.length,
    highSeverity,
    mediumSeverity,
    lowSeverity,
    decayIndex,
    dharmaStability,
    topCategories,
    recentActivity
  });
});

/**
 * GET /api/dashboard/user/:userId
 * Returns full dashboard data specific to a user.
 */
router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;

  const user = db.findOne('users', { id: userId });
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const complaints = db.find('complaints', { userId });
  const total = complaints.length;
  const highSeverity = complaints.filter(c => c.analysis?.severity === 'High').length;
  const mediumSeverity = complaints.filter(c => c.analysis?.severity === 'Medium').length;
  const lowSeverity = complaints.filter(c => c.analysis?.severity === 'Low').length;

  const catCounts = complaints.reduce((acc, item) => {
    let cat = (item.analysis?.mistakeType || 'OTHER')
      .replace('CRIMINAL ACT: ', '')
      .replace('CRITICAL SIN: ', '')
      .trim() || 'OTHER';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const categoryBreakdown = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));

  const decayValue = total > 0 ? Math.round((highSeverity / total) * 100) : 0;

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      contact: user.contact,
      joinedAt: user.joinedAt
    },
    stats: {
      total,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      decayValue,
      dharmaStability: Math.max(0, 100 - decayValue)
    },
    categoryBreakdown,
    recentComplaints: [...complaints]
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 20)
  });
});

module.exports = router;
