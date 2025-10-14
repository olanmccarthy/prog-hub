import { Entity, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Player } from "./Player";
import { BanlistSuggestion } from "./BanlistSuggestion";

@Entity({ name: "banlist_suggestion_votes" })
export class BanlistSuggestionVote {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Player, (p) => p.votes)
  player!: Player;

  @ManyToOne(() => BanlistSuggestion, (s) => s.votes)
  suggestion!: BanlistSuggestion;
}
