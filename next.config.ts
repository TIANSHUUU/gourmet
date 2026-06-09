import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/gourmet",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
