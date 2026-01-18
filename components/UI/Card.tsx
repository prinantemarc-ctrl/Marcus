import { ReactNode, CSSProperties } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  style?: CSSProperties;
}

export default function Card({
  children,
  className = "",
  hover = false,
  gradient = false,
  style,
}: CardProps) {
  return (
    <div
      className={`
        glass rounded-xl p-6
        ${hover ? "card-hover" : ""}
        ${gradient ? "bg-gradient-to-br from-white/10 to-white/5" : ""}
        ${className}
      `}
      style={style}
    >
      {children}
    </div>
  );
}
