/**
 * Test script for deck image generation
 * Run with: npx tsx src/lib/deckImage/test.ts
 */

import { generateDeckImage } from './index';
import type { DeckForImage, BanlistForImage } from './types';
import fs from 'fs/promises';
import path from 'path';

async function testDeckImageGeneration() {
  console.log('Testing deck image generation...\n');

  // Sample deck (Blue-Eyes themed deck)
  const testDeck: DeckForImage = {
    maindeck: [
      89631139, 89631139, 89631139, // Blue-Eyes White Dragon (3x)
      38517737, 38517737, 38517737, // Blue-Eyes Alternative White Dragon (3x)
      23995346, 23995346, 23995346, // White Stone of Ancients (3x)
      32809211, // The Melody of Awakening Dragon
      5318639, // The White Stone of Legend
      84859092, // Trade-In
      84859092, // Trade-In
      84859092, // Trade-In
      73628505, // Terraforming
      22702055, // Revival of the Blue-Eyes
      24094653, // Mausoleum of White
      99177923, // Dragon Shrine
      99177923, // Dragon Shrine
      14532163, // Lightning Storm
      14558127, // Dark Hole
      12580477, // Raigeki
      19613556, // Heavy Storm Duster
      1845204, // Instant Fusion
      52340444, // Sky Striker Mobilize - Engage!
      63789924, // Monster Reborn
      73599290, // Soul Charge
      93946239, // Polymerization
      66457407, // Infinite Impermanence
      66457407, // Infinite Impermanence
      66457407, // Infinite Impermanence
      97268402, // Red Reboot
      84749824, // Solemn Judgment
      83764718, // Monster Gate
      70368879, // Upstart Goblin
      70368879, // Upstart Goblin
      70368879, // Upstart Goblin
      44095762, // Twin Twisters
      44095762, // Twin Twisters
      46060017, // Zoodiac Barrage
      48130397, // Super Polymerization
      91623717, // Chain Strike
      9411399, // Destiny HERO - Malicious
      9411399, // Destiny HERO - Malicious
      15341821, // Dandylion
    ],
    extradeck: [
      59822133, // Blue-Eyes Spirit Dragon
      2158562, // Azure-Eyes Silver Dragon
      40908371, // Blue-Eyes Twin Burst Dragon
      23995346, // Stardust Spark Dragon
      17412721, // Elder Entity N'tss
      58699500, // Odd-Eyes Meteorburst Dragon
      85289965, // Blue-Eyes Ultimate Dragon
      44508094, // Starving Venom Fusion Dragon
      81823360, // Majestic Star Dragon
      73422907, // Number 38: Hope Harbinger Dragon Titanic Galaxy
      11110587, // Crystal Wing Synchro Dragon
      49905576, // Phantasmal Lord Ultimitl Bishbalkin
      63288573, // Decode Talker
      76375976, // Akashic Magician
      28776350, // Divine Arsenal AA-ZEUS - Sky Thunder
    ],
    sidedeck: [
      14558127, // Dark Hole
      18144506, // Harpie's Feather Duster
      83764718, // Monster Gate
      55144522, // Pot of Greed
      17375316, // Confiscation
      18144506, // Harpie's Feather Duster
      23434538, // Maxx "C"
      23434538, // Maxx "C"
      23434538, // Maxx "C"
      15341821, // Dandylion
      9411399, // Destiny HERO - Malicious
      28566710, // Last Turn
      58921041, // Left Arm of the Forbidden One
      7902349, // Left Leg of the Forbidden One
      8124921, // Right Arm of the Forbidden One
    ],
  };

  // Sample banlist
  const testBanlist: BanlistForImage = {
    banned: [
      15341821, // Dandylion
      9411399, // Destiny HERO - Malicious
      55144522, // Pot of Greed
      18144506, // Harpie's Feather Duster
      17375316, // Confiscation
      28566710, // Last Turn
      58921041, // Left Arm of the Forbidden One
      7902349, // Left Leg of the Forbidden One
      8124921, // Right Arm of the Forbidden One
    ],
    limited: [
      63789924, // Monster Reborn
      73599290, // Soul Charge
      84749824, // Solemn Judgment
      14558127, // Dark Hole
      12580477, // Raigeki
    ],
    semilimited: [
      52340444, // Sky Striker Mobilize - Engage!
      46060017, // Zoodiac Barrage
    ],
  };

  try {
    console.log('Generating deck image...');
    const startTime = Date.now();

    const imageBuffer = await generateDeckImage(testDeck, testBanlist);

    const endTime = Date.now();
    console.log(`✓ Image generated in ${endTime - startTime}ms`);
    console.log(`✓ Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

    // Save to file
    const outputPath = path.join(__dirname, 'test-deck-output.png');
    await fs.writeFile(outputPath, imageBuffer);
    console.log(`✓ Image saved to: ${outputPath}`);

    console.log('\n✅ Test completed successfully!');
    console.log('\nBanlist indicators:');
    console.log('  - Red border: Banned cards');
    console.log('  - Yellow border: Limited cards');
    console.log('  - Orange border: Semi-limited cards');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDeckImageGeneration();
