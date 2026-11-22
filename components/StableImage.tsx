"use client";

type StableImageProps = {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
};

export default function StableImage({
  src,
  alt,
  className = "",
  loading = "lazy",
}: StableImageProps) {
  return (
    <img
      key={src}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      draggable={false}
      className={`${className} opacity-100`}
    />
  );
}
