import "reflect-metadata";
import { DataSource } from "typeorm";
import { Player } from "@entities/Player";
import { Session } from "@entities/Session";
import { Decklist } from "@entities/Decklist";
import { Banlist } from "@entities/Banlist";
import { BanlistSuggestion } from "@entities/BanlistSuggestion";
import { BanlistSuggestionVote } from "@entities/BanlistSuggestionVote";
import { Pairing } from "@entities/Pairing";
import { VictoryPoint } from "@entities/VictoryPoint";

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
  connectTimeout: 10000, // 10 seconds
  acquireTimeout: 10000,
  extra: {
    connectionLimit: 10,
  },
});

// Helper function to ensure connection with retry logic
let initializationPromise: Promise<DataSource> | null = null;

export async function getDataSource(): Promise<DataSource> {
  // If already initialized, return it
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = AppDataSource.initialize()
    .then((dataSource) => {
      console.log("Database connection established successfully");
      initializationPromise = null;
      return dataSource;
    })
    .catch((error) => {
      console.error("Failed to initialize database connection:", error);
      initializationPromise = null;
      throw error;
    });

  return initializationPromise;
}
