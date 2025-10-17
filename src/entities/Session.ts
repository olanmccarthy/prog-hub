import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
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

  // Top placements (FKs to Player) - stored as nullable integers
  @Column({ type: "int", nullable: true })
  first!: number | null;

  @Column({ type: "int", nullable: true })
  second!: number | null;

  @Column({ type: "int", nullable: true })
  third!: number | null;

  @Column({ type: "int", nullable: true })
  fourth!: number | null;

  @Column({ type: "int", nullable: true })
  fifth!: number | null;

  @Column({ type: "int", nullable: true })
  sixth!: number | null;

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
