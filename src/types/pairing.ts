export interface Pairing {
  id: number;
  sessionId: number;
  round: number;
  player1Id: number;
  player2Id: number;
  player1wins: number;
  player2wins: number;
}
