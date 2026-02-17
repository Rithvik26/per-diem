import { useRef, useEffect, useState } from 'react';
import type { CategoryGroup } from '@per-diem/shared-types';

interface CategoryNavProps {
  categories: CategoryGroup[];
  activeCategory: string | null;
  onCategoryClick: (categoryId: string) => void;
}

export function CategoryNav({ categories, activeCategory, onCategoryClick }: CategoryNavProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  // Check scroll position to show/hide shadows
  const handleScroll = () => {
    if (!navRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = navRef.current;
    setShowLeftShadow(scrollLeft > 0);
    setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    handleScroll(); // Check initial state
  }, [categories]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Left shadow */}
      {showLeftShadow && (
        <div
          className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none z-10"
          aria-hidden="true"
        />
      )}

      {/* Right shadow */}
      {showRightShadow && (
        <div
          className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none z-10"
          aria-hidden="true"
        />
      )}

      {/* Scrollable nav */}
      <nav
        ref={navRef}
        onScroll={handleScroll}
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        aria-label="Category navigation"
      >
        {categories.map((category) => {
          const isActive = activeCategory === category.categoryId;
          return (
            <button
              key={category.categoryId}
              onClick={() => onCategoryClick(category.categoryId)}
              className={`
                px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm
                transition-all duration-200 flex-shrink-0
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                min-h-[44px] flex items-center
                ${
                  isActive
                    ? 'bg-blue-600 text-white dark:bg-blue-500 shadow-md'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
              aria-pressed={isActive}
              aria-label={`View ${category.category} category`}
            >
              {category.category}
              <span className="ml-2 text-xs opacity-75">({category.items.length})</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
