import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      { source: "/workout/log/:splitId", destination: "/entrenamiento/:splitId", permanent: true },
    ]
  },
}

export default nextConfig
