#!/usr/bin/env node

/**
 * Discord Bot Entry Point
 *
 * This script initializes and runs the Discord notification bot.
 * It connects to Discord and starts an SQS queue consumer for receiving
 * notification requests from the Next.js app via AWS SQS.
 */

import { initializeBot, shutdownBot } from './bot';
import { startQueueConsumer } from './api';

async function main() {
  console.log('[Discord] Starting Discord bot service...');

  try {
    // Start the bot
    await initializeBot();
    console.log('[Discord] Bot service started successfully');

    // Start the SQS queue consumer
    startQueueConsumer();
  } catch (error) {
    console.error('[Discord] Failed to start bot service:', error);
    process.exit(1);
  }

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[Discord] Received SIGINT, shutting down gracefully...');
    await shutdownBot();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n[Discord] Received SIGTERM, shutting down gracefully...');
    await shutdownBot();
    process.exit(0);
  });
}

main();
