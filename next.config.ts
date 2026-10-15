import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // "Members" became "My riffs" in week 5.
    return [{ source: "/members", destination: "/me", permanent: true }];
  },
};

export default nextConfig;
