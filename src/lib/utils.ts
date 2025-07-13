import { config } from "./config";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility function for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// File validation utilities
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > config.upload.maxFileSize) {
    return {
      valid: false,
      error: `File size must be less than ${config.upload.maxFileSize / (1024 * 1024)}MB`,
    };
  }

  // Check file type
  const isValidType = config.upload.allowedTypes.some((type) =>
    file.name.toLowerCase().endsWith(type)
  );

  if (!isValidType) {
    return {
      valid: false,
      error: `Only ${config.upload.allowedTypes.join(", ")} files are allowed`,
    };
  }

  return { valid: true };
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Format date
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get severity color
export function getSeverityColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case "high":
      return "bg-red-100 text-red-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Generate pagination info
export function getPaginationInfo(
  currentPage: number,
  totalPages: number,
  totalItems: number,
  pageSize: number
) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return {
    startItem,
    endItem,
    totalItems,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}
