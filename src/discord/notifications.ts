import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { getChannel, isBotReady } from './bot';
import { prisma } from '@lib/prisma';

/**
 * Helper function to strip language code suffix from set code
 * Example: "LOB-EN" -> "LOB", "SDK-EN" -> "SDK"
 */
function stripLanguageCode(setCode: string | null | undefined): string {
  if (!setCode) return 'N/A';
  return setCode.replace(/-[A-Z]{2}$/, '');
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
        include: { set: true },
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
      .setTitle(`🎮 Round ${round} Pairings - Session ${session.number} (${stripLanguageCode(session.set?.setCode)})`)
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
    // Fetch session and pairings
    const [session, pairings] = await Promise.all([
      prisma.session.findUnique({
        where: { id: sessionId },
        include: { set: true },
      }),
      prisma.pairing.findMany({
        where: { sessionId },
        include: {
          player1: { select: { id: true, name: true } },
          player2: { select: { id: true, name: true } },
        },
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

    // Calculate player stats
    interface PlayerStats {
      playerId: number;
      playerName: string;
      matchWins: number;
      matchLosses: number;
      matchDraws: number;
      gameWins: number;
      gameLosses: number;
      gameWinsInLosses: number;
      gameLossesInWins: number;
    }

    const playerStatsMap = new Map<number, PlayerStats>();

    pairings.forEach((pairing) => {
      const p1Id = pairing.player1.id;
      const p2Id = pairing.player2.id;
      const p1Wins = pairing.player1wins;
      const p2Wins = pairing.player2wins;

      // Initialize player1 if not exists
      if (!playerStatsMap.has(p1Id)) {
        playerStatsMap.set(p1Id, {
          playerId: p1Id,
          playerName: pairing.player1.name,
          matchWins: 0,
          matchLosses: 0,
          matchDraws: 0,
          gameWins: 0,
          gameLosses: 0,
          gameWinsInLosses: 0,
          gameLossesInWins: 0,
        });
      }

      // Initialize player2 if not exists
      if (!playerStatsMap.has(p2Id)) {
        playerStatsMap.set(p2Id, {
          playerId: p2Id,
          playerName: pairing.player2.name,
          matchWins: 0,
          matchLosses: 0,
          matchDraws: 0,
          gameWins: 0,
          gameLosses: 0,
          gameWinsInLosses: 0,
          gameLossesInWins: 0,
        });
      }

      const p1Stats = playerStatsMap.get(p1Id)!;
      const p2Stats = playerStatsMap.get(p2Id)!;

      // Update game wins/losses
      p1Stats.gameWins += p1Wins;
      p1Stats.gameLosses += p2Wins;
      p2Stats.gameWins += p2Wins;
      p2Stats.gameLosses += p1Wins;

      // Determine match result (best of 3: first to 2 wins)
      if (p1Wins === 2) {
        // Player 1 won the match
        p1Stats.matchWins++;
        p2Stats.matchLosses++;
        p1Stats.gameLossesInWins += p2Wins;
        p2Stats.gameWinsInLosses += p2Wins;
      } else if (p2Wins === 2) {
        // Player 2 won the match
        p2Stats.matchWins++;
        p1Stats.matchLosses++;
        p2Stats.gameLossesInWins += p1Wins;
        p1Stats.gameWinsInLosses += p1Wins;
      } else if (p1Wins === 1 && p2Wins === 1) {
        // Draw
        p1Stats.matchDraws++;
        p2Stats.matchDraws++;
      }
    });

    // Sort standings with tiebreakers (same as app logic)
    const playerStats = Array.from(playerStatsMap.values());
    const standings = playerStats.sort((a, b) => {
      // Primary: Most match wins
      if (a.matchWins !== b.matchWins) {
        return b.matchWins - a.matchWins;
      }

      // Tiebreaker 1: Most game wins in lost matches
      if (a.gameWinsInLosses !== b.gameWinsInLosses) {
        return b.gameWinsInLosses - a.gameWinsInLosses;
      }

      // Tiebreaker 2: Least game losses in won matches
      if (a.gameLossesInWins !== b.gameLossesInWins) {
        return a.gameLossesInWins - b.gameLossesInWins;
      }

      return 0;
    });

    // Build embed message
    const embed = new EmbedBuilder()
      .setTitle(`🏆 Final Standings - Session ${session.number} (${stripLanguageCode(session.set?.setCode)})`)
      .setColor('#ffd700')
      .setTimestamp();

    // Add top 6 placements
    const topPlayers = standings.slice(0, 6);
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'];

    topPlayers.forEach((standing, index) => {
      const matchRecord = `${standing.matchWins}-${standing.matchLosses}${standing.matchDraws > 0 ? `-${standing.matchDraws}` : ''}`;
      const gameRecord = `${standing.gameWins}-${standing.gameLosses}`;
      embed.addFields({
        name: `${medals[index]} ${standing.playerName}`,
        value: `Match Record: ${matchRecord} | Game Record: ${gameRecord}`,
        inline: false,
      });
    });

    // Add remaining players if any
    if (standings.length > 6) {
      const others = standings.slice(6)
        .map((s, i) => {
          const matchRecord = `${s.matchWins}-${s.matchLosses}${s.matchDraws > 0 ? `-${s.matchDraws}` : ''}`;
          return `${i + 7}. ${s.playerName} (${matchRecord})`;
        })
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
        include: { set: true },
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
      .setTitle(`🎉 Session ${session.number} (${stripLanguageCode(session.set?.setCode)}) - New Prog Started!`)
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
    // Get session info for set code
    const session = await prisma.session.findFirst({
      where: { number: sessionNumber },
      include: { set: true },
    });

    if (!session) {
      console.error('[Discord] Session not found');
      return false;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎉 New Session Started!`)
      .setDescription(`**Session ${sessionNumber} (${stripLanguageCode(session.set?.setCode)})** has begun!`)
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
    console.log(`[Discord] Notification sent to ${channel.name} channel`);
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
 * @param sessionNumber - The session NUMBER (not id) for which the new banlist was created
 */
export async function notifyBanlistChosen(sessionNumber: number): Promise<boolean> {
  console.log(`[Discord] Preparing banlist chosen notification for session number ${sessionNumber}`);

  try {
    // Get the session and banlist using session NUMBER
    const [session, banlist, previousBanlist] = await Promise.all([
      prisma.session.findFirst({
        where: { number: sessionNumber },
        include: { set: true },
      }),
      prisma.banlist.findFirst({
        where: { sessionId: sessionNumber },
      }),
      prisma.banlist.findFirst({
        where: { sessionId: sessionNumber - 1 },
      }),
    ]);

    if (!session) {
      console.error(`[Discord] Session not found for number ${sessionNumber}`);
      return false;
    }

    if (!banlist) {
      console.error(`[Discord] Banlist not found for session number ${sessionNumber}`);
      return false;
    }

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
      .setTitle(`📜 Banlist Updated - Session ${sessionNumber} (${stripLanguageCode(session.set?.setCode)})`)
      .setDescription(`**Set:** ${session.set?.setName || 'Unknown'}`)
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
 * sessionId parameter is the session.id (auto-incremented), not the session number
 */
export async function notifyBanlistSuggestions(sessionId: number): Promise<boolean> {
  console.log(`[Discord] Preparing banlist suggestions notifications for session ${sessionId}`);

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { set: true },
    });

    if (!session) {
      console.error('[Discord] Session not found');
      return false;
    }

    // Banlist uses session.number, not session.id
    const banlist = await prisma.banlist.findFirst({
      where: { sessionId: session.number },
    });

    if (!banlist) {
      console.error(`[Discord] Banlist not found for session number ${session.number}`);
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
        .setTitle(`💡 Banlist Suggestion - Session ${session.number} (${stripLanguageCode(session.set?.setCode)})`)
        .setDescription(`**Suggested by:** ${suggestion.player.name}`)
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
      .setDescription(`**Session ${session.number} (${stripLanguageCode(session.set?.setCode)})**`)
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
      .setDescription(`**Session ${session.number} (${stripLanguageCode(session.set?.setCode)})**`)
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
          ? `**Session ${session.number} (${stripLanguageCode(session.set?.setCode)})**`
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

/**
 * Send notification with decklist images when decklists become available (after standings are finalized)
 * @param sessionId - The session ID (auto-incremented)
 */
export async function notifyDecklists(sessionId: number): Promise<boolean> {
  console.log(`[Discord] Preparing decklists notification for session ${sessionId}`);

  try {
    // Get session info
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { set: true },
    });

    if (!session) {
      console.error('[Discord] Session not found');
      return false;
    }

    // Get all decklists with player info for this session
    const decklists = await prisma.decklist.findMany({
      where: { sessionId },
      include: {
        player: { select: { name: true } },
      },
      orderBy: { playerId: 'asc' },
    });

    if (decklists.length === 0) {
      console.warn('[Discord] No decklists found for this session');
      return false;
    }

    const channel = await getChannel('decklists');
    if (!channel) {
      console.error('[Discord] Failed to get decklists channel');
      return false;
    }

    // Get the base URL from environment
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      console.error('[Discord] NEXT_PUBLIC_API_URL not configured, cannot fetch decklist images');
      return false;
    }

    // Send each decklist as a separate message with image
    for (const decklist of decklists) {
      try {
        // Fetch the image from the web
        const imageUrl = `${baseUrl}/deck-images/${decklist.id}.png`;
        console.log(`[Discord] Fetching decklist image from ${imageUrl}`);

        const response = await fetch(imageUrl);
        if (!response.ok) {
          console.warn(`[Discord] Decklist image not found for decklist ${decklist.id} (HTTP ${response.status}), skipping`);
          continue;
        }

        // Convert response to buffer
        const imageBuffer = Buffer.from(await response.arrayBuffer());
        const attachment = new AttachmentBuilder(imageBuffer, { name: `decklist-${decklist.id}.png` });

        // Create embed with player and session info
        const embed = new EmbedBuilder()
          .setTitle(`${decklist.player.name}'s Decklist`)
          .setDescription(`**Session ${session.number} (${stripLanguageCode(session.set?.setCode)})**`)
          .setColor('#00ff00')
          .setImage(`attachment://decklist-${decklist.id}.png`)
          .setTimestamp();

        await channel.send({
          embeds: [embed],
          files: [attachment],
        });

        console.log(`[Discord] Sent decklist image for ${decklist.player.name}`);
      } catch (error) {
        console.error(`[Discord] Error sending decklist for player ${decklist.player.name}:`, error);
      }
    }

    console.log(`[Discord] Sent ${decklists.length} decklist notifications`);
    return true;
  } catch (error) {
    console.error('[Discord] Error preparing decklists notification:', error);
    return false;
  }
}
