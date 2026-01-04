/**
 * SQS Queue Consumer for Discord Bot
 *
 * Polls SQS queue for notification messages and processes them
 */

import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, Message } from '@aws-sdk/client-sqs';
import {
  notifyNewSessionWithPairings,
  notifyPairings,
  notifyStandings,
  notifyNewSession,
  notifyBanlistChosen,
  notifyBanlistSuggestions,
  notifyLeaderboard,
  notifyWalletUpdate,
  notifyTransaction,
  notifyDecklists
} from './notifications';

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

const QUEUE_URL = process.env.DISCORD_SQS_QUEUE_URL || '';
const POLL_INTERVAL = parseInt(process.env.SQS_POLL_INTERVAL || '60000', 10); // Default 1 minute

interface NotificationMessage {
  type: 'session-pairings' | 'pairings' | 'standings' | 'new-session' | 'banlist-chosen' | 'banlist-suggestions' | 'leaderboard' | 'wallet-update' | 'transaction' | 'decklists';
  payload: Record<string, unknown>;
}

/**
 * Runtime validation helpers
 */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function validateSessionId(payload: Record<string, unknown>): number {
  const { sessionId } = payload;
  if (!isNumber(sessionId)) {
    throw new Error(`Invalid sessionId: expected number, got ${typeof sessionId}`);
  }
  return sessionId;
}

function validatePairingsPayload(payload: Record<string, unknown>): { sessionId: number; round: number } {
  const sessionId = validateSessionId(payload);
  const { round } = payload;
  if (!isNumber(round)) {
    throw new Error(`Invalid round: expected number, got ${typeof round}`);
  }
  return { sessionId, round };
}

function validateSessionNumber(payload: Record<string, unknown>): number {
  const { sessionNumber } = payload;
  if (!isNumber(sessionNumber)) {
    throw new Error(`Invalid sessionNumber: expected number, got ${typeof sessionNumber}`);
  }
  return sessionNumber;
}


function validateTransactionPayload(payload: Record<string, unknown>): { playerId: number; setId: number; amount: number; sessionId?: number } {
  const { playerId, setId, amount, sessionId } = payload;
  if (!isNumber(playerId)) {
    throw new Error(`Invalid playerId: expected number, got ${typeof playerId}`);
  }
  if (!isNumber(setId)) {
    throw new Error(`Invalid setId: expected number, got ${typeof setId}`);
  }
  if (!isNumber(amount)) {
    throw new Error(`Invalid amount: expected number, got ${typeof amount}`);
  }
  if (sessionId !== undefined && !isNumber(sessionId)) {
    throw new Error(`Invalid sessionId: expected number or undefined, got ${typeof sessionId}`);
  }
  return { playerId, setId, amount, sessionId: sessionId as number | undefined };
}

/**
 * Process a single message from the queue
 */
async function processMessage(message: Message): Promise<void> {
  if (!message.Body) {
    console.warn('[QueueConsumer] Received message with no body');
    return;
  }

  try {
    const notification: NotificationMessage = JSON.parse(message.Body);
    console.log(`[QueueConsumer] Processing message: ${notification.type}`);

    switch (notification.type) {
      case 'session-pairings':
        await notifyNewSessionWithPairings(validateSessionId(notification.payload));
        break;

      case 'pairings': {
        const { sessionId, round } = validatePairingsPayload(notification.payload);
        await notifyPairings(sessionId, round);
        break;
      }

      case 'standings':
        await notifyStandings(validateSessionId(notification.payload));
        break;

      case 'new-session':
        await notifyNewSession(validateSessionNumber(notification.payload));
        break;

      case 'banlist-chosen':
        await notifyBanlistChosen(validateSessionNumber(notification.payload));
        break;

      case 'banlist-suggestions':
        await notifyBanlistSuggestions(validateSessionId(notification.payload));
        break;

      case 'leaderboard':
        await notifyLeaderboard(validateSessionId(notification.payload));
        break;

      case 'wallet-update':
        await notifyWalletUpdate(validateSessionId(notification.payload));
        break;

      case 'transaction': {
        const { playerId, setId, amount, sessionId } = validateTransactionPayload(notification.payload);
        await notifyTransaction(playerId, setId, amount, sessionId);
        break;
      }

      case 'decklists':
        await notifyDecklists(validateSessionId(notification.payload));
        break;

      default:
        console.warn(`[QueueConsumer] Unknown message type: ${notification.type}`);
    }

    // Delete the message from the queue after successful processing
    if (message.ReceiptHandle) {
      await sqsClient.send(new DeleteMessageCommand({
        QueueUrl: QUEUE_URL,
        ReceiptHandle: message.ReceiptHandle,
      }));
      console.log(`[QueueConsumer] Message deleted from queue`);
    }
  } catch (error) {
    console.error('[QueueConsumer] Error processing message:', error);
    // Message will remain in queue and be retried
  }
}

/**
 * Poll the SQS queue for messages
 */
async function pollQueue(): Promise<void> {
  if (!QUEUE_URL) {
    console.warn('[QueueConsumer] SQS queue URL not configured, skipping poll');
    return;
  }

  try {
    const command = new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 10, // Process up to 10 messages at once
      WaitTimeSeconds: 20, // Long polling (wait up to 20 seconds for messages)
      VisibilityTimeout: 30, // Give 30 seconds to process before message becomes visible again
    });

    const response = await sqsClient.send(command);

    if (response.Messages && response.Messages.length > 0) {
      console.log(`[QueueConsumer] Received ${response.Messages.length} message(s)`);

      // Process messages in parallel
      await Promise.all(response.Messages.map(processMessage));
    }
  } catch (error) {
    console.error('[QueueConsumer] Error polling queue:', error);
  }
}

/**
 * Start the queue consumer
 */
export function startQueueConsumer(): void {
  if (!QUEUE_URL) {
    console.warn('[QueueConsumer] SQS queue URL not configured, consumer not started');
    return;
  }

  console.log(`[QueueConsumer] Starting SQS queue consumer (poll interval: ${POLL_INTERVAL}ms)`);

  // Start continuous polling
  const poll = async () => {
    await pollQueue();
    setTimeout(poll, POLL_INTERVAL);
  };

  poll();
}
