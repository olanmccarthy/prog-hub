-- Event Wheel Entries from prog_event_wheel_3_votes.csv
-- Auto-generated SQL file

-- Clear existing entries
DELETE FROM event_wheel_entries;

-- Insert new entries
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('3v3 Prog', 'The prog is now played like a 3v3 YCS. Players will split up into seperate channels so they can discuss. There will only be 1 round. Points are evenly split amongst the teams', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('2v2 Prog', 'The prog is now played like a 2v2 YCS. Players will split up into seperate channels so they can discuss. Rounds will be played until every team has played the others. Points are evenly split amongst the teams', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Crazy Time', 'Points earned for this prog are doubled (this does not include victory points)', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Recession', 'Points earned for this prog are halved, rounded up. (this does not include victory points)', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Double the Glory', 'This prog is worth 2 victory points instead of one. All other victory point rules stay the same.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Bad Ruling: Priority', 'If ignition effect priority is in effect: it is no longer in effect for this prog.
If ignition effect priority is not in effect: it is in effect for this prog.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Bad Ruling: Field Spell', 'If single field spell rule is in effect: it is no longer in effect for this prog.
If single field spell is not in effect: it is in effect for this prog.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Guest Moderator: Tom', 'Tom Keenan is the moderator for this session', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Guest Moderator: Heff', 'Dr. Heff is the moderator for this session', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('True Democracy', 'There is no moderator for this session, the banlist with the most votes wins. In the event of a tie roll a dice to determine which banlist is chosen', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Bad Ruling: Draw First', 'If the draw first rule is in effect: it is no longer in effect for this prog.
If it is not in effect: nothing happens', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('RNG Moderation', 'There is no moderator for this session, the banlist is chosen with a dice roll instead', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Sudden Death', 'Each match is now a best of 1', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Bounty Hunter', 'If you beat the person at the top of the VP Leaderboard this session, +1 wallet point', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('No Takebacksies', 'Side decks cannot be used this session. It''s still a Best of 3.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Viva la Revolucion', 'This session, the loser is the moderator.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Odds, not Evens', '1st, 3rd and 5th place receive +1 wallet point this session.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Evens, not Odds', '2nd, 4th and 6th place receive +1 wallet point this session.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Keep your Secrets', 'Decklists from this session are not public. Reveal them in 2 sessions.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('What a day to be a Loser', 'Last place spins the Loser Prizing wheel twice.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('The Rich get Poorer', 'The winner of this session opens 12 packs of the next set instead of 24.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('The Rich get Richer', 'The winner of this session opens 36 packs of the next set instead of 24.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Dyslexia Awareness Day', 'Victory Points are now called Pictory Voints. Wallet Points become Pallet Woints. Keep it this way until this is rolled again.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Fucked on Tiebreakers', 'Every win becomes a 2-0. Every loss becomes an 0-2.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Bad Ruling: Early Triggers', 'If early triggers are in effect: it is no longer in effect for this prog.
If early triggers are not in effect: it is in effect for this prog.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('A Cruel Dictator', 'This session, the winner is the moderator.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('And You''ll Like It', 'This session, it is mandatory to take the VP.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Stay Broke', 'This session, 1st place cannot take the VP.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Topsy Turvy', 'This session, the VP passes up instead of down. The loser is first given the choice of WP or VP. All other points remain the same.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Every win counts', 'Each player receives +1 additional point for each win this session.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Show yourself', 'Players must play with their cameras on this session.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('The Grand Reveal', 'Decklists for this session are public. Post them before we begin.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Sales Ban', 'No product can be purchased until the wheel is spun again', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Prisoners Dilemma', 'Anybody on the same deck as another player has their points halved', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Phoning It In', 'All testing is forbidden until the wheel is spun again', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('52 card pickup', 'Count all players wallet point total. Everyone''s wallet points are reset to 0. Reallocate all points randomly.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Sir Those Are Not Konami Approved Sleeves', 'Everyone must play with default DB sleeves on. Failure to do so will result in a game loss', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Going once, going twice', 'Before this session starts, hold an auction. Any player with VP can sell a point in a public auction, using Wallet Points as currency. Each sale ends after 2 minutes, highest bid wins. Sellers set the bottom price', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('DUELISTS THAT''S TIME ON THE ROUND', 'Each match this prog has a 45 minute timer. Latest time rules apply for end of match procedures', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Communism', 'This session, all wallet points are shared equally.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Tactical Voting', 'Voting is done player by player publically starting from first place to last.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('"No Sooner Than"', 'There is no banlist this session.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Emergency Banlist', 'All limited cards are banned for this session. You have 15 minutes to submit a legal decklist. After the match play has finished, cards affected by this rule will revert back to being limited.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Called by the Grave', 'This session, players cannot look at their graveyard. If they open their graveyard once, they will receive a warning. If they open it a 2nd time, game loss. DB logs track this for verification', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('No fidgeting', 'Hand shuffling is banned this session. 1st time warning, 2nd game loss, 3rd match loss', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Ratatouille', 'The winner of this session must nominate someone from outside the Prog to play on their behalf next session. They''re allowed to coach.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Wager Match', 'Players may choose to bet dollarydoos on their matches this session. Both players must agree to an amount (max: 8). The winner of the match takes dollarydoos from the opponent equal to the agreed amount.', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Gambling Gambling', 'Each player secretly chooses who they think will win the prog and how much they are willing to bet on it (max:8) Each player will have odds calculated on winning chance based on previous placements. Once standings are finalised players will earn points based on the odds. Players are allowed to bet on themselves', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Russian Roulette', '[TINY CHANCE OF HAPPENING] Spin the wheel 3 additional times. Apply all 3 modifiers for this session, then every player gains +2 wallet points', 5);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Infinite Cards', 'Session is played with the Infinite Cards condition applied', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('Multiply', 'Players may exceed the x3 limit of copies of an individual card this session (this does not bypass the banlist). 15 mins to adjust decklist', 1);
INSERT INTO event_wheel_entries (name, description, chance) VALUES ('NO FUSION/SYNCHRO/XYZ/PEND/LINK', 'You cannot use monsters from the extra deck this session', 1);
