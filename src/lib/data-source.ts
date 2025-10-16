import "reflect-metadata";
import { DataSource } from "typeorm";
import { Player } from "@/src/entities/Player";
import { Session } from "@/src/entities/Session";
import { Decklist } from "@/src/entities/Decklist";
import { Banlist } from "@/src/entities/Banlist";
import { BanlistSuggestion } from "@/src/entities/BanlistSuggestion";
import { BanlistSuggestionVote } from "@/src/entities/BanlistSuggestionVote";
import { Pairing } from "@/src/entities/Pairing";
import { VictoryPoint } from "@/src/entities/VictoryPoint";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "db",
  port: parseInt(process.env.DB_PORT || "3306"),
  username: process.env.MYSQL_USER || "appuser",
  password: process.env.MYSQL_PASSWORD || "apppass",
  database: process.env.MYSQL_DATABASE || "appdb",
  entities: [
    Player,
    Session,
    Decklist,
    Banlist,
    BanlistSuggestion,
    BanlistSuggestionVote,
    Pairing,
    VictoryPoint,
  ],
  synchronize: false, // Don't auto-sync in production
  logging: process.env.NODE_ENV === "development",
});
