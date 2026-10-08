/**
 * TeleDerma: Medicine Alternative Finder
 * Standalone Microservice / Module Server
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const medicineRoutes = require('./routes/medicineRoutes');
const { checkHealth } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & cross-origin middleware
app.use(cors());
app.use(express.json());

// Serve static assets for optional demo UI
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbStatus = await checkHealth();
  res.status(200).json({
    status: 'healthy',
    service: 'TeleDerma Medicine Alternative Finder',
    version: '1.0.0',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Mount medicine module routes
app.use('/api/medicines', medicineRoutes);

// Fallback 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route ${req.method} ${req.originalUrl} not found.`
  });
});

// Centralized error handling middleware
app.use((err, req, res, _next) => {
  console.error('[ServerError] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'An unexpected internal error occurred.'
  });
});

// Start listening if run directly
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log('========================================================');
    console.log(` TeleDerma: Medicine Alternative Finder Module running `);
    console.log(` Port: ${PORT}`);
    console.log(` Local URL: http://localhost:${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/health`);
    console.log(` API Base: http://localhost:${PORT}/api/medicines`);
    console.log('========================================================');
  });

  const shutdown = () => {
    console.log('\nGracefully terminating server...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = app;
