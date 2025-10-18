export interface Banlist {
  id: number;
  sessionId: number;
  banned: number[];
  limited: number[];
  semilimited: number[];
  unlimited: number[];
}
