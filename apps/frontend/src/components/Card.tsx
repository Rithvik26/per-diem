import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
}

export function Card({ children, hoverable = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-lg shadow-sm
        ${hoverable ? 'transition-all duration-200 hover:shadow-md hover:scale-[1.02]' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
