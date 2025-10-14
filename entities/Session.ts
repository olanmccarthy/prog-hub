import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from "typeorm";
import { Player } from "./Player";
import { Decklist } from "./Decklist";
import { Banlist } from "./Banlist";
import { Pairing } from "./Pairing";
import { VictoryPoint } from "./VictoryPoint";

@Entity({ name: "sessions" })
export class Session {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  number!: number;

  @Column()
  date!: Date;

  // Top placements (FKs to Player)
  @ManyToOne(() => Player)
  first!: Player;

  @ManyToOne(() => Player)
  second!: Player;

  @ManyToOne(() => Player)
  third!: Player;

  @ManyToOne(() => Player)
  fourth!: Player;

  @ManyToOne(() => Player)
  fifth!: Player;

  @ManyToOne(() => Player)
  sixth!: Player;

  // Relations
  @OneToMany(() => Decklist, (d) => d.session)
  decklists!: Decklist[];

  @OneToMany(() => Banlist, (b) => b.session)
  banlists!: Banlist[];

  @OneToMany(() => Pairing, (p) => p.session)
  pairings!: Pairing[];

  @OneToMany(() => VictoryPoint, (v) => v.session)
  victoryPoints!: VictoryPoint[];
}
