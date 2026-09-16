// undici 8 (used by jsdom) calls this Node 22 utility. Keep the test suite
// runnable on Netlify/local Node 20 without changing browser-facing code.
const workerThreads = require("node:worker_threads");

if (typeof workerThreads.markAsUncloneable !== "function") {
  workerThreads.markAsUncloneable = (value) => value;
}
