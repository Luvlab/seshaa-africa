import { useState } from 'react';
import { Star } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  value: number;          // 0–5, supports half-stars visually
  count?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showCount?: boolean;
  compact?: boolean;
}

export default function StarRating({ value, count, size = 14, interactive = false, onChange, showCount = true, compact = false }: Props) {
  const [hovered, setHovered] = useState(0);

  const display = hovered || value;

  return (
    <div className={clsx('flex items-center gap-0.5', compact ? 'gap-0' : 'gap-1')}>
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => interactive && setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            className={clsx(
              'star-fill transition-colors',
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default pointer-events-none'
            )}
            style={{ color: star <= Math.round(display) ? '#F59E0B' : '#D1D5DB' }}
            onMouseEnter={() => interactive && setHovered(star)}
            onClick={() => interactive && onChange?.(star)}
          >
            <Star
              size={size}
              fill={star <= Math.round(display) ? 'currentColor' : 'none'}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
      {showCount && !compact && (
        <span className="text-xs text-gray-500 ml-1">
          {value > 0 ? value.toFixed(1) : ''}
          {count !== undefined && count > 0 && ` (${count.toLocaleString()})`}
        </span>
      )}
      {compact && value > 0 && (
        <span className="text-xs text-gray-600 font-medium ml-0.5">{value.toFixed(1)}</span>
      )}
    </div>
  );
}
