import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleApiError } from '../lib/api';

// Generic hook for Supabase queries
export function useSupabaseQuery<T>(
  queryKey: (string | number)[],
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey,
    queryFn,
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutes
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error?.message?.includes('JWT') || error?.message?.includes('permission')) {
        return false;
      }
      return failureCount < 3;
    },
    onError: handleApiError
  });
}

// Generic hook for Supabase mutations
export function useSupabaseMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    invalidateQueries?: (string | number)[][];
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      // Invalidate specified queries
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      
      options?.onSuccess?.(data, variables);
    },
    onError: (error: any, variables) => {
      handleApiError(error);
      options?.onError?.(error, variables);
    }
  });
}

// Helper to invalidate queries
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  
  return (queryKeys: (string | number)[][]) => {
    queryKeys.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey });
    });
  };
}

// Helper to update query data optimistically
export function useUpdateQueryData() {
  const queryClient = useQueryClient();
  
  return <T>(queryKey: (string | number)[], updater: (oldData: T | undefined) => T) => {
    queryClient.setQueryData(queryKey, updater);
  };
}
