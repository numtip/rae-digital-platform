import { asset, photoSources } from "@/lib/assets";

// next/image cannot emit a srcset in this project: the Pages preview needs
// `images.unoptimized`, and without the optimiser there is no srcset. So the three
// pre-built WebP widths are offered directly when they exist (lib/assets.ts decides).
// None of the widths needs the intrinsic size because every call site fixes the aspect
// through CSS, which also keeps CLS at zero while the file loads.

export function NewsImage({
  src,
  alt,
  sizes,
  className,
  eager,
}: {
  src: string;
  alt: string;
  sizes: string;
  className: string;
  eager?: boolean;
}) {
  const w = photoSources(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- see the comment above
    <img
      alt={alt}
      className={className}
      decoding="async"
      fetchPriority={eager ? "high" : undefined}
      loading={eager ? "eager" : "lazy"}
      sizes={sizes}
      src={asset(w.src)}
      srcSet={w.candidates.length > 0 ? w.candidates.map((c) => `${asset(c.url)} ${c.width}w`).join(", ") : undefined}
    />
  );
}
