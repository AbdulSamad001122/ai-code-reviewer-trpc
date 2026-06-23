import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["felix-plectognathic-myrtice.ngrok-free.dev"],
  async rewrites() {
    return [
      {
        source: "/api/trpc/:path*",
        destination: "http://localhost:5000/trpc/:path*",
      },
    ];
  },
};

export default nextConfig;
