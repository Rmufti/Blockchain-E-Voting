// frontend/tests/mockServer.js
const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/votes', (req, res) => {
  const { ranking } = req.body;
  if (!ranking || new Set(ranking).size !== ranking.length) {
    return res.status(400).json({ error: 'Duplicate ranking not allowed' });
  }
  // mock double voting check
  if (req.headers['x-already-voted']) {
    return res.status(403).json({ error: 'Already voted' });
  }
  res.status(200).json({ transactionId: '0xABC123' });
});

module.exports = app;
