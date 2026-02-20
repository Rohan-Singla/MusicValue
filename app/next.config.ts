import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.audius.co",
      },
      {
        protocol: "https",
        hostname: "audius.co",
      },
    ],
  },
};

export default nextConfig;
