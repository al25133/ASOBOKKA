import type { NextConfig } from "next";
import nextPwa from "next-pwa";
import runtimeCaching from "next-pwa/cache";

const withPWA = nextPwa({
  dest: "public",
  runtimeCaching,
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA({
  ...nextConfig,
});
