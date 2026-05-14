/**
 * routes/complaints.js — Complaint Management Routes
 * CRUD for complaints + history per user
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

/**
 * POST /api/complaints
 * Saves a complaint + analysis result for a user.
 * Body: { userId, analysis, language }
 */
router.post('/', (req, res) => {
  const { userId, analysis, language } = req.body;

  if (!userId || !analysis) {
    return res.status(400).json({ error: 'userId and analysis are required.' });
  }

  const complaint = {
    id: uuidv4(),
    userId,
    analysis,
    language: language || 'English',
    timestamp: Date.now()
  };

  const saved = db.insert('complaints', complaint);
  return res.status(201).json(saved);
});

/**
 * GET /api/complaints/:userId
 * Returns all complaints for a user, sorted newest first.
 */
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const all = db.find('complaints', { userId });
  const sorted = all.sort((a, b) => b.timestamp - a.timestamp);
  return res.json(sorted);
});

/**
 * GET /api/complaints/:userId/:id
 * Returns a specific complaint by its ID.
 */
router.get('/:userId/:id', (req, res) => {
  const { userId, id } = req.params;
  const complaint = db.findOne('complaints', { id, userId });
  if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
  return res.json(complaint);
});

/**
 * DELETE /api/complaints/:userId/:id
 * Deletes a specific complaint.
 */
router.delete('/:userId/:id', (req, res) => {
  const { userId, id } = req.params;
  const deleted = db.remove('complaints', { id, userId });
  if (!deleted) return res.status(404).json({ error: 'Complaint not found.' });
  return res.json({ success: true });
});

/**
 * GET /api/complaints/:userId/stats/summary
 * Returns aggregate stats for a user's complaints.
 */
router.get('/:userId/stats/summary', (req, res) => {
  const { userId } = req.params;
  const complaints = db.find('complaints', { userId });

  const total = complaints.length;
  const highSeverity = complaints.filter(c => c.analysis?.severity === 'High').length;
  const mediumSeverity = complaints.filter(c => c.analysis?.severity === 'Medium').length;
  const lowSeverity = complaints.filter(c => c.analysis?.severity === 'Low').length;

  // Category breakdown
  const catCounts = complaints.reduce((acc, item) => {
    let cat = (item.analysis?.mistakeType || 'OTHER')
      .replace('CRIMINAL ACT: ', '')
      .replace('CRITICAL SIN: ', '')
      .trim();
    if (!cat) cat = 'OTHER';
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
    total,
    highSeverity,
    mediumSeverity,
    lowSeverity,
    decayValue,
    categoryBreakdown,
    lastComplaintAt: complaints.length > 0
      ? Math.max(...complaints.map(c => c.timestamp))
      : null
  });
});

module.exports = router;
