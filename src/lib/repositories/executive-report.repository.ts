import { databaseClient } from "../database/client";
import { 
  ExecutiveReportView, 
  HostSummaryView, 
  VulnerabilityDetailView 
} from "../validators/executive-report.schema";
import { DatabaseError, NotFoundError } from "../errors/AppError";

/**
 * Repository for executive report data access
 * Handles all database operations for generating executive reports
 */
export class ExecutiveReportRepository {
  private client = databaseClient.getClient();

  /**
   * Get executive report data by report ID
   */
  async getExecutiveReportData(reportId: string): Promise<ExecutiveReportView> {
    try {
      const { data, error } = await this.client
        .from("executive_report_view")
        .select("*")
        .eq("id", reportId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new NotFoundError("Executive Report", reportId);
        }
        throw new DatabaseError(error.message);
      }

      return data;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to fetch executive report data: ${error}`);
    }
  }

  /**
   * Get host summary data for the report
   */
  async getHostSummary(reportId: string): Promise<HostSummaryView[]> {
    try {
      const { data, error } = await this.client
        .from("host_summary_view")
        .select("*")
        .eq("report_id", reportId)
        .order("ip_address");

      if (error) {
        throw new DatabaseError(error.message);
      }

      return data || [];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to fetch host summary: ${error}`);
    }
  }

  /**
   * Get vulnerability details for the report
   */
  async getVulnerabilityDetails(reportId: string): Promise<VulnerabilityDetailView[]> {
    try {
      const { data, error } = await this.client
        .from("vulnerability_detail_view")
        .select("*")
        .eq("report_id", reportId)
        .order("serial_number");

      if (error) {
        throw new DatabaseError(error.message);
      }

      return data || [];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to fetch vulnerability details: ${error}`);
    }
  }

  /**
   * Get zero-day vulnerabilities for the report
   */
  async getZeroDayVulnerabilities(reportId: string): Promise<VulnerabilityDetailView[]> {
    try {
      const { data, error } = await this.client
        .from("vulnerability_detail_view")
        .select("*")
        .eq("report_id", reportId)
        .eq("is_zero_day", true)
        .order("serial_number");

      if (error) {
        throw new DatabaseError(error.message);
      }

      return data || [];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to fetch zero-day vulnerabilities: ${error}`);
    }
  }

  /**
   * Get non-zero-day vulnerabilities for the report
   */
  async getNonZeroDayVulnerabilities(reportId: string): Promise<VulnerabilityDetailView[]> {
    try {
      const { data, error } = await this.client
        .from("vulnerability_detail_view")
        .select("*")
        .eq("report_id", reportId)
        .eq("is_zero_day", false)
        .order("serial_number");

      if (error) {
        throw new DatabaseError(error.message);
      }

      return data || [];
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to fetch non-zero-day vulnerabilities: ${error}`);
    }
  }

  /**
   * Get risk-level summary for the report
   */
  async getRiskLevelSummary(reportId: string): Promise<{
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  }> {
    try {
      const { data, error } = await this.client
        .from("reports")
        .select("critical_count, high_count, medium_count, low_count, info_count, total_vulnerabilities")
        .eq("id", reportId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new NotFoundError("Report", reportId);
        }
        throw new DatabaseError(error.message);
      }

      return {
        critical: data.critical_count || 0,
        high: data.high_count || 0,
        medium: data.medium_count || 0,
        low: data.low_count || 0,
        info: data.info_count || 0,
        total: data.total_vulnerabilities || 0,
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to fetch risk level summary: ${error}`);
    }
  }

  /**
   * Get zero-day risk summary for the report
   */
  async getZeroDayRiskSummary(reportId: string): Promise<{
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  }> {
    try {
      const { data, error } = await this.client
        .from("vulnerabilities")
        .select("severity")
        .eq("report_id", reportId)
        .eq("is_zero_day", true);

      if (error) {
        throw new DatabaseError(error.message);
      }

      const summary = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        total: 0,
      };

      data?.forEach((vuln) => {
        if (vuln.severity in summary) {
          summary[vuln.severity as keyof typeof summary]++;
        }
        summary.total++;
      });

      return summary;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to fetch zero-day risk summary: ${error}`);
    }
  }

  /**
   * Update PDF generation timestamp and file path
   */
  async updatePdfGeneration(reportId: string, filePath?: string): Promise<void> {
    try {
      const updateData: {
        pdf_generated_at: string;
        updated_at: string;
        pdf_file_path?: string;
      } = {
        pdf_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (filePath) {
        updateData.pdf_file_path = filePath;
      }

      const { error } = await this.client
        .from("reports")
        .update(updateData)
        .eq("id", reportId);

      if (error) {
        throw new DatabaseError(error.message);
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to update PDF generation info: ${error}`);
    }
  }

  /**
   * Get complete executive report data in one call
   */
  async getCompleteExecutiveReport(reportId: string): Promise<{
    reportData: ExecutiveReportView;
    hostSummary: HostSummaryView[];
    vulnerabilities: VulnerabilityDetailView[];
    zeroDayVulnerabilities: VulnerabilityDetailView[];
    nonZeroDayVulnerabilities: VulnerabilityDetailView[];
    riskSummary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
      total: number;
    };
    zeroDayRiskSummary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
      total: number;
    };
  }> {
    try {
      // Fetch all data concurrently
      const [
        reportData,
        hostSummary,
        vulnerabilities,
        zeroDayVulnerabilities,
        nonZeroDayVulnerabilities,
        riskSummary,
        zeroDayRiskSummary
      ] = await Promise.all([
        this.getExecutiveReportData(reportId),
        this.getHostSummary(reportId),
        this.getVulnerabilityDetails(reportId),
        this.getZeroDayVulnerabilities(reportId),
        this.getNonZeroDayVulnerabilities(reportId),
        this.getRiskLevelSummary(reportId),
        this.getZeroDayRiskSummary(reportId)
      ]);

      return {
        reportData,
        hostSummary,
        vulnerabilities,
        zeroDayVulnerabilities,
        nonZeroDayVulnerabilities,
        riskSummary,
        zeroDayRiskSummary
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to fetch complete executive report: ${error}`);
    }
  }
}
