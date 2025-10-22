-- Test data for development
-- This file is automatically loaded on database initialization

-- Players (static test data)
INSERT INTO players (name, password, is_admin) VALUES
('olan', '123', 1),
('coog', '123', 0),
('costello', '123', 0),
('jason', '123', 0),
('kris', '123', 0),
('vlad', '123', 0);

-- Create wallets for all players (initialized with 0 amount)
INSERT INTO wallets (player_id, amount)
SELECT id, 0 FROM players;

-- Default empty banlist for session 1
-- Note: session_id stores the session number (not the auto-incremented id)
INSERT INTO banlists (session_id, banned, limited, semilimited, unlimited) VALUES (1, '[]', '[]', '[]', '[]');
