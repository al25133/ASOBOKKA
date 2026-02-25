import type { NextConfig } from "next";
import withPWA from "next-pwa";
import runtimeCaching from "next-pwa/cache";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    appDir: true,
  },
};

export default withPWA({
  ...nextConfig,
  pwa: {
    dest: "public",
    runtimeCaching,
    disable: process.env.NODE_ENV === "development",
    register: true,
    skipWaiting: true,
  },
});
