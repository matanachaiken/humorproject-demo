import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // "Members" became "My riffs" in week 5.
    return [{ source: "/members", destination: "/me", permanent: true }];
  },
  images: {
    // AI images in our public Supabase bucket, resized and compressed per
    // screen size instead of sending the full 1024px JPEG everywhere.
    remotePatterns: [
      new URL("https://hysjcqwvzjxzdmmqglhu.supabase.co/storage/v1/object/public/generations/**"),
    ],
    qualities: [75],
    // Riff images never change once made, so keep resized copies for a month.
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },
};

export default nextConfig;
