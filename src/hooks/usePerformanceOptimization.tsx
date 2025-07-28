import { useCallback, useMemo, useRef, useEffect } from 'react';

// Hook para debounce
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
};

// Hook para throttle
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        return callback(...args);
      }
    }) as T,
    [callback, delay]
  );
};

// Hook para memoización de datos complejos
export const useMemoizedData = <T,>(
  data: T[],
  computeFn: (data: T[]) => any,
  dependencies: any[] = []
) => {
  return useMemo(() => {
    if (!data || data.length === 0) return null;
    return computeFn(data);
  }, [data, ...dependencies]);
};

// Hook para lazy loading de componentes
export const useLazyLoad = (threshold = 0.1) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const isIntersecting = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersecting.current = entry.isIntersecting;
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return { elementRef, isIntersecting: isIntersecting.current };
};

// Hook para optimización de render de listas grandes
export const useVirtualizedList = <T,>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const scrollTop = useRef(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop.current / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );

    return {
      startIndex,
      endIndex,
      visibleItems: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, containerHeight, scrollTop.current]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    scrollTop.current = e.currentTarget.scrollTop;
  }, []);

  return {
    ...visibleItems,
    handleScroll
  };
};

// Hook para cache en memoria con TTL
export const useMemoryCache = <T,>(key: string, ttl: number = 5 * 60 * 1000) => {
  const cache = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const get = useCallback((): T | null => {
    const cached = cache.current.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > ttl) {
      cache.current.delete(key);
      return null;
    }

    return cached.data;
  }, [key, ttl]);

  const set = useCallback((data: T) => {
    cache.current.set(key, {
      data,
      timestamp: Date.now()
    });
  }, [key]);

  const clear = useCallback(() => {
    cache.current.delete(key);
  }, [key]);

  const clearAll = useCallback(() => {
    cache.current.clear();
  }, []);

  return { get, set, clear, clearAll };
};