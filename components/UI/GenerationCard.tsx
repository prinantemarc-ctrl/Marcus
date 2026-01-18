"use client";

import { useState, useEffect } from "react";
import Typewriter from "./Typewriter";

interface GenerationCardProps {
  title: string;
  content: string;
  index: number;
  delay?: number;
  onComplete?: () => void;
}

export default function GenerationCard({
  title,
  content,
  index,
  delay = 0,
  onComplete,
}: GenerationCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!isVisible) {
    return null;
  }

  const borderColor = index % 2 === 0 ? "#667eea" : "#f093fb";
  const bgColor = index % 2 === 0 ? "rgba(102, 126, 234, 0.2)" : "rgba(240, 147, 251, 0.2)";

  return (
    <div
      className="glass rounded-xl animate-scale-in p-3 sm:p-4 md:p-6"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: bgColor }}
          >
            <span className="text-xs sm:text-sm font-bold text-white">{index + 1}</span>
          </div>
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white truncate">{title}</h3>
        </div>
        <div className="pl-8 sm:pl-10 md:pl-11">
          <p className="text-gray-300 text-xs sm:text-sm">
            <Typewriter
              text={content}
              speed={20}
              onComplete={() => {
                setIsTyping(false);
                onComplete?.();
              }}
            />
          </p>
        </div>
      </div>
    </div>
  );
}
