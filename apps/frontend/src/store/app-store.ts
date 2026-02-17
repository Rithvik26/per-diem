import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppState {
  // Location selection
  selectedLocationId: string | null;
  setSelectedLocationId: (locationId: string | null) => void;

  // Dark mode
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Location state
      selectedLocationId: null,
      setSelectedLocationId: (locationId) => set({ selectedLocationId: locationId }),

      // Dark mode state
      darkMode: false,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setDarkMode: (enabled) => set({ darkMode: enabled }),

      // Search state (not persisted via persist middleware)
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
    }),
    {
      name: 'per-diem-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist selectedLocationId and darkMode, not searchQuery
      partialize: (state) => ({
        selectedLocationId: state.selectedLocationId,
        darkMode: state.darkMode,
      }),
    },
  ),
);
