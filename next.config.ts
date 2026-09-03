import type { NextConfig } from "next";

// Gelten für jede Antwort der App – auch für Server Actions und API-Routen.
const securityHeaders = [
  // Clickjacking: TalentMatch darf in keinem fremden iFrame laufen.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // MIME-Sniffing unterbinden.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer nur innerhalb der eigenen Origin vollständig senden.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Sensoren und Zahlungs-APIs braucht die App nicht.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(self), payment=()",
  },
  // Auf http (localhost) ignorieren Browser den Header, in Produktion greift er.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
