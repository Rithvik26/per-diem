import { useEffect, useState, RefObject } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
}

/**
 * Hook to observe when an element intersects with the viewport
 * @param elementRef - Ref to the element to observe
 * @param options - Intersection Observer options
 * @returns Object containing isIntersecting state and the observer entry
 */
export function useIntersectionObserver(
  elementRef: RefObject<Element>,
  options: UseIntersectionObserverOptions = {},
): {
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
} {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setEntry(entry);
      },
      {
        threshold: options.threshold ?? 0.5,
        root: options.root ?? null,
        rootMargin: options.rootMargin ?? '0px',
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, options.threshold, options.root, options.rootMargin]);

  return { isIntersecting, entry };
}
