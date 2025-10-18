/**
 * SQS Queue Consumer for Discord Bot
 *
 * Polls SQS queue for notification messages and processes them
 */

import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, Message } from '@aws-sdk/client-sqs';
import { notifyNewSessionWithPairings, notifyPairings, notifyStandings, notifyNewSession, notifyGeneric } from './notifications';

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
  type: 'session-pairings' | 'pairings' | 'standings' | 'new-session' | 'generic';
  payload: Record<string, unknown>;
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
        await notifyNewSessionWithPairings(notification.payload.sessionId as number);
        break;

      case 'pairings':
        await notifyPairings(
          notification.payload.sessionId as number,
          notification.payload.round as number
        );
        break;

      case 'standings':
        await notifyStandings(notification.payload.sessionId as number);
        break;

      case 'new-session':
        await notifyNewSession(notification.payload.sessionNumber as number);
        break;

      case 'generic':
        await notifyGeneric(
          notification.payload.title as string,
          notification.payload.description as string,
          notification.payload.color as number | undefined
        );
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
