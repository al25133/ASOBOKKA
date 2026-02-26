declare module "next-pwa" {
  import type { NextConfig } from "next";

  type PwaPluginOptions = {
    dest: string;
    runtimeCaching?: unknown;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
  };

  type WithPwa = (nextConfig?: NextConfig) => NextConfig;

  export default function nextPwa(options: PwaPluginOptions): WithPwa;
}

declare module "next-pwa/cache" {
  const runtimeCaching: unknown;
  export default runtimeCaching;
}
