import type { NextConfig } from "next";

import { TOUR_FRAME_SOURCES } from "./src/lib/tours";

/**
 * `frame-src` собирается из того же списка провайдеров, что проверяет
 * `parseTourUrl`. Один источник правды: если завтра добавится провайдер туров,
 * забыть про CSP уже не получится.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `frame-src ${TOUR_FRAME_SOURCES.join(" ")}`,
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  // 'unsafe-eval' нужен только dev-режиму Next для HMR.
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
