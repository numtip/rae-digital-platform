import { asset } from "@/lib/assets";

// next/image cannot emit a srcset in this project: the Pages preview needs
// `images.unoptimized`, and without the optimiser there is no srcset. So the three
// pre-built WebP widths are offered directly. None of the widths needs the intrinsic
// size because every call site fixes the aspect through CSS, which also keeps CLS
// at zero while the file loads.
function widths(src: string) {
  const base = src.replace(/\.webp$/, "");
  return { small: `${base}-320.webp`, medium: `${base}-640.webp`, large: src };
}

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
  const w = widths(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- see the comment above
    <img
      alt={alt}
      className={className}
      decoding="async"
      fetchPriority={eager ? "high" : undefined}
      loading={eager ? "eager" : "lazy"}
      sizes={sizes}
      src={asset(w.medium)}
      srcSet={`${asset(w.small)} 320w, ${asset(w.medium)} 640w, ${asset(w.large)} 900w`}
    />
  );
}
