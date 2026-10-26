import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/materials/guide": ["./output/pdf/etf-od-nuly.pdf"],
  },
};

export default nextConfig;
