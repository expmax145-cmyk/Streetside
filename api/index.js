// Vercel serverless entry: runs the Express API (compiled to backend/dist
// by the build step) and reuses one MongoDB connection across invocations.
const { createApp } = require('../backend/dist/app');
const { connectDB } = require('../backend/dist/config/db');

const app = createApp();
let dbReady = null;

module.exports = async (req, res) => {
  try {
    dbReady = dbReady || connectDB();
    await dbReady;
  } catch (err) {
    dbReady = null; // retry on the next request
    console.error('[api] database connection failed:', err.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: false, message: 'Database unavailable' }));
  }
  return app(req, res);
};
