import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { discordConfig, validateDiscordConfig } from './config';

let client: Client | null = null;
let isReady = false;

/**
 * Initialize and connect the Discord bot
 */
export async function initializeBot(): Promise<void> {
  if (!validateDiscordConfig()) {
    console.log('[Discord] Skipping bot initialization (disabled or missing config)');
    return;
  }

  if (client) {
    console.log('[Discord] Bot already initialized');
    return;
  }

  console.log('[Discord] Initializing bot...');

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  client.once('ready', () => {
    isReady = true;
    console.log(`[Discord] Bot logged in as ${client?.user?.tag}`);
  });

  client.on('error', (error) => {
    console.error('[Discord] Client error:', error);
  });

  try {
    await client.login(discordConfig.token);
  } catch (error) {
    console.error('[Discord] Failed to login:', error);
    client = null;
    throw error;
  }
}

/**
 * Get the Discord client instance
 */
export function getClient(): Client | null {
  return client;
}

/**
 * Check if bot is ready to send messages
 */
export function isBotReady(): boolean {
  return isReady && client !== null;
}

/**
 * Get the configured notification channel
 */
export async function getNotificationChannel(): Promise<TextChannel | null> {
  if (!client || !isReady) {
    console.warn('[Discord] Bot not ready');
    return null;
  }

  try {
    const channel = await client.channels.fetch(discordConfig.channelId);

    if (!channel || !channel.isTextBased()) {
      console.error('[Discord] Channel not found or is not text-based');
      return null;
    }

    return channel as TextChannel;
  } catch (error) {
    console.error('[Discord] Error fetching channel:', error);
    return null;
  }
}

/**
 * Gracefully shutdown the bot
 */
export async function shutdownBot(): Promise<void> {
  if (client) {
    console.log('[Discord] Shutting down bot...');
    await client.destroy();
    client = null;
    isReady = false;
  }
}
