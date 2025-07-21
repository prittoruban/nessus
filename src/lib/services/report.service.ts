import { VulnerabilityRepository } from "../repositories/vulnerability.repository";
import { ReportRepository } from "../repositories/report.repository";
import { 
  createReportSchema,
  reportQuerySchema,
  type CreateReport,
  type Report
} from "../validators/report.schema";
import { 
  createVulnerabilitySchema,
  type CreateVulnerability,
  type CsvRow,
  type Vulnerability
} from "../validators/vulnerability.schema";
import { ValidationError, FileUploadError } from "../errors/AppError";
import { logError } from "../errors/errorHandler";
import * as csv from "csv-parse/sync";

/**
 * Service for report business logic
 */
export class ReportService {
  private reportRepository = new ReportRepository();
  private vulnerabilityRepository = new VulnerabilityRepository();

  /**
   * Truncate string to fit database constraints
   */
  private truncateString(value: string | undefined | null, maxLength: number): string | undefined {
    if (!value) return undefined;
    const str = String(value);
    return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
  }

  /**
   * Process CSV file upload and create report
   */
  async processUpload(
    file: File, 
    reportData?: {
      orgName?: string;
      sourceType?: string;
      reportName?: string;
      reportDescription?: string;
      documentType?: string;
      version?: string;
      assessee?: string;
      assessor?: string;
      reviewer?: string;
      approver?: string;
      conductedBy?: string;
      scanStartDate?: string;
      scanEndDate?: string;
      testLocation?: string;
      toolUsed?: string;
      scanDescription?: string;
      methodology?: string;
      projectScopeNotes?: string;
      conclusion?: string;
      confidentialityLevel?: string;
      legalDisclaimer?: string;
    }
  ): Promise<{
    success: boolean;
    reportId: string;
    inserted: number;
    skipped: number;
    errors: string[];
  }> {
    let reportId: string | null = null;
    
    try {
      // Validate file
      if (!file) {
        throw new FileUploadError("No file provided");
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new FileUploadError("File size exceeds 10MB limit");
      }

      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        throw new FileUploadError("File must be a CSV");
      }

      // Get organization name and source type
      const orgName = this.truncateString(reportData?.orgName || "Default Organization", 255)!;
      const sourceType = (reportData?.sourceType as "internal" | "external") || "internal";
      
      // Get the next iteration number for this organization and source type
      const nextIteration = await this.reportRepository.getNextIteration(orgName, sourceType);

      // Create report record first
      const createReportData: CreateReport = {
        name: reportData?.reportName || `Nessus Scan - ${new Date().toLocaleDateString()}`,
        description: reportData?.reportDescription || `Automated upload from ${file.name}`,
        file_name: file.name,
        file_size: file.size,
        status: "processing",
        org_name: orgName,
        source_type: sourceType,
        iteration: nextIteration,
        document_type: reportData?.documentType || "Vulnerability Assessment Report",
        version: reportData?.version || "1.0",
        assessee: this.truncateString(reportData?.assessee, 255),
        assessor: this.truncateString(reportData?.assessor, 255),
        reviewer: this.truncateString(reportData?.reviewer, 255),
        approver: this.truncateString(reportData?.approver, 255),
        conducted_by: reportData?.conductedBy || undefined,
        scan_start_date: reportData?.scanStartDate || undefined,
        scan_end_date: reportData?.scanEndDate || undefined,
        test_location: reportData?.testLocation || "On-site",
        tool_used: reportData?.toolUsed || "Nessus",
        scan_description: reportData?.scanDescription || "Network Vulnerability Assessment",
        methodology: reportData?.methodology || undefined,
        project_scope_notes: reportData?.projectScopeNotes || undefined,
        conclusion: reportData?.conclusion || undefined,
        confidentiality_level: reportData?.confidentialityLevel || "Internal",
        legal_disclaimer: reportData?.legalDisclaimer || "This document contains confidential and proprietary information.",
      };

      const validatedReportData = createReportSchema.parse(createReportData);
      const report = await this.reportRepository.create(validatedReportData);
      reportId = report.id!;

      // Parse CSV
      const text = await file.text();
      const records = csv.parse(text, {
        columns: true,
        skip_empty_lines: true,
      }) as CsvRow[];

      if (records.length === 0) {
        await this.reportRepository.updateStatus(reportId, "failed");
        throw new FileUploadError("CSV file is empty");
      }

      // Transform and validate data
      const vulnerabilities: CreateVulnerability[] = [];
      const errors: string[] = [];
      let skipped = 0;

      for (let i = 0; i < records.length; i++) {
        try {
          const row = records[i];
          
          // Transform CSV row to vulnerability format
          const vulnerability = this.transformCsvRow(row);
          
          // Add report_id to the vulnerability
          const vulnerabilityWithReportId: CreateVulnerability = {
            ...vulnerability,
            report_id: reportId,
          };
          
          // Validate the transformed data
          const validatedVuln = createVulnerabilitySchema.parse(vulnerabilityWithReportId);
          vulnerabilities.push(validatedVuln);
        } catch (error) {
          skipped++;
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
        }
      }

      // Insert valid vulnerabilities
      let inserted = 0;
      if (vulnerabilities.length > 0 && reportId) {
        const result = await this.vulnerabilityRepository.createMany(vulnerabilities);
        inserted = result.length;
      }

      // Update report status to completed
      await this.reportRepository.updateStatus(reportId, "completed", new Date());

      return {
        success: true,
        reportId,
        inserted,
        skipped,
        errors: errors.slice(0, 10), // Limit error messages
      };
    } catch (error) {
      // If we created a report, mark it as failed
      if (reportId) {
        try {
          await this.reportRepository.updateStatus(reportId, "failed");
        } catch (updateError) {
          logError(updateError, "ReportService.processUpload.updateStatus");
        }
      }

      logError(error, "ReportService.processUpload");
      
      if (error instanceof FileUploadError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new FileUploadError("Failed to process CSV file");
    }
  }

  /**
   * Get all reports with pagination and filtering
   */
  async getReports(queryParams: Record<string, unknown>) {
    try {
      const validatedQuery = reportQuerySchema.parse(queryParams);
      const result = await this.reportRepository.findMany(validatedQuery);
      
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      logError(error, "ReportService.getReports");
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error("Failed to fetch reports");
    }
  }

  /**
   * Get report by ID with vulnerabilities
   */
  async getReportById(id: string): Promise<{
    report: Report;
    vulnerabilities: Vulnerability[];
    stats: {
      total: number;
      high: number;
      medium: number;
      low: number;
      info: number;
    };
  }> {
    try {
      const report = await this.reportRepository.findById(id);
      
      // Get vulnerabilities for this specific report
      const vulnerabilities = await this.vulnerabilityRepository.findMany({
        page: 1,
        limit: 1000,
        severity: "all",
        search: "",
        sort: "created_at",
        order: "desc",
        report_id: id, // Filter by report ID
      });

      // Calculate stats
      const stats = {
        total: vulnerabilities.data.length,
        high: vulnerabilities.data.filter((v: Vulnerability) => v.severity === 'high').length,
        medium: vulnerabilities.data.filter((v: Vulnerability) => v.severity === 'medium').length,
        low: vulnerabilities.data.filter((v: Vulnerability) => v.severity === 'low').length,
        info: vulnerabilities.data.filter((v: Vulnerability) => v.severity === 'info').length,
      };

      return {
        report,
        vulnerabilities: vulnerabilities.data,
        stats,
      };
    } catch (error) {
      logError(error, "ReportService.getReportById");
      throw error;
    }
  }

  /**
   * Delete report and all associated vulnerabilities
   */
  async deleteReport(id: string): Promise<void> {
    try {
      await this.reportRepository.deleteById(id);
    } catch (error) {
      logError(error, "ReportService.deleteReport");
      throw error;
    }
  }

  /**
   * Get report statistics
   */
  async getReportStats() {
    try {
      const stats = await this.reportRepository.getStats();
      return {
        success: true,
        stats,
      };
    } catch (error) {
      logError(error, "ReportService.getReportStats");
      throw new Error("Failed to fetch report statistics");
    }
  }

  /**
   * Transform CSV row to vulnerability format
   */
  private transformCsvRow(row: CsvRow): Omit<CreateVulnerability, 'report_id'> {
    // Handle CVE field
    const cveValue = row["CVE"]?.trim() || "";
    const cve = cveValue && cveValue !== "" ? cveValue : null;
    
    // Handle CVSS Score
    const cvssValue = row["CVSS"]?.trim() || "";
    const cvss_score = cvssValue ? parseFloat(cvssValue) : null;
    
    // Handle Plugin ID
    const plugin_id = row["Plugin ID"]?.toString().trim() || "";
    
    // Handle IP address/Host
    const host = (row["Host"] || row["IP"] || "").toString().trim();
    
    // Handle Port
    const portValue = row["Port"]?.toString().trim() || "";
    const port = portValue && !isNaN(Number(portValue)) ? Number(portValue) : null;
    
    return {
      plugin_id: this.truncateString(plugin_id || "unknown", 50)!,
      cve: this.truncateString(cve, 50),
      cvss_score: cvss_score,
      ip_address: host || "Unknown",
      protocol: this.normalizeProtocol(row["Protocol"]?.toString()),
      port: port,
      vuln_name: row["Name"]?.toString() || "Unknown Vulnerability",
      synopsis: row["Synopsis"]?.toString() || null,
      description: row["Description"]?.toString() || null,
      solution: row["Solution"]?.toString() || null,
      severity: this.normalizeSeverity(row["Risk"] || "medium"),
    };
  }

  /**
   * Normalize protocol values to match database constraints
   */
  private normalizeProtocol(protocol: string | undefined | null): string | null {
    if (!protocol) return null;
    const normalized = protocol.toString().toUpperCase().trim();
    
    if (["TCP"].includes(normalized)) return "TCP";
    if (["UDP"].includes(normalized)) return "UDP";
    
    // Default to null for unknown protocols instead of causing constraint violation
    return null;
  }

  /**
   * Normalize severity values from different formats
   */
  private normalizeSeverity(severity: string): "critical" | "high" | "medium" | "low" | "info" {
    const normalized = severity.toLowerCase().trim();
    
    if (["critical"].includes(normalized)) return "critical";
    if (["high"].includes(normalized)) return "high";
    if (["medium", "moderate"].includes(normalized)) return "medium";
    if (["low", "minor"].includes(normalized)) return "low";
    if (["info", "informational", "none"].includes(normalized)) return "info";
    
    return "medium"; // Default fallback
  }
}
