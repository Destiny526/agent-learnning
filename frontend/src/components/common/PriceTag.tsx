interface PriceTagProps {
  price: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'text-sm',
  md: 'text-xl',
  lg: 'text-3xl',
};

export default function PriceTag({ price, currency = '¥', size = 'md', className = '' }: PriceTagProps) {
  return (
    <span className={`font-bold text-red-500 ${sizeStyles[size]} ${className}`}>
      {currency}{price.toFixed(2)}
    </span>
  );
}
