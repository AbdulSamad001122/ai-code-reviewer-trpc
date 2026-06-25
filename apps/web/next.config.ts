import type { NextConfig } from "next";

const devOriginsStr = process.env.ALLOWED_DEV_ORIGINS || "";
const devOrigins = devOriginsStr
  .split(",")
  .map((o) => o.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""))
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "my-unique-app-name.loophole.site",
    "my-unique-testing-app.loca.lt",
    ...devOrigins,
  ],
  turbopack: {},
  async rewrites() {
    return [
      {
        source: "/api/trpc/:path*",
        destination: `${process.env.BACKEND_API_URL || "http://localhost:5000"}/trpc/:path*`,
      },
    ];
  },
  webpack: (config, { isServer, dev }) => {
    if (dev && !isServer) {
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        const hmrClient = "next/dist/compiled/@next/react-dev-overlay/dist/client";
        if (entries[hmrClient]) {
          entries[hmrClient] = entries[hmrClient].map((entry: string) => {
            if (entry.includes("webpack-hmr")) {
              return entry.replace(/(\?|&)hostname=[^&]+/, "$1hostname=localhost&port=3000");
            }
            return entry;
          });
        }
        return entries;
      };
    }
    return config;
  },
};

export default nextConfig;
