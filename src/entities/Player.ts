import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Decklist } from "./Decklist";
import { BanlistSuggestion } from "./BanlistSuggestion";
import { BanlistSuggestionVote } from "./BanlistSuggestionVote";
import { Session } from "./Session";
import { Pairing } from "./Pairing";
import { VictoryPoint } from "./VictoryPoint";

@Entity({ name: "players" })
export class Player {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  // Relationships
  @OneToMany(() => Decklist, (decklist) => decklist.player)
  decklists!: Decklist[];

  @OneToMany(() => BanlistSuggestion, (s) => s.player)
  suggestions!: BanlistSuggestion[];

  @OneToMany(() => BanlistSuggestionVote, (v) => v.player)
  votes!: BanlistSuggestionVote[];

  @OneToMany(() => Pairing, (p) => p.player1)
  pairingsAsPlayer1!: Pairing[];

  @OneToMany(() => Pairing, (p) => p.player2)
  pairingsAsPlayer2!: Pairing[];

  @OneToMany(() => VictoryPoint, (v) => v.player)
  victoryPoints!: VictoryPoint[];
}
