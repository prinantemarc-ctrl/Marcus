import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseStyles = "font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "text-white hover:shadow-lg hover:shadow-primary-500/30 focus:ring-primary-500",
    secondary: "text-white hover:shadow-lg hover:shadow-secondary-500/30 focus:ring-secondary-500",
    outline: "border-2 border-white/20 text-white hover:bg-white/5 focus:ring-white/20",
    ghost: "text-gray-300 hover:bg-white/5 hover:text-white focus:ring-white/20",
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const gradientStyles = {
    primary: { background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    secondary: { background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      style={variant === "primary" || variant === "secondary" ? gradientStyles[variant] : undefined}
      {...props}
    >
      {children}
    </button>
  );
}
