/**
 * Waits for the Vite dev server to become reachable before launching Electron.
 * Called by the dev:main npm script.
 */
const http = require('http');

const VITE_URL = 'http://localhost:5173';
const MAX_RETRIES = 30;
const INTERVAL_MS = 500;

let attempts = 0;

function check() {
  attempts++;
  http.get(VITE_URL, (res) => {
    // Vite responds even with 404 — connection is established
    console.log(`Vite dev server ready (attempt ${attempts})`);
    process.exit(0);
  }).on('error', () => {
    if (attempts < MAX_RETRIES) {
      setTimeout(check, INTERVAL_MS);
    } else {
      console.error(`Vite dev server not reachable after ${MAX_RETRIES} attempts`);
      process.exit(1);
    }
  });
}

console.log('Waiting for Vite dev server...');
check();
