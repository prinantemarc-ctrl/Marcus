"use client";

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
}

export default function ProgressBar({
  current,
  total,
  label,
  showPercentage = true,
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;

  return (
    <div className="space-y-1 sm:space-y-2">
      {label && (
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-gray-300 font-medium truncate pr-2">{label}</span>
          {showPercentage && (
            <span className="text-gray-400 whitespace-nowrap text-xs sm:text-sm">
              {current} / {total} ({Math.round(percentage)}%)
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-white/5 rounded-full h-2 sm:h-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out relative"
          style={{ 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            width: `${percentage}%`
          }}
        >
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
            style={{
              animation: "shimmer 2s infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
