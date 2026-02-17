import { useRef, useEffect } from 'react';
import { useAppStore } from '../store/app-store';

export function SearchBar() {
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = () => {
    setSearchQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <label htmlFor="search-input" className="sr-only">
        Search menu items
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          ref={inputRef}
          id="search-input"
          type="search"
          placeholder="Search menu items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="
            w-full pl-10 pr-10 py-2 text-base
            bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-600
            rounded-lg shadow-sm
            placeholder-gray-400 dark:placeholder-gray-500
            text-gray-900 dark:text-gray-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-colors duration-200
            min-h-[44px]
          "
          aria-label="Search for menu items by name or description"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="
              absolute inset-y-0 right-0 flex items-center pr-3
              text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 rounded
            "
            aria-label="Clear search"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Cmd+K</kbd> to search
      </p>
    </div>
  );
}
