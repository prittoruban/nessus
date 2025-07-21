import { z } from "zod";

/**
 * Enhanced Report data validation schemas
 */
export const reportSchema = z.object({
  id: z.string().uuid().optional(),
  
  // Organization & Report Details
  org_name: z.string().min(1, "Organization name is required"),
  source_type: z.enum(["internal", "external"], { message: "Source type must be internal or external" }),
  iteration: z.number().min(1).default(1),
  
  // Report Metadata
  name: z.string().min(1, "Report name is required"),
  description: z.string().optional(),
  document_type: z.string().optional(),
  version: z.string().optional(),
  
  // Personnel
  assessee: z.string().optional(),
  assessor: z.string().optional(),
  reviewer: z.string().optional(),
  approver: z.string().optional(),
  conducted_by: z.string().optional(),
  
  // Scan Details
  scan_start_date: z.string().date().optional(),
  scan_end_date: z.string().date().optional(),
  test_location: z.string().optional(),
  tool_used: z.string().optional(),
  scan_description: z.string().optional(),
  
  // File Upload Details
  file_name: z.string().min(1, "File name is required"),
  file_size: z.number().min(0, "File size must be positive"),
  
  // Calculated Aggregations
  number_of_ips: z.number().min(0).default(0),
  total_vulnerabilities: z.number().min(0).default(0),
  critical_count: z.number().min(0).default(0),
  high_count: z.number().min(0).default(0),
  medium_count: z.number().min(0).default(0),
  low_count: z.number().min(0).default(0),
  info_count: z.number().min(0).default(0),
  zero_day_count: z.number().min(0).default(0),
  
  // Report Content
  methodology: z.string().optional(),
  project_scope_notes: z.string().optional(),
  conclusion: z.string().optional(),
  
  // Executive Report Specific
  confidentiality_level: z.string().default("Internal"),
  legal_disclaimer: z.string().default("This document contains confidential and proprietary information."),
  pdf_generated_at: z.string().datetime().optional(),
  pdf_file_path: z.string().optional(),
  
  // Status & Timestamps
  status: z.enum(["processing", "completed", "failed"]).default("processing"),
  upload_date: z.string().datetime().optional(),
  processed_date: z.string().datetime().optional(),
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
  critical_count: true,
  high_count: true,
  medium_count: true,
  low_count: true,
  info_count: true,
  zero_day_count: true,
  number_of_ips: true,
});

/**
 * Enhanced Report query parameters validation
 */
export const reportQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["all", "processing", "completed", "failed"]).default("all"),
  source_type: z.enum(["all", "internal", "external"]).default("all"),
  org_name: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["upload_date", "name", "total_vulnerabilities", "scan_start_date"]).default("upload_date"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// Export types
export type Report = z.infer<typeof reportSchema>;
export type CreateReport = z.infer<typeof createReportSchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
