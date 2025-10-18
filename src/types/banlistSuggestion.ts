export interface BanlistSuggestion {
  id: number;
  banlistId: number;
  playerId: number;
  banned: number[];
  limited: number[];
  semilimited: number[];
  unlimited: number[];
  chosen: boolean;
  moderatorId?: number;
}
