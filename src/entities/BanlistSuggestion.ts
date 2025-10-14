import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { Banlist } from "./Banlist";
import { Player } from "./Player";
import { BanlistSuggestionVote } from "./BanlistSuggestionVote";

@Entity({ name: "banlist_suggestions" })
export class BanlistSuggestion {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Banlist, (b) => b.suggestions)
  banlist!: Banlist;

  @ManyToOne(() => Player, (p) => p.suggestions)
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

  @ManyToOne(() => Player)
  moderator!: Player;

  @OneToMany(() => BanlistSuggestionVote, (v) => v.suggestion)
  votes!: BanlistSuggestionVote[];
}
