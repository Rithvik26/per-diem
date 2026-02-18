import { useState } from 'react';
import { motion } from 'framer-motion';
import type { MenuItem as MenuItemType } from '@per-diem/shared-types';
import { Card } from '../components/Card';

interface MenuItemProps {
  item: MenuItemType;
}

export function MenuItem({ item }: MenuItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const hasLongDescription = (item.description?.length || 0) > 100;
  const displayDescription = isExpanded ? item.description : item.description?.slice(0, 100);

  return (
    <motion.div
      data-testid="menu-item"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className="h-full"
    >
      <Card hoverable className="overflow-hidden h-full flex flex-col">
        {/* Image */}
        {item.image_url && !imageError ? (
          <div className="relative aspect-video bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
            <svg
              className="w-16 h-16 text-gray-400 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Name */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{item.name}</h3>

          {/* Category badge */}
          <div className="mb-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {item.category}
            </span>
          </div>

          {/* Description */}
          {item.description && (
            <div className="mb-3 flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {displayDescription}
                {hasLongDescription && !isExpanded && '...'}
              </p>
              {hasLongDescription && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? 'Read less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {/* Variations */}
          {item.variations && item.variations.length > 0 && (
            <div className="mt-auto">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                {item.variations.length > 1 ? 'Options' : 'Price'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {item.variations.map((variation) => (
                  <div
                    key={variation.id}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 min-w-[100px]"
                  >
                    {variation.name && (
                      <span className="text-sm text-gray-700 dark:text-gray-300 mr-2">{variation.name}</span>
                    )}
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {variation.priceFormatted}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
