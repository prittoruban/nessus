import { z } from "zod";

// ===============================================
// COMPLETE NESSUS SCHEMA DEFINITIONS
// File: schema.ts
// Description: Complete TypeScript schemas for Nessus vulnerability management
// Version: 1.0
// Date: July 21, 2025
// ===============================================

// ===============================================
// 1. CORE ENTITY SCHEMAS
// ===============================================

// Organization Schema
export const organizationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Organization name is required"),
  industry: z.string().optional(),
  contact_person: z.string().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  total_reports: z.number().min(0).default(0),
  last_scan_date: z.string().date().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// Report Schema
export const reportSchema = z.object({
  id: z.string().uuid().optional(),
  
  // Organization & Report Details
  org_name: z.string().min(1, "Organization name is required"),
  source_type: z.enum(["internal", "external"], { message: "Source type must be internal or external" }).default("internal"),
  iteration: z.number().min(1).default(1),
  
  // Report Metadata
  name: z.string().min(1, "Report name is required"),
  description: z.string().optional(),
  document_type: z.string().default("Vulnerability Assessment Report"),
  version: z.string().default("1.0"),
  
  // Personnel
  assessee: z.string().optional(),
  assessor: z.string().optional(),
  reviewer: z.string().optional(),
  approver: z.string().optional(),
  conducted_by: z.string().optional(),
  created_by: z.string().optional(),
  
  // Scan Details
  scan_start_date: z.string().date().optional(),
  scan_end_date: z.string().date().optional(),
  test_location: z.string().default("On-site"),
  tool_used: z.string().default("Nessus"),
  scan_description: z.string().default("Network Vulnerability Assessment"),
  
  // File Upload Details
  file_name: z.string().min(1, "File name is required"),
  file_size: z.number().min(0, "File size must be positive"),
  
  // Calculated Aggregations (Auto-updated)
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

// Report Host Schema
export const reportHostSchema = z.object({
  id: z.string().uuid().optional(),
  report_id: z.string().uuid(),
  ip_address: z.string().min(1, "IP address is required"),
  hostname: z.string().optional(),
  status: z.enum(["Completed", "Failed", "Partial"]).default("Completed"),
  iteration: z.number().min(1).default(1),
  
  // Per-host vulnerability counts (Auto-updated)
  critical_count: z.number().min(0).default(0),
  high_count: z.number().min(0).default(0),
  medium_count: z.number().min(0).default(0),
  low_count: z.number().min(0).default(0),
  info_count: z.number().min(0).default(0),
  total_count: z.number().min(0).default(0),
  zero_day_count: z.number().min(0).default(0),
  
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// Vulnerability Schema
export const vulnerabilitySchema = z.object({
  id: z.string().uuid().optional(),
  
  // Relationships
  report_id: z.string().uuid(),
  host_id: z.string().uuid().optional(),
  
  // Vulnerability Identification
  cve: z.string().default("N/A"),
  plugin_id: z.string().optional(),
  plugin_name: z.string().optional(),
  vuln_name: z.string().min(1, "Vulnerability name is required"),
  
  // Risk Assessment
  severity: z.enum(["critical", "high", "medium", "low", "info"], {
    message: "Severity must be critical, high, medium, low, or info"
  }),
  cvss_score: z.number().min(0).max(10).optional(),
  risk_priority: z.enum(["P1", "P2", "P3", "P4", "P5"]).optional(),
  
  // Technical Details
  description: z.string().optional(),
  solution: z.string().optional(),
  synopsis: z.string().optional(),
  
  // Host Information
  ip_address: z.string().min(1, "IP address is required"),
  port: z.number().min(0).max(65535).optional(),
  protocol: z.enum(["TCP", "UDP"]).optional(),
  service_name: z.string().optional(),
  
  // Classification
  is_zero_day: z.boolean().default(false),
  exploitability: z.enum(["Easy", "Moderate", "Difficult"]).optional(),
  
  // Iteration tracking
  iteration: z.number().min(1).default(1),
  
  // Timestamps
  first_detected: z.string().datetime().optional(),
  last_seen: z.string().datetime().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// CVE Database Schema
export const cveDatabaseSchema = z.object({
  cve_id: z.string().min(1, "CVE ID is required"),
  cvss_v3_score: z.number().min(0).max(10).optional(),
  cvss_v2_score: z.number().min(0).max(10).optional(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
  description: z.string().optional(),
  published_date: z.string().date().optional(),
  modified_date: z.string().date().optional(),
  is_zero_day: z.boolean().default(false),
  exploitability: z.enum(["Easy", "Moderate", "Difficult"]).optional(),
  reference_links: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// Scan Configuration Schema
export const scanConfigurationSchema = z.object({
  id: z.string().uuid().optional(),
  report_id: z.string().uuid(),
  scan_type: z.string().optional(),
  scan_policy: z.string().optional(),
  credentials_used: z.boolean().default(false),
  included_networks: z.string().optional(),
  excluded_networks: z.string().optional(),
  port_ranges: z.string().optional(),
  max_hosts: z.number().min(1).optional(),
  max_checks: z.number().min(1).optional(),
  timeout_settings: z.string().optional(),
  created_at: z.string().datetime().optional(),
});

// ===============================================
// 2. CREATE SCHEMAS (Omit auto-generated fields)
// ===============================================

export const createOrganizationSchema = organizationSchema.omit({
  id: true,
  total_reports: true,
  created_at: true,
  updated_at: true,
});

export const createReportSchema = reportSchema.omit({
  id: true,
  number_of_ips: true,
  total_vulnerabilities: true,
  critical_count: true,
  high_count: true,
  medium_count: true,
  low_count: true,
  info_count: true,
  zero_day_count: true,
  pdf_generated_at: true,
  upload_date: true,
  processed_date: true,
  created_at: true,
  updated_at: true,
});

export const createReportHostSchema = reportHostSchema.omit({
  id: true,
  critical_count: true,
  high_count: true,
  medium_count: true,
  low_count: true,
  info_count: true,
  total_count: true,
  zero_day_count: true,
  created_at: true,
  updated_at: true,
});

export const createVulnerabilitySchema = vulnerabilitySchema.omit({
  id: true,
  first_detected: true,
  last_seen: true,
  created_at: true,
  updated_at: true,
});

export const createCveDatabaseSchema = cveDatabaseSchema.omit({
  created_at: true,
  updated_at: true,
});

export const createScanConfigurationSchema = scanConfigurationSchema.omit({
  id: true,
  created_at: true,
});

// ===============================================
// 3. UPDATE SCHEMAS (All fields optional)
// ===============================================

export const updateOrganizationSchema = organizationSchema.partial();
export const updateReportSchema = reportSchema.partial();
export const updateReportHostSchema = reportHostSchema.partial();
export const updateVulnerabilitySchema = vulnerabilitySchema.partial();
export const updateCveDatabaseSchema = cveDatabaseSchema.partial();
export const updateScanConfigurationSchema = scanConfigurationSchema.partial();

// ===============================================
// 4. EXECUTIVE REPORT VIEW SCHEMAS
// ===============================================

// Executive Report View Schema
export const executiveReportViewSchema = z.object({
  id: z.string().uuid(),
  org_name: z.string(),
  report_name: z.string(),
  version: z.string(),
  document_type: z.string(),
  scan_start_date: z.string().nullable(),
  scan_end_date: z.string().nullable(),
  assessee: z.string().nullable(),
  assessor: z.string().nullable(),
  reviewer: z.string().nullable(),
  approver: z.string().nullable(),
  created_by: z.string().nullable(),
  test_location: z.string(),
  tool_used: z.string(),
  scan_description: z.string(),
  number_of_ips: z.number(),
  total_vulnerabilities: z.number(),
  critical_count: z.number(),
  high_count: z.number(),
  medium_count: z.number(),
  low_count: z.number(),
  info_count: z.number(),
  zero_day_count: z.number(),
  methodology: z.string().nullable(),
  project_scope_notes: z.string().nullable(),
  conclusion: z.string().nullable(),
  confidentiality_level: z.string(),
  legal_disclaimer: z.string(),
  created_at: z.string(),
  scan_duration_days: z.number(),
  formatted_start_date: z.string().nullable(),
  formatted_end_date: z.string().nullable(),
  report_month_year: z.string(),
  suggested_pdf_filename: z.string(),
});

// Host Summary View Schema
export const hostSummaryViewSchema = z.object({
  report_id: z.string().uuid(),
  ip_address: z.string(),
  hostname: z.string().nullable(),
  status: z.string(),
  critical_count: z.number(),
  high_count: z.number(),
  medium_count: z.number(),
  low_count: z.number(),
  info_count: z.number(),
  total_count: z.number(),
  zero_day_count: z.number(),
  host_number: z.number(),
});

// Vulnerability Detail View Schema
export const vulnerabilityDetailViewSchema = z.object({
  report_id: z.string().uuid(),
  ip_address: z.string(),
  cve: z.string().nullable(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  cvss_score: z.number().nullable(),
  vuln_name: z.string().nullable(),
  solution: z.string().nullable(),
  is_zero_day: z.boolean(),
  description: z.string().nullable(),
  synopsis: z.string().nullable(),
  port: z.number().nullable(),
  protocol: z.string().nullable(),
  service_name: z.string().nullable(),
  risk_priority: z.enum(["P1", "P2", "P3", "P4", "P5"]),
  display_cve: z.string(),
  serial_number: z.number(),
});

// ===============================================
// 5. QUERY PARAMETER SCHEMAS
// ===============================================

// Organization Query Schema
export const organizationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  industry: z.string().optional(),
  sort: z.enum(["name", "total_reports", "last_scan_date", "created_at"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

// Report Query Schema
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

// Vulnerability Query Schema
export const vulnerabilityQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  severity: z.enum(["all", "critical", "high", "medium", "low", "info"]).default("all"),
  search: z.string().optional(),
  sort: z.enum(["created_at", "severity", "ip_address", "cvss_score"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  report_id: z.string().uuid().optional(),
  host_id: z.string().uuid().optional(),
  iteration: z.coerce.number().optional(),
  is_zero_day: z.coerce.boolean().optional(),
});

// ===============================================
// 6. CSV UPLOAD SCHEMAS
// ===============================================

export const csvRowSchema = z.object({
  "IP Address": z.string().optional(),
  "IP": z.string().optional(),
  "Host": z.string().optional(),
  "CVE": z.string().optional(),
  "Plugin ID": z.string().optional(),
  "Severity": z.string().optional(),
  "Risk": z.string().optional(),
  "Plugin Name": z.string().optional(),
  "Name": z.string().optional(),
  "Description": z.string().optional(),
  "Synopsis": z.string().optional(),
  "Solution": z.string().optional(),
  "Port": z.string().optional(),
  "Protocol": z.string().optional(),
  "Service": z.string().optional(),
  "CVSS": z.string().optional(),
  "CVSS Score": z.string().optional(),
});

// ===============================================
// 7. EXECUTIVE REPORT SPECIFIC SCHEMAS
// ===============================================

// Risk Model Schema
export const riskModelSchema = z.object({
  priority: z.enum(["P1", "P2", "P3", "P4", "P5"]),
  severity: z.enum(["Critical", "High", "Medium", "Low", "Informational"]),
  cvss_range: z.string(),
  description: z.string(),
});

// Executive Report Summary Schema
export const executiveReportSummarySchema = z.object({
  critical: z.number(),
  high: z.number(),
  medium: z.number(),
  low: z.number(),
  info: z.number(),
  total: z.number(),
});

// PDF Generation Request Schema
export const pdfGenerationRequestSchema = z.object({
  reportId: z.string().uuid(),
  includeCharts: z.boolean().default(false),
  confidential: z.boolean().default(true),
  watermark: z.string().optional(),
  password: z.string().optional(),
});

// Methodology Step Schema
export const methodologyStepSchema = z.object({
  step: z.number(),
  title: z.string(),
  description: z.string(),
});

// ===============================================
// 8. EXPORT ALL TYPES
// ===============================================

// Core Entity Types
export type Organization = z.infer<typeof organizationSchema>;
export type Report = z.infer<typeof reportSchema>;
export type ReportHost = z.infer<typeof reportHostSchema>;
export type Vulnerability = z.infer<typeof vulnerabilitySchema>;
export type CveDatabase = z.infer<typeof cveDatabaseSchema>;
export type ScanConfiguration = z.infer<typeof scanConfigurationSchema>;

// Create Types
export type CreateOrganization = z.infer<typeof createOrganizationSchema>;
export type CreateReport = z.infer<typeof createReportSchema>;
export type CreateReportHost = z.infer<typeof createReportHostSchema>;
export type CreateVulnerability = z.infer<typeof createVulnerabilitySchema>;
export type CreateCveDatabase = z.infer<typeof createCveDatabaseSchema>;
export type CreateScanConfiguration = z.infer<typeof createScanConfigurationSchema>;

// Update Types
export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>;
export type UpdateReport = z.infer<typeof updateReportSchema>;
export type UpdateReportHost = z.infer<typeof updateReportHostSchema>;
export type UpdateVulnerability = z.infer<typeof updateVulnerabilitySchema>;
export type UpdateCveDatabase = z.infer<typeof updateCveDatabaseSchema>;
export type UpdateScanConfiguration = z.infer<typeof updateScanConfigurationSchema>;

// View Types
export type ExecutiveReportView = z.infer<typeof executiveReportViewSchema>;
export type HostSummaryView = z.infer<typeof hostSummaryViewSchema>;
export type VulnerabilityDetailView = z.infer<typeof vulnerabilityDetailViewSchema>;

// Query Types
export type OrganizationQuery = z.infer<typeof organizationQuerySchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type VulnerabilityQuery = z.infer<typeof vulnerabilityQuerySchema>;

// Executive Report Types
export type RiskModel = z.infer<typeof riskModelSchema>;
export type ExecutiveReportSummary = z.infer<typeof executiveReportSummarySchema>;
export type PdfGenerationRequest = z.infer<typeof pdfGenerationRequestSchema>;
export type MethodologyStep = z.infer<typeof methodologyStepSchema>;

// CSV Types
export type CsvRow = z.infer<typeof csvRowSchema>;

// ===============================================
// 9. STATIC DATA EXPORTS
// ===============================================

// Risk Model Data (For Executive Report Section 3)
export const RISK_MODEL_DATA: RiskModel[] = [
  {
    priority: "P1",
    severity: "Critical", 
    cvss_range: "9.0–10.0",
    description: "Full system compromise, data exfiltration possible"
  },
  {
    priority: "P2",
    severity: "High",
    cvss_range: "7.0–8.9", 
    description: "Major security flaws risking unauthorized access"
  },
  {
    priority: "P3",
    severity: "Medium",
    cvss_range: "4.0–6.9",
    description: "Security flaws that need chaining to become exploitable"
  },
  {
    priority: "P4", 
    severity: "Low",
    cvss_range: "0.1–3.9",
    description: "Minor misconfigurations or indirect security threats"
  },
  {
    priority: "P5",
    severity: "Informational", 
    cvss_range: "0.0",
    description: "Informational findings with no direct security impact"
  }
];

// Methodology Content (For Executive Report Section 4)
export const METHODOLOGY_CONTENT: MethodologyStep[] = [
  {
    step: 1,
    title: "Asset Selection",
    description: "Identification and cataloging of target systems within the defined scope."
  },
  {
    step: 2, 
    title: "Reachability Checks",
    description: "Network connectivity verification and port accessibility assessment."
  },
  {
    step: 3,
    title: "Informed Initiation", 
    description: "Stakeholder notification and formal assessment commencement."
  },
  {
    step: 4,
    title: "Tool Execution",
    description: "Automated vulnerability scanning using industry-standard tools."
  },
  {
    step: 5,
    title: "Consolidation & Validation",
    description: "Manual verification of automated findings and false positive elimination."
  },
  {
    step: 6,
    title: "Severity Reclassification",
    description: "Context-aware risk assessment and severity adjustment based on environment."
  },
  {
    step: 7,
    title: "Reporting",
    description: "Comprehensive documentation of findings with remediation guidance."
  },
  {
    step: 8,
    title: "Secure Sharing",
    description: "Encrypted delivery of assessment results to authorized stakeholders."
  }
];

// Severity Levels with Colors (For UI components)
export const SEVERITY_LEVELS = {
  critical: { label: "Critical", color: "bg-red-500", textColor: "text-red-700", priority: 1 },
  high: { label: "High", color: "bg-orange-500", textColor: "text-orange-700", priority: 2 },
  medium: { label: "Medium", color: "bg-yellow-500", textColor: "text-yellow-700", priority: 3 },
  low: { label: "Low", color: "bg-blue-500", textColor: "text-blue-700", priority: 4 },
  info: { label: "Info", color: "bg-gray-500", textColor: "text-gray-700", priority: 5 },
} as const;

// Executive Report Default Content
export const EXECUTIVE_REPORT_DEFAULTS = {
  methodology: "Standard network vulnerability assessment methodology including asset discovery, vulnerability scanning, and risk analysis.",
  project_scope_notes: "This assessment did not include brute-force, denial-of-service, phishing, or physical security testing methods.",
  conclusion: "The assessment identified vulnerabilities that require immediate attention. It is recommended to implement the suggested remediation measures and conduct a follow-up assessment to verify fixes.",
  confidentiality_level: "Internal",
  legal_disclaimer: "This document contains confidential and proprietary information.",
} as const;
