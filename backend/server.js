const express = require('express');
const path = require('path');
const app = require('./api/index.js');

const PORT = process.env.PORT || 3001;

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../frontend/build')));

// AFTER all API routes, send all other requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 MatrixFlow server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
});
