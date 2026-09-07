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

function supabaseImagePatterns() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    {
      protocol: "https",
      hostname: "*.supabase.co",
      pathname: "/storage/v1/object/public/**",
    },
    {
      protocol: "https",
      hostname: "*.supabase.co",
      pathname: "/storage/v1/object/sign/**",
    },
  ];
  if (!raw) {
    return patterns;
  }
  try {
    const url = new URL(raw);
    const protocol = url.protocol === "http:" ? "http" : "https";
    const port = url.port || undefined;
    for (const pathname of ["/storage/v1/object/public/**", "/storage/v1/object/sign/**"] as const) {
      patterns.unshift({
        protocol,
        hostname: url.hostname,
        ...(port ? { port } : {}),
        pathname,
      });
    }
  } catch {
    // NEXT_PUBLIC_SUPABASE_URL ist optional für den Image-Loader.
  }
  return patterns;
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    minimumCacheTTL: 60 * 60 * 24,
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseImagePatterns(),
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
