/**
 * Main entry point for the application
 */

async function main() {
  console.log("Hello via Bun!");
  console.log(`Bun version: ${Bun.version}`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});