/**
 * db.js — Lightweight file-based JSON store
 * Acts as a local database using flat JSON files stored in /data
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Reads a JSON collection file. Returns empty array if not found.
 */
function readCollection(name) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * Writes an array to a JSON collection file.
 */
function writeCollection(name, data) {
  const filePath = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Inserts a document into a collection. Auto-assigns createdAt timestamp.
 */
function insert(collection, doc) {
  const data = readCollection(collection);
  const newDoc = { ...doc, createdAt: new Date().toISOString() };
  data.push(newDoc);
  writeCollection(collection, data);
  return newDoc;
}

/**
 * Finds documents in a collection matching a filter object.
 */
function find(collection, filter = {}) {
  const data = readCollection(collection);
  return data.filter(doc =>
    Object.entries(filter).every(([k, v]) => doc[k] === v)
  );
}

/**
 * Finds a single document matching a filter.
 */
function findOne(collection, filter = {}) {
  return find(collection, filter)[0] || null;
}

/**
 * Updates documents matching filter with new values.
 */
function update(collection, filter, updates) {
  const data = readCollection(collection);
  let updated = 0;
  const newData = data.map(doc => {
    const matches = Object.entries(filter).every(([k, v]) => doc[k] === v);
    if (matches) {
      updated++;
      return { ...doc, ...updates, updatedAt: new Date().toISOString() };
    }
    return doc;
  });
  writeCollection(collection, newData);
  return updated;
}

/**
 * Removes documents matching a filter.
 */
function remove(collection, filter) {
  const data = readCollection(collection);
  const newData = data.filter(doc =>
    !Object.entries(filter).every(([k, v]) => doc[k] === v)
  );
  writeCollection(collection, newData);
  return data.length - newData.length;
}

/**
 * Returns count of all documents in a collection.
 */
function count(collection, filter = {}) {
  return find(collection, filter).length;
}

module.exports = { insert, find, findOne, update, remove, count, readCollection };
