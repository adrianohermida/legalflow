import { useState, useEffect, useCallback, useRef } from "react";

// Types for async operation states
interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | string | null;
  isEmpty: boolean;
  isSuccess: boolean;
}

interface AsyncOperationOptions<T> {
  initialData?: T | null;
  loadingType?: "list" | "table" | "card" | "form" | "detail" | "spinner";
  errorType?: "network" | "database" | "permission" | "generic";
  emptyType?: 
    | "clientes"
    | "processos" 
    | "tickets"
    | "activities"
    | "deals"
    | "agenda"
    | "documentos"
    | "inbox"
    | "jornadas"
    | "financeiro"
    | "relatorios"
    | "default";
  retryable?: boolean;
  emptyMessage?: string;
  emptyTitle?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  validateEmpty?: (data: T | null) => boolean;
}

interface AsyncOperationReturn<T> extends AsyncState<T> {
  // Actions
  execute: (asyncFn: () => Promise<T>) => Promise<void>;
  retry: () => void;
  reset: () => void;
  setData: (data: T | null) => void;
  setError: (error: Error | string | null) => void;

  // Component configurations (not JSX components)
  loadingConfig: {
    type: string;
    title: string;
    showTitle: boolean;
  };
  errorConfig: {
    type: string;
    error: Error | string | null;
    onRetry?: () => void;
    retryLabel: string;
    showDetails: boolean;
  };
  emptyConfig: {
    type: string;
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
  };

  // State checkers
  shouldShowLoading: () => boolean;
  shouldShowError: () => boolean;
  shouldShowEmpty: () => boolean;
  shouldShowContent: () => boolean;
}

/**
 * Unified hook for managing async operations with standardized loading, error, and empty states
 * 
 * @example
 * ```tsx
 * function ProcessList() {
 *   const {
 *     data: processes,
 *     isLoading,
 *     error,
 *     execute,
 *     loadingConfig,
 *     errorConfig,
 *     emptyConfig,
 *     shouldShowContent
 *   } = useAsyncOperation<Process[]>({
 *     loadingType: "list",
 *     emptyType: "processos",
 *     emptyActionLabel: "Sincronizar Processos",
 *     onEmptyAction: () => syncProcesses()
 *   });
 * 
 *   useEffect(() => {
 *     execute(() => fetchProcesses());
 *   }, []);
 * 
 *   if (isLoading) return <LoadingState {...loadingConfig} />;
 *   if (error) return <ErrorState {...errorConfig} />;
 *   if (!shouldShowContent()) return <EmptyState {...emptyConfig} />;
 * 
 *   return (
 *     <div>
 *       {processes?.map(process => <ProcessCard key={process.id} process={process} />)}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAsyncOperation<T = any>(
  options: AsyncOperationOptions<T> = {}
): AsyncOperationReturn<T> {
  const {
    initialData = null,
    loadingType = "spinner",
    errorType = "generic",
    emptyType = "default",
    retryable = true,
    emptyMessage,
    emptyTitle,
    emptyActionLabel,
    onEmptyAction,
    validateEmpty = (data) => !data || (Array.isArray(data) && data.length === 0)
  } = options;

  // State management
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    isLoading: false,
    error: null,
    isEmpty: false,
    isSuccess: false,
  });

  // Keep track of the last async function for retry functionality
  const lastAsyncFn = useRef<(() => Promise<T>) | null>(null);

  // Execute async operation
  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    lastAsyncFn.current = asyncFn;
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      isSuccess: false,
    }));

    try {
      const result = await asyncFn();
      const isEmpty = validateEmpty(result);
      
      setState({
        data: result,
        isLoading: false,
        error: null,
        isEmpty,
        isSuccess: true,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error,
        isSuccess: false,
      }));
    }
  }, [validateEmpty]);

  // Retry last operation
  const retry = useCallback(() => {
    if (lastAsyncFn.current) {
      execute(lastAsyncFn.current);
    }
  }, [execute]);

  // Reset state
  const reset = useCallback(() => {
    setState({
      data: initialData,
      isLoading: false,
      error: null,
      isEmpty: false,
      isSuccess: false,
    });
    lastAsyncFn.current = null;
  }, [initialData]);

  // Manual state setters
  const setData = useCallback((data: T | null) => {
    const isEmpty = validateEmpty(data);
    setState(prev => ({
      ...prev,
      data,
      isEmpty,
      isSuccess: !!data,
      error: null,
    }));
  }, [validateEmpty]);

  const setError = useCallback((error: Error | string | null) => {
    setState(prev => ({
      ...prev,
      error,
      isSuccess: false,
    }));
  }, []);

  // Component configurations (not JSX)
  const loadingConfig = {
    type: loadingType,
    title: "Carregando...",
    showTitle: loadingType === "spinner",
  };

  const errorConfig = {
    type: errorType,
    error: state.error,
    onRetry: retryable ? retry : undefined,
    retryLabel: "Tentar Novamente",
    showDetails: true,
  };

  const emptyConfig = {
    type: emptyType,
    title: emptyTitle,
    description: emptyMessage,
    actionLabel: emptyActionLabel,
    onAction: onEmptyAction,
  };

  // State checkers
  const shouldShowLoading = useCallback(() => state.isLoading, [state.isLoading]);
  
  const shouldShowError = useCallback(() => !!state.error && !state.isLoading, [state.error, state.isLoading]);
  
  const shouldShowEmpty = useCallback(() => 
    !state.isLoading && !state.error && state.isEmpty, 
    [state.isLoading, state.error, state.isEmpty]
  );
  
  const shouldShowContent = useCallback(() => 
    !state.isLoading && !state.error && !state.isEmpty && state.data,
    [state.isLoading, state.error, state.isEmpty, state.data]
  );

  return {
    // State
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    isEmpty: state.isEmpty,
    isSuccess: state.isSuccess,

    // Actions
    execute,
    retry,
    reset,
    setData,
    setError,

    // Component configurations
    loadingConfig,
    errorConfig,
    emptyConfig,

    // State checkers
    shouldShowLoading,
    shouldShowError,
    shouldShowEmpty,
    shouldShowContent,
  };
}

/**
 * Simplified hook for basic async operations with minimal configuration
 */
export function useSimpleAsync<T = any>(
  asyncFn?: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const operation = useAsyncOperation<T>();

  useEffect(() => {
    if (asyncFn) {
      operation.execute(asyncFn);
    }
  }, deps);

  return operation;
}

/**
 * Hook for list-based async operations with common defaults
 */
export function useAsyncList<T = any[]>(
  listType: "clientes" | "processos" | "tickets" | "activities" | "deals" = "default" as any,
  options: Partial<AsyncOperationOptions<T>> = {}
) {
  return useAsyncOperation<T>({
    loadingType: "list",
    emptyType: listType,
    validateEmpty: (data) => !data || (Array.isArray(data) && data.length === 0),
    ...options,
  });
}

/**
 * Hook for table-based async operations
 */
export function useAsyncTable<T = any[]>(
  tableType: "clientes" | "processos" | "tickets" | "activities" = "default" as any,
  options: Partial<AsyncOperationOptions<T>> = {}
) {
  return useAsyncOperation<T>({
    loadingType: "table",
    emptyType: tableType,
    validateEmpty: (data) => !data || (Array.isArray(data) && data.length === 0),
    ...options,
  });
}

/**
 * Hook for form-based async operations
 */
export function useAsyncForm<T = any>(
  options: Partial<AsyncOperationOptions<T>> = {}
) {
  return useAsyncOperation<T>({
    loadingType: "form",
    errorType: "generic",
    retryable: false,
    ...options,
  });
}

export default useAsyncOperation;
