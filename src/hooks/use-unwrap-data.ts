/**
 * Utility function to unwrap tRPC response data
 * Handles various response structures that might come from tRPC
 */
export function unwrapData<T>(data: unknown): T | null {
  if (!data) return null;

  // If data is already the expected type
  if (typeof data === "object" && !("json" in data) && !("data" in data)) {
    return data as T;
  }

  // Handle nested structures: data.json or data.data.json
  const jsonData = (data as any)?.json ?? (data as any)?.data?.json ?? data;

  return jsonData as T;
}

/**
 * Hook to unwrap array data from tRPC responses
 * Handles various response structures
 */
export function useUnwrapArray<T>(data: unknown): T[] {
  if (!data) return [];

  // If already an array
  if (Array.isArray(data)) {
    return data as T[];
  }

  // Try to extract array from nested structures
  const unwrapped = unwrapData<T[]>(data);
  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  return [];
}

