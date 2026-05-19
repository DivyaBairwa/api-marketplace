const { rateLimitPerSecond } = require("../config");

const WINDOW_MS = 1000;
const hits = new Map();

function check(apiKey) {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  let arr = hits.get(apiKey);
  if (!arr) {
    arr = [];
    hits.set(apiKey, arr);
  }
  while (arr.length && arr[0] < cutoff) {
    arr.shift();
  }
  if (arr.length >= rateLimitPerSecond) {
    return { allowed: false, remaining: 0 };
  }
  arr.push(now);
  return { allowed: true, remaining: rateLimitPerSecond - arr.length };
}

setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS * 60;
  for (const [k, arr] of hits) {
    if (!arr.length || arr[arr.length - 1] < cutoff) hits.delete(k);
  }
}, 60_000).unref();

module.exports = { check };
