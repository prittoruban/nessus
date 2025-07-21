import { z } from "zod";

/**
 * Executive Report specific types and schemas
 */

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
  total: z.number(),
});

// PDF Generation Request Schema
export const pdfGenerationRequestSchema = z.object({
  reportId: z.string().uuid(),
  includeCharts: z.boolean().default(false),
  confidential: z.boolean().default(true),
  watermark: z.string().optional(),
});

// Export types
export type ExecutiveReportView = z.infer<typeof executiveReportViewSchema>;
export type HostSummaryView = z.infer<typeof hostSummaryViewSchema>;
export type VulnerabilityDetailView = z.infer<typeof vulnerabilityDetailViewSchema>;
export type RiskModel = z.infer<typeof riskModelSchema>;
export type ExecutiveReportSummary = z.infer<typeof executiveReportSummarySchema>;
export type PdfGenerationRequest = z.infer<typeof pdfGenerationRequestSchema>;

// Risk Model Data (Static)
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

// Methodology Content (Static)
export const METHODOLOGY_CONTENT = [
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
