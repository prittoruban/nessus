import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success" | "warning" | "info" | "active";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-sm hover:shadow-md";
  
  const variants = {
    primary: "bg-blue-600 !text-white hover:bg-blue-700 focus-visible:ring-blue-500",
    secondary: "bg-white !text-gray-900 hover:bg-gray-50 focus-visible:ring-gray-500 border border-gray-300",
    danger: "bg-red-600 !text-white hover:bg-red-700 focus-visible:ring-red-500",
    ghost: "!text-gray-700 hover:bg-gray-100 hover:!text-gray-900 focus-visible:ring-gray-500",
    success: "bg-green-600 !text-white hover:bg-green-700 focus-visible:ring-green-500",
    warning: "bg-yellow-500 !text-white hover:bg-yellow-600 focus-visible:ring-yellow-500",
    info: "bg-cyan-600 !text-white hover:bg-cyan-700 focus-visible:ring-cyan-500",
    active: "bg-blue-600 !text-white hover:bg-blue-700 focus-visible:ring-blue-500 ring-2 ring-blue-200",
  };
  
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-6 text-base",
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        widthClass,
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
} 