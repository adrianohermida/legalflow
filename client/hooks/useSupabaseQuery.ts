import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { handleApiError } from "../lib/api";
import { createSupabaseQueryFunction } from "../lib/supabase-queries";

// Type definitions for overloaded function
type QueryOptions = {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
};

type QueryKey = (string | number)[];
type QueryFn<T> = () => Promise<T>;

// Overloaded function declarations
export function useSupabaseQuery<T>(
  queryKey: QueryKey,
  queryFn: QueryFn<T>,
  options?: QueryOptions,
): any;

export function useSupabaseQuery<T>(
  queryKey: string,
  sql: string,
  params: any[],
  options?: QueryOptions,
): any;

export function useSupabaseQuery<T>(
  queryKey: string,
  sql: string,
  options?: QueryOptions,
): any;

// Implementation
export function useSupabaseQuery<T>(
  queryKey: QueryKey | string,
  queryFnOrSql: QueryFn<T> | string,
  paramsOrOptions?: any[] | QueryOptions,
  options?: QueryOptions,
) {
  // Normalize parameters based on the call signature
  let normalizedQueryKey: QueryKey;
  let normalizedQueryFn: QueryFn<T>;
  let normalizedOptions: QueryOptions | undefined;

  if (typeof queryKey === "string") {
    // Legacy call with string queryKey
    normalizedQueryKey = [queryKey];

    if (typeof queryFnOrSql === "string") {
      // SQL query call
      const sqlParams = Array.isArray(paramsOrOptions) ? paramsOrOptions : [];
      normalizedOptions = Array.isArray(paramsOrOptions)
        ? options
        : (paramsOrOptions as QueryOptions);

      normalizedQueryFn = async () => {
        console.warn(
          `Legacy SQL query detected for key '${queryKey}'. Consider migrating to proper API functions.`,
        );
        // Return empty array as placeholder
        return [] as T;
      };
    } else {
      // Function call with string key
      normalizedQueryFn = queryFnOrSql as QueryFn<T>;
      normalizedOptions = paramsOrOptions as QueryOptions;
    }
  } else {
    // Modern call with array queryKey
    normalizedQueryKey = queryKey;
    normalizedQueryFn = queryFnOrSql as QueryFn<T>;
    normalizedOptions = paramsOrOptions as QueryOptions;
  }

  return useQuery({
    queryKey: normalizedQueryKey,
    queryFn: async () => {
      try {
        return await normalizedQueryFn();
      } catch (error: any) {
        // Handle and transform error to a proper Error object
        const errorMessage = error?.message || String(error);
        console.error("Supabase query error:", errorMessage);
        throw new Error(errorMessage);
      }
    },
    staleTime: normalizedOptions?.staleTime || 5 * 60 * 1000, // 5 minutes
    refetchInterval: normalizedOptions?.refetchInterval,
    enabled: normalizedOptions?.enabled,
    retry: (failureCount, error) => {
      // Don't retry configuration errors or auth errors
      if (
        error?.message?.includes("não está configurado") ||
        error?.message?.includes("JWT") ||
        error?.message?.includes("permission")
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

// Legacy SQL query helper (deprecated)
export function useSupabaseQuerySQL<T>(
  queryKey: (string | number)[],
  sql: string,
  params: any[],
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  },
) {
  return useSupabaseQuery<T[]>(
    queryKey,
    createSupabaseQueryFunction<T>(sql, params) as () => Promise<T[]>,
    options,
  );
}

// Generic hook for Supabase mutations
export function useSupabaseMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    invalidateQueries?: (string | number)[][];
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      try {
        return await mutationFn(variables);
      } catch (error: any) {
        // Handle and transform error to a proper Error object
        const errorMessage = error?.message || String(error);
        console.error("Supabase mutation error:", errorMessage);
        throw new Error(errorMessage);
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate specified queries
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      options?.onSuccess?.(data, variables);
    },
    onError: (error: any, variables) => {
      options?.onError?.(error, variables);
    },
  });
}

// Helper to invalidate queries
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return (queryKeys: (string | number)[][]) => {
    queryKeys.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
  };
}

// Helper to update query data optimistically
export function useUpdateQueryData() {
  const queryClient = useQueryClient();

  return <T>(
    queryKey: (string | number)[],
    updater: (oldData: T | undefined) => T,
  ) => {
    queryClient.setQueryData(queryKey, updater);
  };
}
