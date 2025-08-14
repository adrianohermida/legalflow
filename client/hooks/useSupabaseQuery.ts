import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleApiError } from '../lib/api';
import { supabase } from '../lib/supabase';

// Generic hook for Supabase queries - supports both function and SQL string approaches
export function useSupabaseQuery<T>(
  queryKey: (string | number)[],
  queryFnOrSql: (() => Promise<T>) | string,
  sqlParamsOrOptions?: any[] | {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  },
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  }
) {
  // Determine if this is a SQL query or function call
  const isSqlQuery = typeof queryFnOrSql === 'string';
  const finalOptions = isSqlQuery ? options : (sqlParamsOrOptions as any);
  const sqlParams = isSqlQuery ? sqlParamsOrOptions as any[] : undefined;

  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        if (isSqlQuery) {
          // Execute SQL query with parameters using RPC
          const { data, error } = await supabase.rpc('execute_query', {
            query_text: queryFnOrSql,
            query_params: sqlParams || []
          });

          if (error) {
            throw new Error(error.message);
          }

          return data as T;
        } else {
          // Execute function directly
          return await (queryFnOrSql as () => Promise<T>)();
        }
      } catch (error: any) {
        // Handle and transform error to a proper Error object
        const errorMessage = error?.message || String(error);
        console.error('Supabase query error:', errorMessage);
        throw new Error(errorMessage);
      }
    },
    staleTime: finalOptions?.staleTime || 5 * 60 * 1000, // 5 minutes
    refetchInterval: finalOptions?.refetchInterval,
    enabled: finalOptions?.enabled,
    retry: (failureCount, error) => {
      // Don't retry configuration errors or auth errors
      if (error?.message?.includes('não está configurado') ||
          error?.message?.includes('JWT') ||
          error?.message?.includes('permission')) {
        return false;
      }
      return failureCount < 3;
    }
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
    mutationFn: async (variables: TVariables) => {
      try {
        return await mutationFn(variables);
      } catch (error: any) {
        // Handle and transform error to a proper Error object
        const errorMessage = error?.message || String(error);
        console.error('Supabase mutation error:', errorMessage);
        throw new Error(errorMessage);
      }
    },
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
