"use client";

import { useEffect, useState } from "react";

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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <img
      key={src}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onLoad={(event) => {
        const image = event.currentTarget;
        if (typeof image.decode === "function") {
          void image.decode().finally(() => setLoaded(true));
        } else {
          setLoaded(true);
        }
      }}
      className={`${className} transition-opacity duration-300 ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
