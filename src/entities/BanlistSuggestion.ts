import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import type { Banlist } from "./Banlist";
import type { Player } from "./Player";
import type { BanlistSuggestionVote } from "./BanlistSuggestionVote";

@Entity({ name: "banlist_suggestions" })
export class BanlistSuggestion {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne("Banlist", "suggestions")
  @JoinColumn({ name: "banlist_id" })
  banlist!: Banlist;

  @ManyToOne("Player", "suggestions")
  @JoinColumn({ name: "player_id" })
  player!: Player;

  @Column("json")
  banned!: string[];

  @Column("json")
  limited!: string[];

  @Column("json")
  semilimited!: string[];

  @Column("json")
  unlimited!: string[];

  @Column({ default: false })
  chosen!: boolean;

  @ManyToOne("Player")
  @JoinColumn({ name: "moderator_id" })
  moderator!: Player | null;

  @OneToMany("BanlistSuggestionVote", "suggestion")
  votes!: BanlistSuggestionVote[];
}
