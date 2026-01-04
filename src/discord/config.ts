// Discord bot configuration

export const discordConfig = {
  token: process.env.DISCORD_BOT_TOKEN || '',
  guildId: process.env.DISCORD_GUILD_ID || '',
  channels: {
    pairings: process.env.DISCORD_PAIRINGS_CHANNEL || process.env.DISCORD_CHANNEL_ID || '',
    standings: process.env.DISCORD_STANDINGS_CHANNEL || '',
    decklists: process.env.DISCORD_DECKLISTS_CHANNEL || '',
    banlist: process.env.DISCORD_BANLIST_CHANNEL || '',
    banlistSuggestions: process.env.DISCORD_BANLIST_SUGGESTION_CHANNEL || '',
    leaderboard: process.env.DISCORD_LEADERBOARD_CHANNEL ||  '',
    wallet: process.env.DISCORD_WALLET_CHANNEL || '',
    spending: process.env.DISCORD_SPENDING_CHANNEL || '',
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
