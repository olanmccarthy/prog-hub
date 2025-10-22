-- Wallet Point Breakdowns
-- Three different point distribution schemes for awarding wallet points based on placement

INSERT INTO wallet_point_breakdowns (name, first, second, third, fourth, fifth, sixth, active) VALUES
('Standard', 8, 6, 5, 4, 3, 1, true),    -- Standard breakdown (active by default)
('Medium Reward', 12, 10, 8, 6, 4, 1, false), -- Medium reward breakdown
('High Reward', 16, 13, 10, 7, 4, 1, false); -- High reward breakdown
