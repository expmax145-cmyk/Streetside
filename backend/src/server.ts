import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import mongoose from 'mongoose';

async function main() {
  await connectDB();

  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`[server] StreetSide API listening on port ${env.port} (${env.nodeEnv})`);
  });

  // Graceful shutdown — close HTTP server, then Mongo,
  // then force-exit after 10 s in case something hangs.
  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} received, shutting down gracefully...`);
    const forceExit = setTimeout(() => {
      console.error('[server] Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000);
    forceExit.unref(); // don't keep process alive for the timer alone

    server.close(async () => {
      console.log('[server] HTTP server closed');
      try {
        await mongoose.disconnect();
        console.log('[server] MongoDB disconnected');
      } catch (err) {
        console.error('[server] Error disconnecting MongoDB:', err);
      }
      clearTimeout(forceExit);
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
