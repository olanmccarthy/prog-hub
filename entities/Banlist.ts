import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { Session } from "./Session";
import { BanlistSuggestion } from "./BanlistSuggestion";

@Entity({ name: "banlists" })
export class Banlist {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Session, (s) => s.banlists)
  session!: Session;

  @Column("json")
  banned!: string[];

  @Column("json")
  limited!: string[];

  @Column("json")
  semilimited!: string[];

  @Column("json")
  unlimited!: string[];

  @OneToMany(() => BanlistSuggestion, (s) => s.banlist)
  suggestions!: BanlistSuggestion[];
}
