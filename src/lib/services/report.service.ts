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
   * Process CSV file upload and create report
   */
  async processUpload(file: File, reportName?: string, reportDescription?: string): Promise<{
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

      // Create report record first
      const reportData: CreateReport = {
        name: reportName || `Nessus Scan - ${new Date().toLocaleDateString()}`,
        description: reportDescription || `Automated upload from ${file.name}`,
        file_name: file.name,
        file_size: file.size,
        status: "processing",
      };

      const validatedReportData = createReportSchema.parse(reportData);
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
          
          // Validate the transformed data
          const validatedVuln = createVulnerabilitySchema.parse(vulnerability);
          vulnerabilities.push(validatedVuln);
        } catch (error) {
          skipped++;
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
        }
      }

      // Insert valid vulnerabilities with report ID
      let inserted = 0;
      if (vulnerabilities.length > 0 && reportId) {
        // Add report_id to each vulnerability
        const vulnerabilitiesWithReportId = vulnerabilities.map(vuln => ({
          ...vuln,
          report_id: reportId, // reportId is guaranteed to be string here
        }));

        const result = await this.vulnerabilityRepository.createMany(vulnerabilitiesWithReportId);
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
  private transformCsvRow(row: CsvRow): CreateVulnerability {
    return {
      ip_address: row["IP Address"] || row["IP"] || "",
      cve: row["CVE"] || row["Plugin ID"] || "",
      severity: this.normalizeSeverity(row["Severity"] || row["Risk"] || "medium"),
      plugin_name: row["Plugin Name"] || row["Name"] || "",
      description: row["Description"] || row["Synopsis"] || "",
    };
  }

  /**
   * Normalize severity values from different formats
   */
  private normalizeSeverity(severity: string): "high" | "medium" | "low" | "info" {
    const normalized = severity.toLowerCase().trim();
    
    if (["critical", "high"].includes(normalized)) return "high";
    if (["medium", "moderate"].includes(normalized)) return "medium";
    if (["low", "minor"].includes(normalized)) return "low";
    if (["info", "informational", "none"].includes(normalized)) return "info";
    
    return "medium"; // Default fallback
  }
}
