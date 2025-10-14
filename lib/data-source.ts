import { DataSource } from "typeorm";
import { Player } from "@/entities/Player";
import { Decklist } from "@/entities/Decklist";
import { Session } from "@/entities/Session";
import { Banlist } from "@/entities/Banlist";
import { BanlistSuggestion } from "@/entities/BanlistSuggestion";
import { BanlistSuggestionVote } from "@/entities/BanlistSuggestionVote";
import { Pairing } from "@/entities/Pairing";
import { VictoryPoint } from "@/entities/VictoryPoint";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  port: 3306,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [
    Player,
    Decklist,
    Session,
    Banlist,
    BanlistSuggestion,
    BanlistSuggestionVote,
    Pairing,
    VictoryPoint,
  ],
  synchronize: process.env.NODE_ENV !== 'production',
});
