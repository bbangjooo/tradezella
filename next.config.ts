import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "@libsql/core", "@libsql/hrana-client", "@prisma/adapter-libsql"],
};

export default nextConfig;
