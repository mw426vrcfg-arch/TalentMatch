"use client";

import Image from "next/image";
import { useState } from "react";

export function AppImage({
  src,
  alt = "",
  className,
  sizes = "100vw",
  quality = 75,
  fill = false,
  width,
  height,
  fallback = null,
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  sizes?: string;
  quality?: number;
  fill?: boolean;
  width?: number;
  height?: number;
  fallback?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return fallback;
  }

  if (fill || (!width && !height)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        quality={quality}
        sizes={sizes}
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      quality={quality}
      sizes={sizes}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
