import { useQuery } from '@tanstack/react-query';
import { fetchLocations } from '../services/api';
import { useAppStore } from '../store/app-store';
import { Skeleton } from '../components/Skeleton';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';

export function LocationSelector() {
  const selectedLocationId = useAppStore((state) => state.selectedLocationId);
  const setSelectedLocationId = useAppStore((state) => state.setSelectedLocationId);

  const {
    data: locations,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="w-full">
        <Skeleton variant="rectangular" height="44px" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorMessage
        title="Failed to load locations"
        message={error instanceof Error ? error.message : 'An error occurred'}
        onRetry={() => refetch()}
      />
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <EmptyState
        title="No locations available"
        message="There are no active locations to display at this time."
      />
    );
  }

  return (
    <div className="w-full">
      <label htmlFor="location-select" className="sr-only">
        Select a location
      </label>
      <select
        id="location-select"
        value={selectedLocationId || ''}
        onChange={(e) => setSelectedLocationId(e.target.value || null)}
        className="
          w-full px-4 py-2 text-base
          bg-white dark:bg-gray-800
          border border-gray-300 dark:border-gray-600
          rounded-lg shadow-sm
          text-gray-900 dark:text-gray-100
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          cursor-pointer transition-colors duration-200
          min-h-[44px]
        "
        aria-label="Select restaurant location"
      >
        <option value="">Select a location...</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
            {location.address?.locality && ` - ${location.address.locality}`}
          </option>
        ))}
      </select>
    </div>
  );
}
