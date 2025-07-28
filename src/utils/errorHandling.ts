import { toast } from '@/hooks/use-toast';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = 'GENERIC_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'No autorizado') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Error de conexión') {
    super(message, 'NETWORK_ERROR', 503);
    this.name = 'NetworkError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Error de base de datos') {
    super(message, 'DATABASE_ERROR', 500);
    this.name = 'DatabaseError';
  }
}

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
}

export const handleError = (
  error: unknown,
  options: ErrorHandlerOptions = {}
): string => {
  const {
    showToast = true,
    logError = true,
    fallbackMessage = 'Ha ocurrido un error inesperado'
  } = options;

  let errorMessage = fallbackMessage;
  let errorCode = 'UNKNOWN_ERROR';

  // Determinar el tipo de error y mensaje apropiado
  if (error instanceof AppError) {
    errorMessage = error.message;
    errorCode = error.code;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    
    // Detectar tipos específicos de errores comunes
    if (error.message.includes('network') || error.message.includes('fetch')) {
      errorCode = 'NETWORK_ERROR';
      errorMessage = 'Error de conexión. Verifica tu internet.';
    } else if (error.message.includes('auth') || error.message.includes('token')) {
      errorCode = 'AUTH_ERROR';
      errorMessage = 'Error de autenticación. Inicia sesión nuevamente.';
    } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      errorCode = 'PERMISSION_ERROR';
      errorMessage = 'No tienes permisos para realizar esta acción.';
    } else if (error.message.includes('foreign key') || error.message.includes('constraint')) {
      errorCode = 'DATABASE_CONSTRAINT_ERROR';
      errorMessage = 'Error de validación de datos. Verifica la información.';
    }
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  // Log del error
  if (logError) {
    console.error(`[${errorCode}] ${errorMessage}`, error);
  }

  // Mostrar toast si está habilitado
  if (showToast) {
    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    });
  }

  return errorMessage;
};

// Hook para manejo de errores en componentes
export const useErrorHandler = () => {
  return {
    handleError,
    ValidationError,
    AuthError,
    NetworkError,
    DatabaseError,
    AppError
  };
};

// Utility para wrapping de funciones async con manejo de errores
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: ErrorHandlerOptions
): T => {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, options);
      throw error; // Re-throw para que el componente pueda manejar loading states
    }
  }) as T;
};