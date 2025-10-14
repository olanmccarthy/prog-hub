import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Player } from "./Player";
import { Session } from "./Session";

@Entity({ name: "decklists" })
export class Decklist {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Player, (p) => p.decklists)
  player!: Player;

  @ManyToOne(() => Session, (s) => s.decklists)
  session!: Session;

  @Column("json")
  maindeck!: string[];

  @Column("json")
  sidedeck!: string[];

  @Column("json")
  extradeck!: string[];
}
