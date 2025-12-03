import { api } from "~/utils/api";
import type { RouterOutputs } from "~/utils/api";
import { useMemo } from "react";

type Category = RouterOutputs["category"]["getAll"]["items"][number];

/**
 * Hook to fetch categories with infinite scroll pagination
 */
export function useCategories(restaurantId: string | undefined, enabled: boolean = true) {
  const categoriesQuery = api.category.getAll.useInfiniteQuery(
    { restaurantId: restaurantId as string, limit: 6 },
    { 
      enabled: !!restaurantId && enabled,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const categories = useMemo(() => {
    return categoriesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  }, [categoriesQuery.data]);

  return {
    categories,
    isLoading: categoriesQuery.isLoading,
    isFetchingNextPage: categoriesQuery.isFetchingNextPage,
    hasNextPage: categoriesQuery.hasNextPage,
    fetchNextPage: categoriesQuery.fetchNextPage,
    refetch: categoriesQuery.refetch,
  };
}

