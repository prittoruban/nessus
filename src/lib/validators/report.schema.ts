import { z } from "zod";

/**
 * Report data validation schemas
 */
export const reportSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Report name is required"),
  description: z.string().optional(),
  file_name: z.string().min(1, "File name is required"),
  file_size: z.number().min(0, "File size must be positive"),
  total_vulnerabilities: z.number().min(0).default(0),
  high_count: z.number().min(0).default(0),
  medium_count: z.number().min(0).default(0),
  low_count: z.number().min(0).default(0),
  info_count: z.number().min(0).default(0),
  status: z.enum(["processing", "completed", "failed"]).default("processing"),
  upload_date: z.string().datetime().optional(),
  processed_date: z.string().datetime().optional(),
  created_by: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const createReportSchema = reportSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  upload_date: true,
  processed_date: true,
  total_vulnerabilities: true,
  high_count: true,
  medium_count: true,
  low_count: true,
  info_count: true,
});

/**
 * Report query parameters validation
 */
export const reportQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["all", "processing", "completed", "failed"]).default("all"),
  search: z.string().optional(),
  sort: z.enum(["upload_date", "name", "total_vulnerabilities"]).default("upload_date"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// Export types
export type Report = z.infer<typeof reportSchema>;
export type CreateReport = z.infer<typeof createReportSchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
