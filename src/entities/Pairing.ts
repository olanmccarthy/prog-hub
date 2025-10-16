import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import type { Session } from "./Session";
import type { Player } from "./Player";

@Entity({ name: "pairings" })
export class Pairing {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne("Session", "pairings")
  @JoinColumn({ name: "session_id" })
  session!: Session;

  @Column()
  round!: number;

  @ManyToOne("Player", "pairingsAsPlayer1")
  @JoinColumn({ name: "player1_id" })
  player1!: Player;

  @ManyToOne("Player", "pairingsAsPlayer2")
  @JoinColumn({ name: "player2_id" })
  player2!: Player;

  @Column()
  player1wins!: number;

  @Column()
  player2wins!: number;
}
