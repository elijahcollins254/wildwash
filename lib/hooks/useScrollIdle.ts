"use client";

import { useEffect, useState } from "react";

export function useScrollIdle(delay = 800): boolean {
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    let idleTimer: number | undefined;

    const handleScroll = () => {
      setIsScrolling(true);
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setIsScrolling(false), delay);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.clearTimeout(idleTimer);
    };
  }, [delay]);

  return isScrolling;
}
