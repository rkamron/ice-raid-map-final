import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RaidFilters, RaidData } from "@/types";
import { apiRequest } from "@/lib/queryClient";

// Convert filters object to query string
const filtersToQueryString = (filters?: RaidFilters): string => {
  if (!filters) return "";
  
  const params = new URLSearchParams();
  
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.state && filters.state !== 'ALL') params.append('state', filters.state);
  if (filters.raidTypes && filters.raidTypes.length > 0) {
    params.append('raidTypes', filters.raidTypes.join(','));
  }
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
};

// Hook for fetching raid data with optional filters
export function useRaidData(filters?: RaidFilters) {
  const queryString = filtersToQueryString(filters);
  
  return useQuery<RaidData[]>({
    queryKey: [`/api/raids${queryString}`],
    // Default queryFn is set up in queryClient.ts
  });
}

// Hook for fetching a single raid by ID
export function useRaidDetail(id?: number) {
  return useQuery<RaidData>({
    queryKey: [`/api/raids/${id}`],
    enabled: !!id,
  });
}

// Hook for getting list of available states
export function useStates() {
  return useQuery<string[]>({
    queryKey: ['/api/states'],
  });
}

// Hook for getting last updated timestamp
export function useLastUpdated() {
  return useQuery({
    queryKey: ['/api/lastUpdated'],
  });
}

// Hook for manually triggering a scrape
export function useTriggerScrape() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/scrape', {});
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all raid-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/raids'] });
      queryClient.invalidateQueries({ queryKey: ['/api/states'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lastUpdated'] });
    },
  });
}
