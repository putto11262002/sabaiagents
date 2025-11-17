/**
 * Simple Bun server to serve the prompt editor demo
 *
 * This uses Bun.serve() to serve static files with hot module reloading.
 * The HTML file will automatically bundle and transpile the TypeScript editor code.
 */

import demoHtml from "./prompt-editor-demo.html";

console.log("🚀 Starting Prompt Editor Demo Server...");

Bun.serve({
  port: 3000,
  routes: {
    "/": demoHtml
  },
  development: {
    hmr: true,      // Hot module reloading
    console: true   // Show console logs from browser
  }
});

console.log("✅ Server running at http://localhost:3000");
console.log("📝 Open your browser and try the editor!");
console.log("\nFeatures to try:");
console.log("  • Type '{' for variable suggestions");
console.log("  • Type '@' for command suggestions");
console.log("  • Type 'tools:' for tool suggestions");
console.log("\nPress Ctrl+C to stop the server");
