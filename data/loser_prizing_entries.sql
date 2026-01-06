-- Loser Prizing Entries from loser_prizing_wheel_3_votes.csv
-- Auto-generated SQL file

-- Clear existing entries
DELETE FROM loser_prizing_entries;

-- Insert new entries (all with chance = 1 for equal probability)
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Take All Their Lighters', 'Steal 2 points from one player', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Take Everyone''s Lighter', 'Steal 1 points from every player', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Snatch Steal', 'Remove one card from a player''s collection. It is added to your collection', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Snatch Borrow', 'Remove one card from a player''s collection for the next session. It is added to your collection for the next session then removed afterwards and returned to the original owner. (The person being stolen from can play any extra copies they have however)', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Ancient Alchemy', 'Until the next session starts, the player can use the old crafting rules once to make a card', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Crazy Time', 'You earn double points next session', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Card Advance', '12 packs of the upcoming main set', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Prohibition', 'You are allowed one unopposed banlist change', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Return from the Different Dimension', 'You can play one banned card next session', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('I''m Going to the YCS', 'Choose a player: you can choose up to 5 of their cards from their most recent decklist to add to your decklist for next session. You must use all chosen cards in your next list but the original owner can still use them', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Shane Morley appears', 'You may add 3 copies of any single card from any purchasable set to your collection for next session. (this includes the set that is about to be opened but does NOT include promos)', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Cyber Jar', 'Gain 1 wallet point and re-spin the wheel', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Morphing Jar', 'Take 1 wallet point away from someone else then, re-spin the wheel', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Pawn Shop', 'You may sell a VP for 16 wallet points. Next time you come last, you can re-purchase your VP for 18 points. OR Respin', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Kristoff Friedrichnigiannopolous', '[Only avaiable after 3 losses] Choose 1 player. Take all their wallet points. They receive 1 VP for every 12 points you took.', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Remember the good ol'' days?', 'Count how many sessions it''s been since your last win. Gain wallet points equal to that number x2. If you haven''t won, then gain wallet points equal to the current session number.', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Vampire Baby', 'Steal 1 wallet point from everyone who beat you this session', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Dead Weight', 'Choose 1 player. You share your wallet points earned equally next session.', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Promo Paradise', 'Choose 1 promo card. Add a copy to your collection.', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Fire Sale!', 'All your purchases are half price until next session.', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('I Got the Session Number Wrong', 'Next session, you can use a decklist of your own from a previous session instead of making a new deck', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Vengeful Loser', 'Steal 1 wallet point from everyone you beat this session, if you did not beat anyone, respin', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Leftover Stock', 'Open a box of the current set', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Winflation', 'Next session, all of your wins are 2-0s', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Fiber Jar', 'Once next session, you can request a rematch immediately after a match of yours has finished. If your opponent refuses you gain 1 wallet point', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Having Fun is the Real Prize', 'Gain 1 VP, even if you gained 1 already from passdowns.', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Why Not Both?', 'Next session you can take the VP and your wallet points. Everyone else recieves wallet points as if last place took the VP', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('The Market is Going to go Up', 'You can invest up to 10 wallet points. If you come first or second next session, double your investment. Otherwise you lose the invested points', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('DB Passwords Leaked', 'Before starting next session you may view everyone''s decklists, you cannot tell other players about the information gained from this prize', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Mirror Match', 'For all matches next session, you can choose before the match begins if that match will be a mirror match. If so both players must play with the same deck. The deck used is chosen by you between both submitted decklists users have for the session.', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Sucks to Suck', 'Lose 2 wallet points', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('On Tilt', 'Lose 1 VP', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Nothing but a Bone', 'You win nothing! The rest of the players can vote to give you a bone. If the majority votes yes re-spin the wheel.', 1);
INSERT INTO loser_prizing_entries (name, description, chance) VALUES ('Selling to a Vendor after the Event', 'Every other player votes on a card for you to sell to the vendor. The card with the most votes is sold and you receieve 1 wallet point. You can buy it back for 4 wallet points', 1);
