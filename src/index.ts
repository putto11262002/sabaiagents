/**
 * Main entry point for the application
 * Express server with Vite integration for React frontend
 */

import express from 'express';
import dotenv from 'dotenv';
import { setupVite } from './server/vite-dev-server.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes (defined before Vite middleware)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Add more API routes here
app.get('/api/users/:id', (req, res) => {
  res.json({
    id: req.params.id,
    name: 'Example User',
  });
});

// Setup Vite integration (dev server or static files)
async function startServer() {
  try {
    // Setup Vite (returns dev server instance in dev mode, null in prod)
    const vite = await setupVite(app);

    // Start Express server
    const server = app.listen(port, () => {
      console.log(`\n🚀 Server running at http://localhost:${port}`);
      console.log(`📦 Node.js version: ${process.version}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('\n👋 SIGTERM received, closing server gracefully...');
      server.close(async () => {
        if (vite) {
          await vite.close();
        }
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
