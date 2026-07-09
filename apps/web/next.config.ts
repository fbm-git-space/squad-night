import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@party/shared", "@party/game-touchline", "@party/game-core"],
};

export default nextConfig;
