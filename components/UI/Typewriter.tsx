"use client";

import { useEffect, useState } from "react";

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

export default function Typewriter({
  text,
  speed = 30,
  onComplete,
  className = "",
}: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (onComplete && currentIndex === text.length) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  useEffect(() => {
    setDisplayedText("");
    setCurrentIndex(0);
  }, [text]);

  return (
    <span className={className}>
      {displayedText}
      <span className="animate-pulse">|</span>
    </span>
  );
}
