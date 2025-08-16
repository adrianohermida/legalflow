/**
 * UNIFIED ASYNC OPERATION HOOK
 * Implementing standardized state management as suggested
 */

import { useState, useCallback, useEffect } from "react";
import { LoadingState } from "../components/states/LoadingState";
import { ErrorState } from "../components/states/ErrorState";
import { EmptyState } from "../components/states/EmptyState";

interface AsyncOperationState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
  isEmpty: boolean;
}

interface AsyncOperationActions {
  execute: () => Promise<void>;
  reset: () => void;
  refetch: () => Promise<void>;
}

interface AsyncOperationComponents {
  LoadingComponent: () => JSX.Element;
  ErrorComponent: () => JSX.Element;
  EmptyComponent: () => JSX.Element;
}

interface UseAsyncOperationOptions<T> {
  initialData?: T | null;
  executeOnMount?: boolean;
  retryCount?: number;
  retryDelay?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  emptyCheck?: (data: T | null) => boolean;
}

export function useAsyncOperation<T>(
  asyncFunction: () => Promise<T>,
  options: UseAsyncOperationOptions<T> = {},
): AsyncOperationState<T> & AsyncOperationActions & AsyncOperationComponents {
  const {
    initialData = null,
    executeOnMount = false,
    retryCount = 0,
    retryDelay = 1000,
    onSuccess,
    onError,
    emptyCheck = (data) => !data || (Array.isArray(data) && data.length === 0),
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentRetry, setCurrentRetry] = useState(0);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFunction();
      setData(result);
      setCurrentRetry(0);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (currentRetry < retryCount) {
        setTimeout(() => {
          setCurrentRetry((prev) => prev + 1);
          execute();
        }, retryDelay);
      } else {
        setError(error);
        onError?.(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [asyncFunction, currentRetry, retryCount, retryDelay, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(initialData);
    setIsLoading(false);
    setError(null);
    setCurrentRetry(0);
  }, [initialData]);

  const refetch = useCallback(async () => {
    setCurrentRetry(0);
    await execute();
  }, [execute]);

  // Execute on mount if requested
  useEffect(() => {
    if (executeOnMount) {
      execute();
    }
  }, [executeOnMount, execute]);

  // Derived state
  const isSuccess = !isLoading && !error && data !== null;
  const isEmpty = isSuccess && emptyCheck(data);

  // Component factories
  const LoadingComponent = useCallback(() => {
    return LoadingState({
      title: "Carregando...",
      description: "Aguarde enquanto processamos sua solicitação.",
    });
  }, []);

  const ErrorComponent = useCallback(() => {
    return ErrorState({
      title: "Erro ao carregar dados",
      description: error?.message || "Ocorreu um erro inesperado.",
      onRetry: refetch,
      showRetry: true,
    });
  }, [error, refetch]);

  const EmptyComponent = useCallback(() => {
    return EmptyState({
      title: "Nenhum dado encontrado",
      description: "Não há informações disponíveis no momento.",
      onAction: refetch,
      actionLabel: "Tentar novamente",
    });
  }, [refetch]);

  return {
    // State
    data,
    isLoading,
    error,
    isSuccess,
    isEmpty,

    // Actions
    execute,
    reset,
    refetch,

    // Components
    LoadingComponent,
    ErrorComponent,
    EmptyComponent,
  };
}

// Specialized hooks for common patterns
export function useApiCall<T>(
  apiFunction: () => Promise<T>,
  options?: UseAsyncOperationOptions<T>,
) {
  return useAsyncOperation(apiFunction, {
    executeOnMount: true,
    retryCount: 2,
    retryDelay: 1000,
    ...options,
  });
}

export function useLazyApiCall<T>(
  apiFunction: () => Promise<T>,
  options?: UseAsyncOperationOptions<T>,
) {
  return useAsyncOperation(apiFunction, {
    executeOnMount: false,
    ...options,
  });
}

// Helper for rendering based on state
export function renderAsyncState<T>(
  state: AsyncOperationState<T> & AsyncOperationComponents,
  renderData: (data: T) => JSX.Element,
): JSX.Element {
  if (state.isLoading) {
    return state.LoadingComponent();
  }

  if (state.error) {
    return state.ErrorComponent();
  }

  if (state.isEmpty) {
    return state.EmptyComponent();
  }

  if (state.data) {
    return renderData(state.data);
  }

  return state.EmptyComponent();
}

export default useAsyncOperation;
