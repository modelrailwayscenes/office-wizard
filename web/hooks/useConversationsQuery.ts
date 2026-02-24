import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";

const CONVERSATIONS_STALE_TIME = 30_000; // 30 seconds

/** React Query hook for conversations list - enables caching */
export function useConversationsListQuery(options: {
  filter?: Record<string, unknown>;
  first?: number;
  select?: Record<string, unknown>;
}) {
  const { filter, first = 100, select = { id: true } } = options;
  return useQuery({
    queryKey: ["conversations", "list", filter, first, select],
    queryFn: async () => {
      const result = await api.conversation.findMany({
        filter: filter as any,
        first,
        select: select as any,
      });
      return result;
    },
    staleTime: CONVERSATIONS_STALE_TIME,
  });
}

/** React Query hook for dashboard conversations - enables caching */
export function useDashboardConversationsQuery(options: {
  startOfDay: Date;
}) {
  const { startOfDay } = options;
  return useQuery({
    queryKey: ["conversations", "dashboard", startOfDay.toISOString()],
    queryFn: async () => {
      const result = await api.conversation.findMany({
        first: 1000,
        filter: {
          latestMessageAt: { greaterThanOrEqual: startOfDay.toISOString() },
        } as any,
        select: {
          id: true,
          status: true,
          currentPriorityBand: true,
          lastTriagedAt: true,
          latestMessageAt: true,
          hasDraft: true,
          unreadCount: true,
        } as any,
      });
      return result;
    },
    staleTime: CONVERSATIONS_STALE_TIME,
  });
}

/** Invalidate conversations cache (call after mutations) */
export function useInvalidateConversations() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };
}
