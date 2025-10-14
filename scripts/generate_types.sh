#!/bin/bash
# ---------------------------------------------------------
# Generate plain TypeScript types (DTOs) for the project.
# These correspond to your entities but are JSON-safe
# (flattened, no circular relations).
# ---------------------------------------------------------

set -e

# Ensure we run from project root
cd "$(dirname "$0")/.." || exit 1

TYPES_DIR="src/types"

# Create directory if missing
mkdir -p "$TYPES_DIR"

echo "🧩 Generating TypeScript types in $TYPES_DIR ..."

# Player
cat > "$TYPES_DIR/player.ts" << 'EOF'
export interface Player {
  id: number;
  name: string;
}
EOF

# Session
cat > "$TYPES_DIR/session.ts" << 'EOF'
export interface Session {
  id: number;
  number: number;
  date: string; // ISO string
  firstId?: number;
  secondId?: number;
  thirdId?: number;
  fourthId?: number;
  fifthId?: number;
  sixthId?: number;
}
EOF

# Decklist
cat > "$TYPES_DIR/decklist.ts" << 'EOF'
export interface Decklist {
  id: number;
  playerId: number;
  sessionId: number;
  maindeck: string[];
  sidedeck: string[];
  extradeck: string[];
}
EOF

# Banlist
cat > "$TYPES_DIR/banlist.ts" << 'EOF'
export interface Banlist {
  id: number;
  sessionId: number;
  banned: string[];
  limited: string[];
  semilimited: string[];
  unlimited: string[];
}
EOF

# BanlistSuggestion
cat > "$TYPES_DIR/banlistSuggestion.ts" << 'EOF'
export interface BanlistSuggestion {
  id: number;
  banlistId: number;
  playerId: number;
  banned: string[];
  limited: string[];
  semilimited: string[];
  unlimited: string[];
  chosen: boolean;
  moderatorId?: number;
}
EOF

# BanlistSuggestionVote
cat > "$TYPES_DIR/banlistSuggestionVote.ts" << 'EOF'
export interface BanlistSuggestionVote {
  id: number;
  playerId: number;
  suggestionId: number;
}
EOF

# Pairing
cat > "$TYPES_DIR/pairing.ts" << 'EOF'
export interface Pairing {
  id: number;
  sessionId: number;
  round: number;
  player1Id: number;
  player2Id: number;
  player1wins: number;
  player2wins: number;
}
EOF

# VictoryPoint
cat > "$TYPES_DIR/victoryPoint.ts" << 'EOF'
export interface VictoryPoint {
  id: number;
  playerId: number;
  sessionId: number;
}
EOF

# Index
cat > "$TYPES_DIR/index.ts" << 'EOF'
export * from './player';
export * from './session';
export * from './decklist';
export * from './banlist';
export * from './banlistSuggestion';
export * from './banlistSuggestionVote';
export * from './pairing';
export * from './victoryPoint';
EOF

echo "✅ TypeScript types generated successfully!"

