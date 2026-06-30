import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve("./src"),
      "@tanstack/react-router": path.resolve("./src/lib/next-router-compat.js"),
    };
    return config;
  },
};

export default nextConfig;
