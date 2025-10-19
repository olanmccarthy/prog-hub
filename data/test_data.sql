-- =====================================
-- TEST DATA FOR PROG-HUB
-- =====================================
-- This script populates the database with dummy test data for 6 players
-- and sample tournament data including sessions, decklists, banlists, etc.

-- =====================================
-- PLAYERS (6 test players)
-- =====================================
INSERT INTO players (id, name, password, is_admin) VALUES
  (1, 'Alex Chen', 'password123', TRUE),
  (2, 'Jordan Rivera', 'password123', FALSE),
  (3, 'Sam Mitchell', 'password123', FALSE),
  (4, 'Taylor Brooks', 'password123', FALSE),
  (5, 'Casey Morgan', 'password123', FALSE),
  (6, 'Riley Parker', 'password123', FALSE);

-- =====================================
-- SESSIONS (2 tournament sessions)
-- =====================================
INSERT INTO sessions (id, number, date, first, second, third, fourth, fifth, sixth) VALUES
  (1, 1, '2025-01-15 10:00:00', 1, 3, 2, 5, 4, 6),
  (2, 2, '2025-02-15 10:00:00', null, null, null, null, null, null);

-- =====================================
-- BANLISTS (one per session, using prog.lflist.conf format)
-- =====================================
-- Session 1 Banlist (prog format)
INSERT INTO banlists (id, session_id, banned, limited, semilimited, unlimited) VALUES
  (1, 1,
    '["82301904", "17330916", "91020571", "21593977", "27415516", "78010363", "14878871", "8903700", "53797637", "26202165", "89185742", "34206604", "93369354", "52068432", "94977269", "50321796", "54719828", "46772449", "34086406", "87910978", "4031928", "60682203", "17375316", "53129443", "44763025", "23557835", "42703248", "79571449", "18144506", "19613556", "85602018", "46411259", "37520316", "83764718", "74191942", "55144522", "12580477", "54447022", "42829885", "70368879", "14087893", "14733538", "48130397", "27770341", "31222701", "81674782", "77565204", "34906152", "41482598", "70828912", "45986603", "57728570", "17484499", "3280747", "64697231", "61740673", "30241314", "93016201", "5851097", "41420027"]',
    '["72989439", "31178212", "92746535", "40318957", "20758643", "89463537", "72892473", "81439173", "33782437", "67169062", "35027493", "54974237", "83555666", "53582587", "84749824"]',
    '["29401950", "94192409"]',
    '[]'
  ),
-- Session 2 Banlist (same as session 1, with example of cards moved to unlimited)
-- In a real scenario, this would reflect changes from player voting
  (2, 2,
    '["82301904", "17330916", "91020571", "21593977", "27415516", "78010363", "14878871", "8903700", "53797637", "26202165", "89185742", "34206604", "93369354", "52068432", "94977269", "50321796", "54719828", "46772449", "34086406", "87910978", "4031928", "60682203", "17375316", "53129443", "44763025", "23557835", "42703248", "79571449", "18144506", "19613556", "85602018", "46411259", "37520316", "83764718", "74191942", "55144522", "12580477", "54447022", "42829885", "70368879", "14087893", "14733538", "48130397", "27770341", "31222701", "81674782", "77565204", "34906152", "41482598", "70828912", "45986603", "57728570", "17484499", "3280747", "64697231", "61740673", "30241314", "93016201", "5851097", "41420027"]',
    '["72989439", "31178212", "92746535", "40318957", "20758643", "89463537", "72892473", "81439173", "33782437", "67169062", "35027493", "54974237", "83555666", "53582587", "84749824"]',
    '["29401950", "94192409"]',
    '[]'
  );

-- =====================================
-- DECKLISTS (all 6 players for session 1)
-- =====================================
INSERT INTO decklists (id, player_id, session_id, maindeck, sidedeck, extradeck) VALUES
  (1, 1, 1,
    '["Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "Effect Veiler", "Effect Veiler", "Blue-Eyes White Dragon", "Blue-Eyes White Dragon", "Blue-Eyes White Dragon", "Blue-Eyes Alternative White Dragon", "Blue-Eyes Alternative White Dragon", "The White Stone of Ancients", "The White Stone of Ancients", "The White Stone of Ancients", "Sage with Eyes of Blue", "Sage with Eyes of Blue", "Sage with Eyes of Blue", "Dragon Spirit of White", "Dragon Spirit of White", "Bingo Machine, Go!!!", "Bingo Machine, Go!!!", "Bingo Machine, Go!!!", "Return of the Dragon Lords", "Return of the Dragon Lords", "Return of the Dragon Lords", "Trade-In", "Trade-In", "Trade-In", "The Melody of Awakening Dragon", "The Melody of Awakening Dragon", "The Melody of Awakening Dragon", "Dragon Shrine", "Dragon Shrine", "Silver\'s Cry", "Silver\'s Cry", "Twin Twisters", "Twin Twisters", "Solemn Judgment", "Solemn Strike", "Solemn Strike", "Solemn Warning"]',
    '["Nibiru, the Primal Being", "Nibiru, the Primal Being", "Nibiru, the Primal Being", "Droll & Lock Bird", "Droll & Lock Bird", "Droll & Lock Bird", "Dark Ruler No More", "Dark Ruler No More", "Twin Twisters", "Cosmic Cyclone", "Cosmic Cyclone", "Red Reboot", "Red Reboot", "Red Reboot", "Skill Drain"]',
    '["Blue-Eyes Spirit Dragon", "Blue-Eyes Spirit Dragon", "Azure-Eyes Silver Dragon", "Azure-Eyes Silver Dragon", "Blue-Eyes Twin Burst Dragon", "Neo Blue-Eyes Ultimate Dragon", "Linkuriboh", "Link Spider", "Hieratic Seal of the Heavenly Spheres", "Crystron Halqifibrax", "I:P Masquerena", "Apollousa, Bow of the Goddess", "Accesscode Talker", "Borreload Savage Dragon", "Number 38: Hope Harbinger Dragon Titanic Galaxy"]'
  ),
  (2, 2, 1,
    '["Maxx \\"C\\"", "Maxx \\"C\\"", "Maxx \\"C\\"", "Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "Eldlich the Golden Lord", "Eldlich the Golden Lord", "Eldlich the Golden Lord", "Huaquero of the Golden Land", "Huaquero of the Golden Land", "Eldlixir of Scarlet Sanguine", "Eldlixir of Scarlet Sanguine", "Eldlixir of Scarlet Sanguine", "Eldlixir of Black Awakening", "Eldlixir of Black Awakening", "Cursed Eldland", "Cursed Eldland", "Cursed Eldland", "Golden Land Forever!", "Golden Land Forever!", "Golden Land Forever!", "Conquistador of the Golden Land", "Conquistador of the Golden Land", "Guardian of the Golden Land", "Guardian of the Golden Land", "Solemn Judgment", "Solemn Strike", "Solemn Strike", "Solemn Strike", "Imperial Order", "Skill Drain", "Skill Drain", "Skill Drain", "Gozen Match", "Gozen Match", "Gozen Match", "Rivalry of Warlords", "Rivalry of Warlords", "Rivalry of Warlords"]',
    '["Nibiru, the Primal Being", "Nibiru, the Primal Being", "Nibiru, the Primal Being", "Droll & Lock Bird", "Droll & Lock Bird", "Ghost Ogre & Snow Rabbit", "Ghost Ogre & Snow Rabbit", "Cosmic Cyclone", "Cosmic Cyclone", "Cosmic Cyclone", "Red Reboot", "Red Reboot", "Red Reboot", "Evenly Matched", "Evenly Matched"]',
    '["Tornado Dragon", "Tornado Dragon", "Abyss Dweller", "Abyss Dweller", "Number 41: Bagooska the Terribly Tired Tapir", "Constellar Pleiades", "Knightmare Phoenix", "Knightmare Unicorn", "I:P Masquerena", "Apollousa, Bow of the Goddess", "Accesscode Talker", "Underworld Goddess of the Closed World", "Vampire Sucker", "Selene, Queen of the Master Magicians"]'
  ),
  (3, 3, 1,
    '["Elemental HERO Stratos", "Elemental HERO Stratos", "Elemental HERO Stratos", "Elemental HERO Shadow Mist", "Elemental HERO Shadow Mist", "Elemental HERO Shadow Mist", "Elemental HERO Honest Neos", "Elemental HERO Honest Neos", "Elemental HERO Solid Soldier", "Elemental HERO Solid Soldier", "Elemental HERO Solid Soldier", "Vision HERO Faris", "Vision HERO Faris", "Vision HERO Faris", "Vision HERO Increase", "Vision HERO Vyon", "Vision HERO Vyon", "Vision HERO Vyon", "Destiny HERO - Malicious", "Destiny HERO - Malicious", "Destiny HERO - Celestial", "Destiny HERO - Celestial", "Destiny HERO - Celestial", "Destiny HERO - Drawhand", "Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "E - Emergency Call", "E - Emergency Call", "E - Emergency Call", "A Hero Lives", "Mask Change", "Mask Change", "Polymerization", "Fusion Destiny", "Fusion Destiny", "Fusion Destiny", "Called by the Grave", "Called by the Grave", "Called by the Grave"]',
    '["Nibiru, the Primal Being", "Nibiru, the Primal Being", "Nibiru, the Primal Being", "D.D. Crow", "D.D. Crow", "Droll & Lock Bird", "Twin Twisters", "Twin Twisters", "Cosmic Cyclone", "Cosmic Cyclone", "Red Reboot", "Red Reboot", "Dark Ruler No More", "Dark Ruler No More", "Forbidden Droplet"]',
    '["Masked HERO Dark Law", "Masked HERO Dark Law", "Vision HERO Trinity", "Destiny HERO - Dangerous", "Xtra HERO Cross Crusader", "Xtra HERO Dread Decimator", "Xtra HERO Wonder Driver", "Elemental HERO Absolute Zero", "Elemental HERO Sunrise", "Linkuriboh", "Salamangreat Almiraj", "I:P Masquerena", "Apollousa, Bow of the Goddess", "Accesscode Talker", "Underworld Goddess of the Closed World"]'
  ),
  (4, 4, 1,
    '["Maxx \\"C\\"", "Maxx \\"C\\"", "Maxx \\"C\\"", "Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "Salamangreat Gazelle", "Salamangreat Gazelle", "Salamangreat Gazelle", "Salamangreat Spinny", "Salamangreat Spinny", "Salamangreat Spinny", "Salamangreat Foxy", "Salamangreat Foxy", "Salamangreat Foxy", "Salamangreat Fowl", "Salamangreat Fowl", "Flame Bufferlo", "Flame Bufferlo", "Flame Bufferlo", "Lady Debug", "Lady Debug", "Lady Debug", "Salamangreat Circle", "Salamangreat Circle", "Salamangreat Sanctuary", "Salamangreat Sanctuary", "Salamangreat Sanctuary", "Will of the Salamangreat", "Will of the Salamangreat", "Cynet Mining", "Cynet Mining", "Cynet Mining", "Called by the Grave", "Called by the Grave", "Salamangreat Rage", "Salamangreat Rage", "Salamangreat Roar", "Salamangreat Roar", "Salamangreat Roar"]',
    '["Nibiru, the Primal Being", "Nibiru, the Primal Being", "Nibiru, the Primal Being", "Ghost Ogre & Snow Rabbit", "Ghost Ogre & Snow Rabbit", "Ghost Ogre & Snow Rabbit", "Droll & Lock Bird", "Droll & Lock Bird", "Twin Twisters", "Twin Twisters", "Cosmic Cyclone", "Red Reboot", "Red Reboot", "Evenly Matched", "Evenly Matched"]',
    '["Salamangreat Balelynx", "Salamangreat Balelynx", "Salamangreat Balelynx", "Salamangreat Sunlight Wolf", "Salamangreat Sunlight Wolf", "Salamangreat Heatleo", "Salamangreat Heatleo", "Salamangreat Heatleo", "Salamangreat Miragestallio", "Update Jammer", "Transcode Talker", "Splash Mage", "I:P Masquerena", "Apollousa, Bow of the Goddess", "Accesscode Talker"]'
  ),
  (5, 5, 1,
    '["Maxx \\"C\\"", "Maxx \\"C\\"", "Maxx \\"C\\"", "Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "PSY-Frame Driver", "PSY-Framegear Gamma", "PSY-Framegear Gamma", "PSY-Framegear Gamma", "Speedroid Taketomborg", "Speedroid Taketomborg", "Speedroid Taketomborg", "Speedroid Terrortop", "Speedroid Terrortop", "Speedroid Terrortop", "Speedroid CarTurbo", "Cyber Dragon", "Cyber Dragon", "Cyber Dragon", "Cyber Dragon Core", "Cyber Dragon Core", "Cyber Dragon Core", "Cyber Dragon Herz", "Cyber Dragon Herz", "Cyber Dragon Herz", "Cyber Dragon Nachster", "Cyber Dragon Nachster", "Cyber Dragon Nachster", "Machine Duplication", "Machine Duplication", "Machine Duplication", "Cyber Emergency", "Cyber Emergency", "Cyber Emergency", "Cyber Repair Plant", "Cyber Revsystem", "Overload Fusion", "Overload Fusion", "Power Bond"]',
    '["Nibiru, the Primal Being", "Nibiru, the Primal Being", "Nibiru, the Primal Being", "Dinowrestler Pankratops", "Dinowrestler Pankratops", "Dinowrestler Pankratops", "Twin Twisters", "Twin Twisters", "Cosmic Cyclone", "Cosmic Cyclone", "System Down", "System Down", "System Down", "Evenly Matched", "Evenly Matched"]',
    '["Cyber Dragon Nova", "Cyber Dragon Nova", "Cyber Dragon Infinity", "Cyber Dragon Infinity", "Chimeratech Fortress Dragon", "Chimeratech Fortress Dragon", "Chimeratech Megafleet Dragon", "Chimeratech Megafleet Dragon", "Cyber Dragon Sieger", "Cyber Dragon Sieger", "Linkuriboh", "Salamangreat Almiraj", "Platinum Gadget", "I:P Masquerena", "Apollousa, Bow of the Goddess"]'
  ),
  (6, 6, 1,
    '["Maxx \\"C\\"", "Maxx \\"C\\"", "Maxx \\"C\\"", "Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "Ash Blossom & Joyous Spring", "Sky Striker Ace - Raye", "Sky Striker Ace - Raye", "Sky Striker Ace - Raye", "Sky Striker Ace - Roze", "Sky Striker Ace - Roze", "Sky Striker Maneuver - Afterburners!", "Sky Striker Maneuver - Afterburners!", "Sky Striker Maneuver - Jamming Waves!", "Sky Striker Maneuver - Jamming Waves!", "Sky Striker Mecha - Hornet Drones", "Sky Striker Mecha - Hornet Drones", "Sky Striker Mecha - Hornet Drones", "Sky Striker Mecha - Shark Cannon", "Sky Striker Mecha - Shark Cannon", "Sky Striker Mecha - Widow Anchor", "Sky Striker Mecha - Widow Anchor", "Sky Striker Mecha - Widow Anchor", "Sky Striker Mobilize - Engage!", "Sky Striker Mobilize - Engage!", "Sky Striker Mobilize - Engage!", "Sky Striker Airspace - Area Zero", "Sky Striker Airspace - Area Zero", "Upstart Goblin", "Upstart Goblin", "Upstart Goblin", "Terraforming", "Reinforcement of the Army", "Called by the Grave", "Called by the Grave", "Called by the Grave", "Infinite Impermanence", "Infinite Impermanence", "Infinite Impermanence", "Solemn Judgment"]',
    '["Nibiru, the Primal Being", "Nibiru, the Primal Being", "Nibiru, the Primal Being", "Droll & Lock Bird", "Droll & Lock Bird", "Droll & Lock Bird", "Ghost Belle & Haunted Mansion", "Ghost Belle & Haunted Mansion", "Twin Twisters", "Twin Twisters", "Cosmic Cyclone", "Cosmic Cyclone", "Red Reboot", "Evenly Matched", "Evenly Matched"]',
    '["Sky Striker Ace - Kagari", "Sky Striker Ace - Kagari", "Sky Striker Ace - Kagari", "Sky Striker Ace - Shizuku", "Sky Striker Ace - Shizuku", "Sky Striker Ace - Shizuku", "Sky Striker Ace - Hayate", "Sky Striker Ace - Hayate", "Sky Striker Ace - Kaina", "Sky Striker Ace - Zeke", "Linkuriboh", "Salamangreat Almiraj", "I:P Masquerena", "Apollousa, Bow of the Goddess", "Accesscode Talker"]'
  );

-- =====================================
-- BANLIST SUGGESTIONS (some players suggest changes for session 2)
-- =====================================
INSERT INTO banlist_suggestions (id, banlist_id, player_id, banned, limited, semilimited, unlimited, chosen, moderator_id) VALUES
  (1, 1, 1,
    '["Monster Reborn"]',
    '[]',
    '[]',
    '[]',
    FALSE, NULL
  ),
  (2, 1, 3,
    '["Dark Hole"]',
    '["Mystical Space Typhoon"]',
    '[]',
    '[]',
    TRUE, 1
  ),
  (3, 1, 5,
    '["Skill Drain"]',
    '[]',
    '[]',
    '[]',
    FALSE, NULL
  );

-- =====================================
-- BANLIST SUGGESTION VOTES (players vote on suggestions)
-- =====================================
INSERT INTO banlist_suggestion_votes (id, player_id, suggestion_id) VALUES
  (1, 1, 1),
  (2, 2, 1),
  (3, 3, 2),
  (4, 4, 2),
  (5, 5, 3),
  (6, 6, 2),
  (7, 1, 2),
  (8, 2, 2);

-- =====================================
-- PAIRINGS (session 1, 5 rounds - round robin format)
-- =====================================
-- Round 1
INSERT INTO pairings (id, session_id, round, player1_id, player2_id, player1wins, player2wins) VALUES
  (1, 1, 1, 1, 2, 2, 1),
  (2, 1, 1, 3, 4, 2, 0),
  (3, 1, 1, 5, 6, 1, 2);

-- Round 2
INSERT INTO pairings (id, session_id, round, player1_id, player2_id, player1wins, player2wins) VALUES
  (4, 1, 2, 1, 3, 2, 1),
  (5, 1, 2, 2, 5, 0, 2),
  (6, 1, 2, 4, 6, 2, 1);

-- Round 3
INSERT INTO pairings (id, session_id, round, player1_id, player2_id, player1wins, player2wins) VALUES
  (7, 1, 3, 1, 4, 2, 0),
  (8, 1, 3, 2, 6, 1, 2),
  (9, 1, 3, 3, 5, 2, 1);

-- Round 4
INSERT INTO pairings (id, session_id, round, player1_id, player2_id, player1wins, player2wins) VALUES
  (10, 1, 4, 1, 5, 2, 0),
  (11, 1, 4, 2, 4, 1, 2),
  (12, 1, 4, 3, 6, 2, 1);

-- Round 5
INSERT INTO pairings (id, session_id, round, player1_id, player2_id, player1wins, player2wins) VALUES
  (13, 1, 5, 1, 6, 2, 0),
  (14, 1, 5, 2, 3, 1, 2),
  (15, 1, 5, 4, 5, 1, 2);

-- =====================================
-- PAIRINGS (session 2, 5 rounds - round robin format, no results yet)
-- =====================================
-- Round 1 (no results - all wins set to 0)
INSERT INTO pairings (id, session_id, round, player1_id, player2_id, player1wins, player2wins) VALUES
  (16, 2, 1, 3, 4, 0, 0),
  (17, 2, 1, 1, 5, 0, 0),
  (18, 2, 1, 6, 2, 0, 0);

-- Round 2 (no results - all wins set to 0)
INSERT INTO pairings (id, session_id, round, player1_id, player2_id, player1wins, player2wins) VALUES
  (19, 2, 2, 3, 1, 0, 0),
  (20, 2, 2, 2, 5, 0, 0),
  (21, 2, 2, 4, 6, 0, 0);

-- Round 3 (no results - all wins set to 0)
INSERT INTO pairings (id, session_id, round, player1_id, player2_id, player1wins, player2wins) VALUES
  (22, 2, 3, 3, 2, 0, 0),
  (23, 2, 3, 1, 4, 0, 0),
  (24, 2, 3, 5, 6, 0, 0);

-- Round 4 (no results - all wins set to 0)
INSERT INTO pairings (id, session_id, round, player1_id, player2_id, player1wins, player2wins) VALUES
  (25, 2, 4, 3, 5, 0, 0),
  (26, 2, 4, 1, 6, 0, 0),
  (27, 2, 4, 2, 4, 0, 0);

-- Round 5 (no results - all wins set to 0)
INSERT INTO pairings (id, session_id, round, player1_id, player2_id, player1wins, player2wins) VALUES
  (28, 2, 5, 3, 6, 0, 0),
  (29, 2, 5, 1, 2, 0, 0),
  (30, 2, 5, 4, 5, 0, 0);

-- =====================================
-- VICTORY POINTS (awarded to players in session 1)
-- =====================================
-- Alex Chen gets 1 victory point for winning session 1 (came in first place)
INSERT INTO victory_points (id, player_id, session_id) VALUES
  (1, 1, 1);

-- =====================================
-- END OF TEST DATA
-- =====================================
