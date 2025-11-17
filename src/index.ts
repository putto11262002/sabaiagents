/**
 * Main entry point for the application
 * Bun server with HTML imports, React, and Tailwind support
 */

import indexHtml from "./public/index.html";

const server = Bun.serve({
  port: 3000,
  routes: {
    // Serve the main HTML file
    "/": indexHtml,

    // API routes can be added here
    "/api/health": {
      GET: () => {
        return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },

  development: {
    // Enable Hot Module Reload in development
    hmr: true,
    // Show console logs in the browser
    console: true,
  },
});

console.log(`🚀 Server running at http://localhost:${server.port}`);
console.log(`📦 Bun version: ${Bun.version}`);