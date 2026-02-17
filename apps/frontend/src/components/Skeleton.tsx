import { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const defaultHeight = {
    text: '1rem',
    circular: '3rem',
    rectangular: '4rem',
  };

  return (
    <div
      className={`
        bg-gray-200 dark:bg-gray-700
        animate-pulse
        ${variantClasses[variant]}
        ${className}
      `}
      style={{
        width: width ?? (variant === 'circular' ? defaultHeight[variant] : '100%'),
        height: height ?? defaultHeight[variant],
        ...style,
      }}
      {...props}
    />
  );
}

// Skeleton variants for common use cases
export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
      <Skeleton variant="rectangular" height="12rem" />
      <Skeleton variant="text" height="1.5rem" width="80%" />
      <Skeleton variant="text" height="1rem" width="60%" />
      <div className="flex gap-2">
        <Skeleton variant="text" height="1rem" width="4rem" />
        <Skeleton variant="text" height="1rem" width="4rem" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}
