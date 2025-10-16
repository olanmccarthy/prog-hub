import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import type { Player } from "./Player";
import type { Decklist } from "./Decklist";
import type { Banlist } from "./Banlist";
import type { Pairing } from "./Pairing";
import type { VictoryPoint } from "./VictoryPoint";

@Entity({ name: "sessions" })
export class Session {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  number!: number;

  @Column()
  date!: Date;

  // Top placements (FKs to Player)
  @ManyToOne("Player")
  @JoinColumn({ name: "first" })
  first!: Player;

  @ManyToOne("Player")
  @JoinColumn({ name: "second" })
  second!: Player;

  @ManyToOne("Player")
  @JoinColumn({ name: "third" })
  third!: Player;

  @ManyToOne("Player")
  @JoinColumn({ name: "fourth" })
  fourth!: Player;

  @ManyToOne("Player")
  @JoinColumn({ name: "fifth" })
  fifth!: Player;

  @ManyToOne("Player")
  @JoinColumn({ name: "sixth" })
  sixth!: Player;

  // Relations
  @OneToMany("Decklist", "session")
  decklists!: Decklist[];

  @OneToMany("Banlist", "session")
  banlists!: Banlist[];

  @OneToMany("Pairing", "session")
  pairings!: Pairing[];

  @OneToMany("VictoryPoint", "session")
  victoryPoints!: VictoryPoint[];
}
