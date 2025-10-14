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
