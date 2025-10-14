import { DataSource } from "typeorm";
import { Player } from "@/src/entities/Player";
import { Decklist } from "@/src/entities/Decklist";
import { Session } from "@/src/entities/Session";
import { Banlist } from "@/src/entities/Banlist";
import { BanlistSuggestion } from "@/src/entities/BanlistSuggestion";
import { BanlistSuggestionVote } from "@/src/entities/BanlistSuggestionVote";
import { Pairing } from "@/src/entities/Pairing";
import { VictoryPoint } from "@/src/entities/VictoryPoint";

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
