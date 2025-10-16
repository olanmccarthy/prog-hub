import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import type { Session } from "./Session";
import type { BanlistSuggestion } from "./BanlistSuggestion";

@Entity({ name: "banlists" })
export class Banlist {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne("Session", "banlists")
  @JoinColumn({ name: "session_id" })
  session!: Session;

  @Column("json")
  banned!: string[];

  @Column("json")
  limited!: string[];

  @Column("json")
  semilimited!: string[];

  @Column("json")
  unlimited!: string[];

  @OneToMany("BanlistSuggestion", "banlist")
  suggestions!: BanlistSuggestion[];
}
