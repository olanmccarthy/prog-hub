export interface Decklist {
  id: number;
  playerId: number;
  sessionId: number;
  maindeck: string[];
  sidedeck: string[];
  extradeck: string[];
}
