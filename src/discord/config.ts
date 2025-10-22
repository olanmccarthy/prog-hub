// Discord bot configuration

export const discordConfig = {
  token: process.env.DISCORD_BOT_TOKEN || '',
  guildId: process.env.DISCORD_GUILD_ID || '',
  channels: {
    pairings: process.env.DISCORD_CHANNEL_PAIRINGS || process.env.DISCORD_CHANNEL_ID || '',
    banlist: process.env.DISCORD_CHANNEL_BANLIST || process.env.DISCORD_CHANNEL_ID || '',
    banlistSuggestions: process.env.DISCORD_CHANNEL_BANLIST_SUGGESTIONS || process.env.DISCORD_CHANNEL_ID || '',
    leaderboard: process.env.DISCORD_CHANNEL_LEADERBOARD || process.env.DISCORD_CHANNEL_ID || '',
    wallet: process.env.DISCORD_CHANNEL_WALLET || process.env.DISCORD_CHANNEL_ID || '',
    spending: process.env.DISCORD_CHANNEL_SPENDING || process.env.DISCORD_CHANNEL_ID || '',
  },
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

  // Check if at least one channel is configured
  const hasChannel = Object.values(discordConfig.channels).some(channelId => channelId !== '');
  if (!hasChannel) {
    missing.push('At least one DISCORD_CHANNEL_* variable');
  }

  if (missing.length > 0) {
    console.error('[Discord] Missing required environment variables:', missing.join(', '));
    return false;
  }

  return true;
}
