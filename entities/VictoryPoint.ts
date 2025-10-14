import { Entity, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Player } from "./Player";
import { Session } from "./Session";

@Entity({ name: "victory_points" })
export class VictoryPoint {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Player, (p) => p.victoryPoints)
  player!: Player;

  @ManyToOne(() => Session, (s) => s.victoryPoints)
  session!: Session;
}
