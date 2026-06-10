import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100
        ${hover ? 'hover:shadow-md hover:border-primary-200 cursor-pointer transition-all' : ''}
        ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
