import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Session } from "./Session";
import { Player } from "./Player";

@Entity({ name: "pairings" })
export class Pairing {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Session, (s) => s.pairings)
  session!: Session;

  @Column()
  round!: number;

  @ManyToOne(() => Player, (p) => p.pairingsAsPlayer1)
  player1!: Player;

  @ManyToOne(() => Player, (p) => p.pairingsAsPlayer2)
  player2!: Player;

  @Column()
  player1wins!: number;

  @Column()
  player2wins!: number;
}
