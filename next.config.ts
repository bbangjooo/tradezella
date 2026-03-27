import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "@libsql/core", "@libsql/hrana-client", "@prisma/adapter-libsql"],
  bundlePagesRouterDependencies: false,
};

export default nextConfig;
