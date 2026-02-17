import { useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CategoryGroup } from '@per-diem/shared-types';
import { fetchCatalog } from '../services/api';
import { useAppStore } from '../store/app-store';
import { useDebounce } from '../hooks/useDebounce';
import { MenuItem } from './MenuItem';
import { CategoryNav } from './CategoryNav';
import { SkeletonCard } from '../components/Skeleton';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';

export function MenuGrid() {
  const selectedLocationId = useAppStore((state) => state.selectedLocationId);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const categoryRefs = useRef<Map<string, HTMLElement>>(new Map());

  const {
    data: categories,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['catalog', selectedLocationId],
    queryFn: () => fetchCatalog(selectedLocationId!),
    enabled: !!selectedLocationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter items based on search query
  const filteredCategories = categories
    ?.map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        if (!debouncedSearch) return true;
        const query = debouncedSearch.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          false
        );
      }),
    }))
    .filter((category) => category.items.length > 0);

  // Scroll spy: observe category sections and update active category
  useEffect(() => {
    if (!filteredCategories) return;

    const observers: IntersectionObserver[] = [];

    filteredCategories.forEach((category) => {
      const element = categoryRefs.current.get(category.categoryId);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveCategory(category.categoryId);
            }
          });
        },
        {
          rootMargin: '-100px 0px -70% 0px',
          threshold: 0,
        },
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [filteredCategories]);

  // Handle category click - smooth scroll to section
  const handleCategoryClick = (categoryId: string) => {
    const element = categoryRefs.current.get(categoryId);
    if (element) {
      const offset = 120; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setActiveCategory(categoryId);
    }
  };

  if (!selectedLocationId) {
    return (
      <EmptyState
        title="No location selected"
        message="Please select a location from the dropdown above to view the menu."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorMessage
        title="Failed to load menu"
        message={error instanceof Error ? error.message : 'An error occurred while loading the menu'}
        onRetry={() => refetch()}
      />
    );
  }

  if (!filteredCategories || filteredCategories.length === 0) {
    if (debouncedSearch) {
      return (
        <EmptyState
          title="No results found"
          message={`No menu items match "${debouncedSearch}". Try a different search term.`}
        />
      );
    }

    return (
      <EmptyState
        title="No menu items available"
        message="This location doesn't have any menu items at the moment."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Navigation */}
      {!debouncedSearch && (
        <div className="sticky top-[140px] z-20 bg-white dark:bg-gray-900 pb-4 -mx-4 px-4 md:-mx-6 md:px-6">
          <CategoryNav
            categories={filteredCategories}
            activeCategory={activeCategory}
            onCategoryClick={handleCategoryClick}
          />
        </div>
      )}

      {/* Menu Items Grouped by Category */}
      <div className="space-y-12">
        {filteredCategories.map((category) => (
          <section
            key={category.categoryId}
            ref={(el) => {
              if (el) {
                categoryRefs.current.set(category.categoryId, el);
              }
            }}
            aria-labelledby={`category-${category.categoryId}`}
          >
            <h2
              id={`category-${category.categoryId}`}
              className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6"
            >
              {category.category}
              <span className="ml-3 text-base font-normal text-gray-500 dark:text-gray-400">
                ({category.items.length} {category.items.length === 1 ? 'item' : 'items'})
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.items.map((item) => (
                <MenuItem key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
