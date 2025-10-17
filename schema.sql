-- =====================================
-- PLAYERS
-- =====================================
CREATE TABLE players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE
);

-- =====================================
-- SESSIONS
-- =====================================
CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  number INT NOT NULL,
  date DATETIME NOT NULL,
  first INT NULL,
  second INT NULL,
  third INT NULL,
  fourth INT NULL,
  fifth INT NULL,
  sixth INT NULL,
  CONSTRAINT fk_sessions_first FOREIGN KEY (first) REFERENCES players(id),
  CONSTRAINT fk_sessions_second FOREIGN KEY (second) REFERENCES players(id),
  CONSTRAINT fk_sessions_third FOREIGN KEY (third) REFERENCES players(id),
  CONSTRAINT fk_sessions_fourth FOREIGN KEY (fourth) REFERENCES players(id),
  CONSTRAINT fk_sessions_fifth FOREIGN KEY (fifth) REFERENCES players(id),
  CONSTRAINT fk_sessions_sixth FOREIGN KEY (sixth) REFERENCES players(id)
);

-- =====================================
-- DECKLISTS
-- =====================================
CREATE TABLE decklists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  session_id INT NOT NULL,
  maindeck JSON NOT NULL,
  sidedeck JSON NOT NULL,
  extradeck JSON NOT NULL,
  submittedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Example: index the first card for fast searches
  maindeck_first VARCHAR(255)
    GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(maindeck, '$[0]')))
    STORED,
  CONSTRAINT fk_decklists_player FOREIGN KEY (player_id) REFERENCES players(id),
  CONSTRAINT fk_decklists_session FOREIGN KEY (session_id) REFERENCES sessions(id),
  UNIQUE KEY unique_player_session (player_id, session_id),
  INDEX idx_decklists_player (player_id),
  INDEX idx_decklists_session (session_id),
  INDEX idx_decklists_maindeck_first (maindeck_first)
);

-- =====================================
-- BANLISTS
-- =====================================
CREATE TABLE banlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  banned JSON NOT NULL,
  limited JSON NOT NULL,
  semilimited JSON NOT NULL,
  unlimited JSON NOT NULL,
  -- Enable fast lookup of a common card ban
  banned_first VARCHAR(255)
    GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(banned, '$[0]')))
    STORED,
  CONSTRAINT fk_banlists_session FOREIGN KEY (session_id) REFERENCES sessions(id),
  INDEX idx_banlists_session (session_id),
  INDEX idx_banlists_banned_first (banned_first)
);

-- =====================================
-- BANLIST SUGGESTIONS
-- =====================================
CREATE TABLE banlist_suggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  banlist_id INT NOT NULL,
  player_id INT NOT NULL,
  banned JSON NOT NULL,
  limited JSON NOT NULL,
  semilimited JSON NOT NULL,
  unlimited JSON NOT NULL,
  chosen BOOLEAN DEFAULT FALSE,
  moderator_id INT NULL,
  -- Example: index first banned card in suggestion
  banned_first VARCHAR(255)
    GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(banned, '$[0]')))
    STORED,
  CONSTRAINT fk_suggestions_banlist FOREIGN KEY (banlist_id) REFERENCES banlists(id),
  CONSTRAINT fk_suggestions_player FOREIGN KEY (player_id) REFERENCES players(id),
  CONSTRAINT fk_suggestions_moderator FOREIGN KEY (moderator_id) REFERENCES players(id),
  INDEX idx_suggestions_banlist (banlist_id),
  INDEX idx_suggestions_player (player_id),
  INDEX idx_suggestions_banned_first (banned_first)
);

-- =====================================
-- BANLIST SUGGESTION VOTES
-- =====================================
CREATE TABLE banlist_suggestion_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  suggestion_id INT NOT NULL,
  CONSTRAINT fk_votes_player FOREIGN KEY (player_id) REFERENCES players(id),
  CONSTRAINT fk_votes_suggestion FOREIGN KEY (suggestion_id) REFERENCES banlist_suggestions(id),
  INDEX idx_votes_player (player_id),
  INDEX idx_votes_suggestion (suggestion_id)
);

-- =====================================
-- PAIRINGS
-- =====================================
CREATE TABLE pairings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  round INT NOT NULL,
  player1_id INT NOT NULL,
  player2_id INT NOT NULL,
  player1wins INT NOT NULL,
  player2wins INT NOT NULL,
  CONSTRAINT fk_pairings_session FOREIGN KEY (session_id) REFERENCES sessions(id),
  CONSTRAINT fk_pairings_player1 FOREIGN KEY (player1_id) REFERENCES players(id),
  CONSTRAINT fk_pairings_player2 FOREIGN KEY (player2_id) REFERENCES players(id),
  INDEX idx_pairings_session_round (session_id, round),
  INDEX idx_pairings_session (session_id),
  INDEX idx_pairings_round (round)
);

-- =====================================
-- VICTORY POINTS
-- =====================================
CREATE TABLE victory_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  session_id INT NOT NULL,
  CONSTRAINT fk_victory_points_player FOREIGN KEY (player_id) REFERENCES players(id),
  CONSTRAINT fk_victory_points_session FOREIGN KEY (session_id) REFERENCES sessions(id),
  INDEX idx_victory_points_player (player_id),
  INDEX idx_victory_points_session (session_id)
);
