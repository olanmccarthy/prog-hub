export interface Banlist {
  id: number;
  sessionId: number;
  banned: string[];
  limited: string[];
  semilimited: string[];
  unlimited: string[];
}
