import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import type { Player } from "./Player";
import type { BanlistSuggestion } from "./BanlistSuggestion";

@Entity({ name: "banlist_suggestion_votes" })
export class BanlistSuggestionVote {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne("Player", "votes")
  @JoinColumn({ name: "player_id" })
  player!: Player;

  @ManyToOne("BanlistSuggestion", "votes")
  @JoinColumn({ name: "suggestion_id" })
  suggestion!: BanlistSuggestion;
}
