import { useEffect, useRef, useState, useCallback } from 'react';

export function useInfiniteScroll<T>({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 100,
}: {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
}) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isObserving, setIsObserving] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        rootMargin: `${threshold}px`,
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
      setIsObserving(true);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [onLoadMore, hasMore, isLoading, threshold]);

  return observerTarget;
}
