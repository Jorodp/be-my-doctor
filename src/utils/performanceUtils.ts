// Utilidades para optimización de rendimiento

// Función para lazy loading de módulos
export const lazyWithRetry = (componentImport: () => Promise<any>, retries = 3) => {
  return new Promise((resolve, reject) => {
    componentImport()
      .then(resolve)
      .catch((error) => {
        if (retries > 0) {
          console.warn(`Error cargando componente, reintentando... (${retries} intentos restantes)`);
          setTimeout(() => {
            lazyWithRetry(componentImport, retries - 1).then(resolve, reject);
          }, 1000);
        } else {
          reject(error);
        }
      });
  });
};

// Función para preload de rutas críticas
export const preloadRoute = (routeImport: () => Promise<any>) => {
  if (typeof window !== 'undefined') {
    requestIdleCallback(() => {
      routeImport().catch(() => {
        // Silenciar errores de preload
      });
    });
  }
};

// Función para comprimir imágenes antes de upload
export const compressImage = (
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8
): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // Calcular nuevas dimensiones manteniendo aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Dibujar imagen redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // Convertir a blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};

// Función para batch de operaciones
export const batchOperations = <T>(
  operations: T[],
  batchSize = 5,
  delay = 100
): Promise<T[]> => {
  return new Promise((resolve) => {
    const results: T[] = [];
    let currentIndex = 0;

    const processBatch = () => {
      const batch = operations.slice(currentIndex, currentIndex + batchSize);
      results.push(...batch);
      currentIndex += batchSize;

      if (currentIndex < operations.length) {
        setTimeout(processBatch, delay);
      } else {
        resolve(results);
      }
    };

    processBatch();
  });
};

// Función para medir performance
export const measurePerformance = (name: string, fn: () => void) => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
  } else {
    fn();
  }
};

// Cache con TTL para datos
class TTLCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; ttl: number }>();

  set(key: string, data: T, ttl: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

export const dataCache = new TTLCache();

// Función para optimizar re-renders
export const shouldComponentUpdate = (prevProps: any, nextProps: any): boolean => {
  return JSON.stringify(prevProps) !== JSON.stringify(nextProps);
};