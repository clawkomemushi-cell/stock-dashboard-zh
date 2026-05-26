import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  turbopack: {
    root: process.cwd(),
  },
  // better-sqlite3 是原生 native 模組，需排除在 Next.js bundle 之外
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
