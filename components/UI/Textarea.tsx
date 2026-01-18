import { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export default function Textarea({
  label,
  error,
  className = "",
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full px-4 py-2.5 rounded-lg
          bg-white/5 border border-white/10
          text-white placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          transition-all duration-200
          resize-none
          ${error ? "border-red-500/50 focus:ring-red-500" : ""}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
