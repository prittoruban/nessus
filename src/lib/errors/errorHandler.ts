import { NextResponse } from "next/server";
import { AppError, ValidationError } from "./AppError";

/**
 * Centralized error handler for API routes
 */
export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error);

  // Handle known application errors
  if (error instanceof AppError) {
    const response = {
      error: error.message,
      ...(error instanceof ValidationError && { details: error.details })
    };

    return NextResponse.json(response, { status: error.statusCode });
  }

  // Handle unknown errors
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}

/**
 * Error logger for development and production
 */
export function logError(error: unknown, context?: string): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` [${context}]` : '';
  
  if (error instanceof Error) {
    console.error(`${timestamp}${contextStr} Error: ${error.message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
  } else {
    console.error(`${timestamp}${contextStr} Unknown error:`, error);
  }
}
