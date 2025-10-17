import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import type { Player } from "./Player";
import type { Session } from "./Session";

@Entity({ name: "decklists" })
export class Decklist {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne("Player", "decklists")
  @JoinColumn({ name: "player_id" })
  player!: Player;

  @ManyToOne("Session", "decklists")
  @JoinColumn({ name: "session_id" })
  session!: Session;

  @Column("json")
  maindeck!: string[];

  @Column("json")
  sidedeck!: string[];

  @Column("json")
  extradeck!: string[];

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  submittedAt!: Date;
}
