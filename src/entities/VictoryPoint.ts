import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import type { Player } from "./Player";
import type { Session } from "./Session";

@Entity({ name: "victory_points" })
export class VictoryPoint {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne("Player", "victoryPoints")
  @JoinColumn({ name: "player_id" })
  player!: Player;

  @ManyToOne("Session", "victoryPoints")
  @JoinColumn({ name: "session_id" })
  session!: Session;
}
