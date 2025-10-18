import { EmbedBuilder } from 'discord.js';
import { getNotificationChannel, isBotReady } from './bot';
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
    // Fetch pairings with player names
    const pairings = await prisma.pairing.findMany({
      where: {
        sessionId,
        round,
      },
      include: {
        player1: true,
        player2: true,
      },
      orderBy: { id: 'asc' },
    });

    if (pairings.length === 0) {
      console.warn('[Discord] No pairings found for this round');
      return false;
    }

    // Fetch session info
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

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

    return await sendNotification(embed);
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
    // Fetch session info
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      console.error('[Discord] Session not found');
      return false;
    }

    // Fetch victory points with player names
    const victoryPoints = await prisma.victoryPoint.findMany({
      where: { sessionId },
      include: { player: true },
    });

    // Get all pairings to calculate match wins and game wins
    const pairings = await prisma.pairing.findMany({
      where: { sessionId },
      include: {
        player1: true,
        player2: true,
      },
    });

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

    return await sendNotification(embed);
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
    // Fetch session info
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      console.error('[Discord] Session not found');
      return false;
    }

    // Fetch all pairings with player names
    const pairings = await prisma.pairing.findMany({
      where: { sessionId },
      include: {
        player1: true,
        player2: true,
      },
      orderBy: [
        { round: 'asc' },
        { id: 'asc' },
      ],
    });

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

    return await sendNotification(embed);
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

    return await sendNotification(embed);
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
