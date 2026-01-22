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
      {
        protocol: 'https',
        hostname: 'images.ygoprog.com',
        port: '',
        pathname: '/pack/**',
      },
      {
        protocol: 'https',
        hostname: 'static.wikia.nocookie.net',
        port: '',
        pathname: '/yugioh/images/**',
      },
    ],
    // Cache optimized images for 60 days
    minimumCacheTTL: 60 * 60 * 24 * 60, // 60 days in seconds
  },
};

export default nextConfig;
