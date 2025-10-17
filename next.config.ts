import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Suppress TypeORM warnings for unused database drivers
    config.ignoreWarnings = [
      { module: /node_modules\/typeorm/ },
      { module: /node_modules\/app-root-path/ },
    ];

    return config;
  },
};

export default nextConfig;
