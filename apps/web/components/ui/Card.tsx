import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = '',
  hover = false,
  onClick,
}: CardProps) {
  return (
    <div
      className={`
        bg-white border border-gray-200 
        ${hover ? 'hover:border-gray-300 hover:shadow-lg transition-all duration-300 cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-5 py-5 sm:px-6 sm:py-6 border-b border-gray-100 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardContent({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-5 py-5 sm:px-6 sm:py-6 ${className}`}>{children}</div>
  );
}

export function CardFooter({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-4 py-4 sm:px-6 border-t border-gray-100 bg-gray-50/50 rounded-b-lg ${className}`}
    >
      {children}
    </div>
  );
}
