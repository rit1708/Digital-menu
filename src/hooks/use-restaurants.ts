import { api } from "~/utils/api";
import type { RouterOutputs } from "~/utils/api";
import { useMemo } from "react";

type Restaurant = RouterOutputs["restaurant"]["getAll"]["items"][number];

/**
 * Hook to fetch restaurants with infinite scroll pagination
 * Handles the response structure automatically
 */
export function useRestaurants(enabled: boolean = true) {
  const restaurantsQuery = api.restaurant.getAll.useInfiniteQuery(
    { limit: 6 },
    {
      enabled,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    }
  );

  const restaurants = useMemo(() => {
    return restaurantsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  }, [restaurantsQuery.data]);

  return {
    restaurants,
    isLoading: restaurantsQuery.isLoading,
    isFetchingNextPage: restaurantsQuery.isFetchingNextPage,
    hasNextPage: restaurantsQuery.hasNextPage,
    fetchNextPage: restaurantsQuery.fetchNextPage,
    refetch: restaurantsQuery.refetch,
  };
}

