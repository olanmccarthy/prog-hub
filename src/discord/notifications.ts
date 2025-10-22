import { EmbedBuilder } from 'discord.js';
import { getNotificationChannel, getChannel, isBotReady } from './bot';
import { prisma } from '@lib/prisma';

/**
 * Send a Discord notification to the configured channel
 */
async function sendNotification(embed: EmbedBuilder): Promise<boolean> {
  if (!isBotReady()) {
    console.warn('[Discord] Cannot send notification - bot not ready');
    return false;
  }

  try {
    const channel = await getNotificationChannel();
    if (!channel) {
      console.error('[Discord] Failed to get notification channel');
      return false;
    }

    await channel.send({ embeds: [embed] });
    console.log('[Discord] Notification sent successfully');
    return true;
  } catch (error) {
    console.error('[Discord] Error sending notification:', error);
    return false;
  }
}

/**
 * Send notification when new pairings are generated for a round
 */
export async function notifyPairings(sessionId: number, round: number): Promise<boolean> {
  console.log(`[Discord] Preparing pairings notification for session ${sessionId}, round ${round}`);

  try {
    // Fetch pairings and session in parallel (optimization)
    const [pairings, session] = await Promise.all([
      prisma.pairing.findMany({
        where: {
          sessionId,
          round,
        },
        include: {
          player1: true,
          player2: true,
        },
        orderBy: { id: 'asc' },
      }),
      prisma.session.findUnique({
        where: { id: sessionId },
      }),
    ]);

    if (pairings.length === 0) {
      console.warn('[Discord] No pairings found for this round');
      return false;
    }

    if (!session) {
      console.error('[Discord] Session not found');
      return false;
    }

    // Build embed message
    const embed = new EmbedBuilder()
      .setTitle(`🎮 Round ${round} Pairings - Session ${session.number}`)
      .setColor('#0099ff')
      .setTimestamp();

    // Add each pairing as a field
    pairings.forEach((pairing, index) => {
      embed.addFields({
        name: `Table ${index + 1}`,
        value: `${pairing.player1.name} vs ${pairing.player2.name}`,
        inline: false,
      });
    });

    embed.setFooter({ text: 'Good luck, duelists!' });

    return await sendToChannel('pairings', embed);
  } catch (error) {
    console.error('[Discord] Error preparing pairings notification:', error);
    return false;
  }
}

/**
 * Send notification when standings are finalized
 */
export async function notifyStandings(sessionId: number): Promise<boolean> {
  console.log(`[Discord] Preparing standings notification for session ${sessionId}`);

  try {
    // Fetch session, victory points, and pairings in parallel (optimization)
    const [session, victoryPoints, pairings] = await Promise.all([
      prisma.session.findUnique({
        where: { id: sessionId },
      }),
      prisma.victoryPoint.findMany({
        where: { sessionId },
        include: { player: true },
      }),
      prisma.pairing.findMany({
        where: { sessionId },
        include: {
          player1: true,
          player2: true,
        },
      }),
    ]);

    if (!session) {
      console.error('[Discord] Session not found');
      return false;
    }

    // Calculate standings
    const standingsMap = new Map<number, {
      playerId: number;
      playerName: string;
      vp: number;
      matchWins: number;
      gameWins: number;
    }>();

    // Initialize standings with VP
    victoryPoints.forEach(vp => {
      standingsMap.set(vp.playerId, {
        playerId: vp.playerId,
        playerName: vp.player.name,
        vp: 1,
        matchWins: 0,
        gameWins: 0,
      });
    });

    // Calculate match wins and game wins
    pairings.forEach(pairing => {
      const p1 = standingsMap.get(pairing.player1Id);
      const p2 = standingsMap.get(pairing.player2Id);

      if (!p1 || !p2) return;

      p1.gameWins += pairing.player1wins;
      p2.gameWins += pairing.player2wins;

      if (pairing.player1wins > pairing.player2wins) {
        p1.matchWins += 1;
      } else if (pairing.player2wins > pairing.player1wins) {
        p2.matchWins += 1;
      }
    });

    // Sort standings: VP > Match Wins > Game Wins
    const standings = Array.from(standingsMap.values()).sort((a, b) => {
      if (b.vp !== a.vp) return b.vp - a.vp;
      if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
      return b.gameWins - a.gameWins;
    });

    // Build embed message
    const embed = new EmbedBuilder()
      .setTitle(`🏆 Final Standings - Session ${session.number}`)
      .setColor('#ffd700')
      .setTimestamp();

    // Add top 6 placements
    const topPlayers = standings.slice(0, 6);
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'];

    topPlayers.forEach((standing, index) => {
      embed.addFields({
        name: `${medals[index]} ${standing.playerName}`,
        value: `VP: ${standing.vp} | Match Wins: ${standing.matchWins} | Game Wins: ${standing.gameWins}`,
        inline: false,
      });
    });

    // Add remaining players if any
    if (standings.length > 6) {
      const others = standings.slice(6)
        .map((s, i) => `${i + 7}. ${s.playerName} (${s.matchWins}-${s.gameWins})`)
        .join('\n');

      embed.addFields({
        name: 'Other Participants',
        value: others,
        inline: false,
      });
    }

    embed.setFooter({ text: 'Congratulations to all participants!' });

    return await sendToChannel('standings', embed);
  } catch (error) {
    console.error('[Discord] Error preparing standings notification:', error);
    return false;
  }
}

/**
 * Send notification when a new session is started with all pairings
 */
export async function notifyNewSessionWithPairings(sessionId: number): Promise<boolean> {
  console.log(`[Discord] Preparing new session notification with pairings for session ${sessionId}`);

  try {
    // Fetch session and pairings in parallel (optimization)
    const [session, pairings] = await Promise.all([
      prisma.session.findUnique({
        where: { id: sessionId },
      }),
      prisma.pairing.findMany({
        where: { sessionId },
        include: {
          player1: true,
          player2: true,
        },
        orderBy: [
          { round: 'asc' },
          { id: 'asc' },
        ],
      }),
    ]);

    if (!session) {
      console.error('[Discord] Session not found');
      return false;
    }

    if (pairings.length === 0) {
      console.warn('[Discord] No pairings found for this session');
      return false;
    }

    // Group pairings by round
    const pairingsByRound = new Map<number, typeof pairings>();
    pairings.forEach(pairing => {
      if (!pairingsByRound.has(pairing.round)) {
        pairingsByRound.set(pairing.round, []);
      }
      pairingsByRound.get(pairing.round)!.push(pairing);
    });

    // Build embed message
    const embed = new EmbedBuilder()
      .setTitle(`🎉 Session ${session.number} - New Prog Started!`)
      .setDescription(`All pairings have been generated. Good luck, duelists!`)
      .setColor('#00ff00')
      .setTimestamp();

    // Add each round as a field
    const rounds = Array.from(pairingsByRound.keys()).sort((a, b) => a - b);
    rounds.forEach(round => {
      const roundPairings = pairingsByRound.get(round)!;
      const pairingsText = roundPairings
        .map((p, idx) => `Table ${idx + 1}: ${p.player1.name} vs ${p.player2.name}`)
        .join('\n');

      embed.addFields({
        name: `📋 Round ${round}`,
        value: pairingsText,
        inline: false,
      });
    });

    embed.setFooter({ text: `${pairings.length} matches across ${rounds.length} rounds` });

    return await sendToChannel('pairings', embed);
  } catch (error) {
    console.error('[Discord] Error preparing new session notification:', error);
    return false;
  }
}

/**
 * Send notification when a new session is started
 */
export async function notifyNewSession(sessionNumber: number): Promise<boolean> {
  console.log(`[Discord] Preparing new session notification for session ${sessionNumber}`);

  try {
    const embed = new EmbedBuilder()
      .setTitle(`🎉 New Session Started!`)
      .setDescription(`**Session ${sessionNumber}** has begun!`)
      .setColor('#00ff00')
      .addFields(
        { name: 'What to do next', value: '1. Submit your decklist\n2. Wait for round 1 pairings\n3. Report your match results', inline: false }
      )
      .setTimestamp()
      .setFooter({ text: 'Good luck in this session!' });

    return await sendToChannel('pairings', embed);
  } catch (error) {
    console.error('[Discord] Error preparing new session notification:', error);
    return false;
  }
}

/**
 * Send a generic notification message
 */
export async function notifyGeneric(title: string, description: string, color?: number): Promise<boolean> {
  console.log(`[Discord] Sending generic notification: ${title}`);

  try {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color || '#0099ff')
      .setTimestamp();

    return await sendNotification(embed);
  } catch (error) {
    console.error('[Discord] Error sending generic notification:', error);
    return false;
  }
}

/**
 * Send notification to a specific channel
 */
async function sendToChannel(channelType: Parameters<typeof getChannel>[0], embed: EmbedBuilder): Promise<boolean> {
  if (!isBotReady()) {
    console.warn('[Discord] Cannot send notification - bot not ready');
    return false;
  }

  try {
    const channel = await getChannel(channelType);
    if (!channel) {
      console.error(`[Discord] Failed to get ${channelType} channel`);
      return false;
    }

    await channel.send({ embeds: [embed] });
    console.log(`[Discord] Notification sent to ${channelType} channel`);
    return true;
  } catch (error) {
    console.error(`[Discord] Error sending to ${channelType} channel:`, error);
    return false;
  }
}

/**
 * Get card names from IDs
 */
async function getCardNames(cardIds: number[]): Promise<Map<number, string>> {
  if (cardIds.length === 0) return new Map();

  const cards = await prisma.card.findMany({
    where: { id: { in: cardIds } },
    select: { id: true, cardName: true },
  });

  return new Map(cards.map(c => [c.id, c.cardName]));
}

/**
 * Send notification when a banlist is chosen by moderator
 */
export async function notifyBanlistChosen(sessionId: number): Promise<boolean> {
  console.log(`[Discord] Preparing banlist chosen notification for session ${sessionId}`);

  try {
    const [session, banlist] = await Promise.all([
      prisma.session.findUnique({
        where: { id: sessionId },
        include: { set: true },
      }),
      prisma.banlist.findFirst({
        where: { sessionId },
      }),
    ]);

    if (!session || !banlist) {
      console.error('[Discord] Session or banlist not found');
      return false;
    }

    // Get previous banlist to compare
    const previousBanlist = await prisma.banlist.findFirst({
      where: { sessionId: sessionId - 1 },
    });

    // Get all card IDs
    const allCardIds = new Set([
      ...(banlist.banned as number[]),
      ...(banlist.limited as number[]),
      ...(banlist.semilimited as number[]),
      ...(banlist.unlimited as number[]),
    ]);

    const cardNames = await getCardNames(Array.from(allCardIds));

    // Determine which cards are new in their positions
    const prevBanned = new Set(previousBanlist ? (previousBanlist.banned as number[]) : []);
    const prevLimited = new Set(previousBanlist ? (previousBanlist.limited as number[]) : []);
    const prevSemilimited = new Set(previousBanlist ? (previousBanlist.semilimited as number[]) : []);
    const prevUnlimited = new Set(previousBanlist ? (previousBanlist.unlimited as number[]) : []);

    const formatCards = (cardIds: number[], prevSet: Set<number>) => {
      return cardIds
        .map(id => {
          const name = cardNames.get(id) || `Unknown (${id})`;
          const isNew = !prevSet.has(id);
          return isNew ? `🆕 ${name}` : name;
        })
        .join('\n') || 'None';
    };

    const embed = new EmbedBuilder()
      .setTitle(`📜 Banlist Updated - Session ${session.number}`)
      .setDescription(`**Set:** ${session.set?.setName || 'Unknown'} (${session.set?.setCode || 'N/A'})`)
      .setColor('#9b59b6')
      .setTimestamp();

    embed.addFields(
      { name: '🚫 Banned', value: formatCards(banlist.banned as number[], prevBanned), inline: false },
      { name: '1️⃣ Limited', value: formatCards(banlist.limited as number[], prevLimited), inline: false },
      { name: '2️⃣ Semi-Limited', value: formatCards(banlist.semilimited as number[], prevSemilimited), inline: false },
      { name: '♾️ Unlimited', value: formatCards(banlist.unlimited as number[], prevUnlimited), inline: false }
    );

    embed.setFooter({ text: '🆕 = New to this position' });

    return await sendToChannel('banlist', embed);
  } catch (error) {
    console.error('[Discord] Error preparing banlist notification:', error);
    return false;
  }
}

/**
 * Send notifications for all banlist suggestions
 */
export async function notifyBanlistSuggestions(sessionId: number): Promise<boolean> {
  console.log(`[Discord] Preparing banlist suggestions notifications for session ${sessionId}`);

  try {
    const [session, banlist] = await Promise.all([
      prisma.session.findUnique({
        where: { id: sessionId },
        include: { set: true },
      }),
      prisma.banlist.findFirst({
        where: { sessionId },
      }),
    ]);

    if (!session || !banlist) {
      console.error('[Discord] Session or banlist not found');
      return false;
    }

    const suggestions = await prisma.banlistSuggestion.findMany({
      where: { banlistId: banlist.id },
      include: { player: true },
      orderBy: { id: 'asc' },
    });

    if (suggestions.length === 0) {
      console.warn('[Discord] No suggestions found');
      return false;
    }

    const channel = await getChannel('banlistSuggestions');
    if (!channel) {
      console.error('[Discord] Failed to get banlist suggestions channel');
      return false;
    }

    // Send each suggestion as a separate message
    for (const suggestion of suggestions) {
      const allCardIds = new Set([
        ...(suggestion.banned as number[]),
        ...(suggestion.limited as number[]),
        ...(suggestion.semilimited as number[]),
        ...(suggestion.unlimited as number[]),
      ]);

      const cardNames = await getCardNames(Array.from(allCardIds));

      const formatCards = (cardIds: number[]) => {
        return cardIds
          .map(id => cardNames.get(id) || `Unknown (${id})`)
          .join('\n') || 'None';
      };

      const embed = new EmbedBuilder()
        .setTitle(`💡 Banlist Suggestion - Session ${session.number}`)
        .setDescription(`**Suggested by:** ${suggestion.player.name}\n**Set:** ${session.set?.setName || 'Unknown'} (${session.set?.setCode || 'N/A'})`)
        .setColor('#3498db')
        .setTimestamp();

      embed.addFields(
        { name: '🚫 Banned', value: formatCards(suggestion.banned as number[]), inline: false },
        { name: '1️⃣ Limited', value: formatCards(suggestion.limited as number[]), inline: false },
        { name: '2️⃣ Semi-Limited', value: formatCards(suggestion.semilimited as number[]), inline: false },
        { name: '♾️ Unlimited', value: formatCards(suggestion.unlimited as number[]), inline: false }
      );

      await channel.send({ embeds: [embed] });
    }

    console.log(`[Discord] Sent ${suggestions.length} banlist suggestion notifications`);
    return true;
  } catch (error) {
    console.error('[Discord] Error preparing banlist suggestions notifications:', error);
    return false;
  }
}

/**
 * Send notification when leaderboard is updated (victory point assigned)
 */
export async function notifyLeaderboard(sessionId: number): Promise<boolean> {
  console.log(`[Discord] Preparing leaderboard notification for session ${sessionId}`);

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { set: true },
    });

    if (!session) {
      console.error('[Discord] Session not found');
      return false;
    }

    // Get all victory points grouped by player
    const victoryPoints = await prisma.victoryPoint.findMany({
      include: { player: true },
      orderBy: { id: 'asc' },
    });

    // Count VPs per player
    const vpCounts = new Map<string, number>();
    victoryPoints.forEach(vp => {
      const current = vpCounts.get(vp.player.name) || 0;
      vpCounts.set(vp.player.name, current + 1);
    });

    // Sort by VP count
    const leaderboard = Array.from(vpCounts.entries())
      .map(([name, vps]) => ({ name, vps }))
      .sort((a, b) => b.vps - a.vps);

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Victory Point Leaderboard Updated`)
      .setDescription(`**Session ${session.number}** - ${session.set?.setName || 'Unknown'} (${session.set?.setCode || 'N/A'})`)
      .setColor('#ffd700')
      .setTimestamp();

    const medals = ['🥇', '🥈', '🥉'];
    leaderboard.forEach((entry, index) => {
      const medal = index < 3 ? medals[index] : `${index + 1}.`;
      embed.addFields({
        name: `${medal} ${entry.name}`,
        value: `${entry.vps} Victory Point${entry.vps !== 1 ? 's' : ''}`,
        inline: true,
      });
    });

    embed.setFooter({ text: 'Keep dueling for victory!' });

    return await sendToChannel('leaderboard', embed);
  } catch (error) {
    console.error('[Discord] Error preparing leaderboard notification:', error);
    return false;
  }
}

/**
 * Send notification when wallet points are updated
 */
export async function notifyWalletUpdate(sessionId: number): Promise<boolean> {
  console.log(`[Discord] Preparing wallet update notification for session ${sessionId}`);

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { set: true },
    });

    if (!session) {
      console.error('[Discord] Session not found');
      return false;
    }

    // Get all wallets with player info
    const wallets = await prisma.wallet.findMany({
      include: { player: true },
      orderBy: { amount: 'desc' },
    });

    const embed = new EmbedBuilder()
      .setTitle(`💰 Wallet Balances Updated`)
      .setDescription(`**Session ${session.number}** - ${session.set?.setName || 'Unknown'} (${session.set?.setCode || 'N/A'})`)
      .setColor('#2ecc71')
      .setTimestamp();

    wallets.forEach(wallet => {
      embed.addFields({
        name: wallet.player.name,
        value: `${wallet.amount} Dollarydoo${wallet.amount !== 1 ? 's' : ''}`,
        inline: true,
      });
    });

    embed.setFooter({ text: 'Spend wisely!' });

    return await sendToChannel('wallet', embed);
  } catch (error) {
    console.error('[Discord] Error preparing wallet notification:', error);
    return false;
  }
}

/**
 * Send notification when a player makes a purchase
 */
export async function notifyTransaction(playerId: number, setId: number, amount: number, sessionId?: number): Promise<boolean> {
  console.log(`[Discord] Preparing transaction notification for player ${playerId}`);

  try {
    const [player, set, session] = await Promise.all([
      prisma.player.findUnique({ where: { id: playerId } }),
      prisma.set.findUnique({ where: { id: setId } }),
      sessionId ? prisma.session.findUnique({ where: { id: sessionId }, include: { set: true } }) : null,
    ]);

    if (!player || !set) {
      console.error('[Discord] Player or set not found');
      return false;
    }

    const embed = new EmbedBuilder()
      .setTitle(`💸 Purchase Made`)
      .setDescription(
        session
          ? `**Session ${session.number}** - ${session.set?.setName || 'Unknown'} (${session.set?.setCode || 'N/A'})`
          : 'Purchase'
      )
      .setColor('#e74c3c')
      .setTimestamp();

    embed.addFields(
      { name: 'Player', value: player.name, inline: true },
      { name: 'Amount', value: `${amount} Dollarydoo${amount !== 1 ? 's' : ''}`, inline: true },
      { name: 'Purchase', value: `${set.setName} (${set.setCode})`, inline: false }
    );

    return await sendToChannel('spending', embed);
  } catch (error) {
    console.error('[Discord] Error preparing transaction notification:', error);
    return false;
  }
}
