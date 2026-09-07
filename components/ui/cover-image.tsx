import { AppImage } from "@/components/ui/app-image";
import { resolveBusinessImageUrl } from "@/lib/business/images";

const DEFAULT_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 42vw";

export function CoverImage({
  src,
  alt = "",
  className,
  fallbackClassName,
  sizes = DEFAULT_SIZES,
  quality = 75,
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  sizes?: string;
  quality?: number;
}) {
  const resolved = resolveBusinessImageUrl(src) ?? (typeof src === "string" && /^https?:\/\//i.test(src) ? src : null);
  const wrapperClass = `relative block overflow-hidden ${className?.replace(/\bobject-cover\b/g, "") ?? ""}`.trim();
  const fallback = (
    <div
      className={
        fallbackClassName ??
        `bg-gradient-to-br from-zinc-200 via-white to-zinc-100 ${className ?? ""}`.trim()
      }
      aria-hidden
    />
  );

  if (!resolved) {
    return fallback;
  }

  return (
    <span className={wrapperClass}>
      <AppImage
        src={resolved}
        alt={alt}
        fill
        quality={quality}
        sizes={sizes}
        className="object-cover"
        fallback={fallback}
      />
    </span>
  );
}
