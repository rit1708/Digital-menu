import { api } from "~/utils/api";
import type { RouterOutputs } from "~/utils/api";
import { useMemo } from "react";

type Dish = RouterOutputs["dish"]["getByRestaurant"]["items"][number];

/**
 * Hook to fetch dishes with infinite scroll pagination
 */
export function useDishes(restaurantId: string | undefined, enabled: boolean = true) {
  const dishesQuery = api.dish.getByRestaurant.useInfiniteQuery(
    { restaurantId: restaurantId as string, limit: 6 },
    { 
      enabled: !!restaurantId && enabled,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const dishes = useMemo(() => {
    return dishesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  }, [dishesQuery.data]);

  return {
    dishes,
    isLoading: dishesQuery.isLoading,
    isFetchingNextPage: dishesQuery.isFetchingNextPage,
    hasNextPage: dishesQuery.hasNextPage,
    fetchNextPage: dishesQuery.fetchNextPage,
    refetch: dishesQuery.refetch,
  };
}

