import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.ygoprodeck.com',
        port: '',
        pathname: '/images/sets/**',
      },
    ],
    // Cache optimized images for 60 days
    minimumCacheTTL: 60 * 60 * 24 * 60, // 60 days in seconds
  },
};

export default nextConfig;
