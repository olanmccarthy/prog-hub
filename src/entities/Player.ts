import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import type { Decklist } from "./Decklist";
import type { BanlistSuggestion } from "./BanlistSuggestion";
import type { BanlistSuggestionVote } from "./BanlistSuggestionVote";
import type { Pairing } from "./Pairing";
import type { VictoryPoint } from "./VictoryPoint";

@Entity({ name: "players" })
export class Player {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  password!: string;

  @Column({ name: "is_admin", default: false })
  isAdmin!: boolean;

  // Relationships
  @OneToMany("Decklist", "player")
  decklists!: Decklist[];

  @OneToMany("BanlistSuggestion", "player")
  suggestions!: BanlistSuggestion[];

  @OneToMany("BanlistSuggestionVote", "player")
  votes!: BanlistSuggestionVote[];

  @OneToMany("Pairing", "player1")
  pairingsAsPlayer1!: Pairing[];

  @OneToMany("Pairing", "player2")
  pairingsAsPlayer2!: Pairing[];

  @OneToMany("VictoryPoint", "player")
  victoryPoints!: VictoryPoint[];
}
