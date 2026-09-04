"use client";

import { useState } from "react";
import { resolveBusinessImageUrl } from "@/lib/business/images";

export function CoverImage({
  src,
  alt = "",
  className,
  fallbackClassName,
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const resolved = resolveBusinessImageUrl(src);
  const [failed, setFailed] = useState(false);

  if (!resolved || failed) {
    return (
      <div
        className={
          fallbackClassName ??
          `bg-gradient-to-br from-zinc-200 via-white to-zinc-100 ${className ?? ""}`.trim()
        }
        aria-hidden
      />
    );
  }

  return <img src={resolved} alt={alt} className={className} onError={() => setFailed(true)} />;
}
