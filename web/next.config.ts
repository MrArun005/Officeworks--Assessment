import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // A self-contained server bundle, so the Docker image stays small.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
