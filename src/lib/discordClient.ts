/**
 * Discord Bot SQS Client
 *
 * This client library sends messages to SQS queue for the Discord bot
 * to process asynchronously without importing discord.js in Next.js
 */

import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

const QUEUE_URL = process.env.DISCORD_SQS_QUEUE_URL || '';

interface NotificationMessage {
  type: 'session-pairings' | 'pairings' | 'standings' | 'new-session' | 'generic';
  payload: Record<string, unknown>;
}

/**
 * Send a message to the Discord notification SQS queue
 */
async function sendToQueue(message: NotificationMessage): Promise<boolean> {
  // Only send messages in production
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DiscordClient] Skipping notification in ${process.env.NODE_ENV} mode: ${message.type}`);
    return false;
  }

  if (!QUEUE_URL) {
    console.warn('[DiscordClient] SQS queue URL not configured, skipping notification');
    return false;
  }

  try {
    const command = new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(message),
      MessageGroupId: 'discord-notifications', // Required for FIFO queues
      MessageDeduplicationId: `${message.type}-${Date.now()}-${Math.random()}`, // Required for FIFO queues
    });

    await sqsClient.send(command);
    console.log(`[DiscordClient] Message sent to SQS: ${message.type}`);
    return true;
  } catch (error) {
    console.error('[DiscordClient] Error sending message to SQS:', error);
    return false;
  }
}

/**
 * Send notification when a new session is started with all pairings
 */
export async function notifyNewSessionWithPairings(sessionId: number): Promise<boolean> {
  console.log(`[DiscordClient] Queuing session pairings notification for session ${sessionId}`);
  return sendToQueue({
    type: 'session-pairings',
    payload: { sessionId },
  });
}

/**
 * Send notification when new pairings are generated for a round
 */
export async function notifyPairings(sessionId: number, round: number): Promise<boolean> {
  console.log(`[DiscordClient] Queuing pairings notification for session ${sessionId}, round ${round}`);
  return sendToQueue({
    type: 'pairings',
    payload: { sessionId, round },
  });
}

/**
 * Send notification when standings are finalized
 */
export async function notifyStandings(sessionId: number): Promise<boolean> {
  console.log(`[DiscordClient] Queuing standings notification for session ${sessionId}`);
  return sendToQueue({
    type: 'standings',
    payload: { sessionId },
  });
}

/**
 * Send notification when a new session is started
 */
export async function notifyNewSession(sessionNumber: number): Promise<boolean> {
  console.log(`[DiscordClient] Queuing new session notification for session ${sessionNumber}`);
  return sendToQueue({
    type: 'new-session',
    payload: { sessionNumber },
  });
}

/**
 * Send a generic notification message
 */
export async function notifyGeneric(title: string, description: string, color?: number): Promise<boolean> {
  console.log(`[DiscordClient] Queuing generic notification: ${title}`);
  return sendToQueue({
    type: 'generic',
    payload: { title, description, color },
  });
}
