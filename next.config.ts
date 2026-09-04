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

function supabaseImageHost() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseImageHost();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
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
