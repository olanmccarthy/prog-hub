// Discord bot configuration

export const discordConfig = {
  token: process.env.DISCORD_BOT_TOKEN || '',
  guildId: process.env.DISCORD_GUILD_ID || '',
  channelId: process.env.DISCORD_CHANNEL_ID || '',
  enabled: process.env.DISCORD_ENABLED === 'true',
};

export function validateDiscordConfig(): boolean {
  if (!discordConfig.enabled) {
    console.log('[Discord] Bot is disabled (DISCORD_ENABLED=false)');
    return false;
  }

  const missing: string[] = [];

  if (!discordConfig.token) missing.push('DISCORD_BOT_TOKEN');
  if (!discordConfig.guildId) missing.push('DISCORD_GUILD_ID');
  if (!discordConfig.channelId) missing.push('DISCORD_CHANNEL_ID');

  if (missing.length > 0) {
    console.error('[Discord] Missing required environment variables:', missing.join(', '));
    return false;
  }

  return true;
}
