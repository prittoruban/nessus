import { databaseClient } from "../database/client";
import { Report, CreateReport, ReportQuery } from "../validators/report.schema";
import { DatabaseError, NotFoundError } from "../errors/AppError";

/**
 * Repository for report data access
 */
export class ReportRepository {
  private client = databaseClient.getClient();

  /**
   * Create a new report
   */
  async create(report: CreateReport): Promise<Report> {
    try {
      const { data, error } = await this.client
        .from("reports")
        .insert(report)
        .select()
        .single();

      if (error) {
        throw new DatabaseError(error.message);
      }

      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to create report: ${error}`);
    }
  }

  /**
   * Get all reports with pagination and filtering
   */
  async findMany(query: ReportQuery): Promise<{
    data: Report[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      let supabaseQuery = this.client
        .from("reports")
        .select("*", { count: "exact" });

      // Apply status filter
      if (query.status !== "all") {
        supabaseQuery = supabaseQuery.eq("status", query.status);
      }

      // Apply search filter
      if (query.search) {
        supabaseQuery = supabaseQuery.or(
          `name.ilike.%${query.search}%,file_name.ilike.%${query.search}%,description.ilike.%${query.search}%`
        );
      }

      // Apply sorting
      supabaseQuery = supabaseQuery.order(query.sort, { ascending: query.order === "asc" });

      // Apply pagination
      const from = (query.page - 1) * query.limit;
      const to = from + query.limit - 1;
      supabaseQuery = supabaseQuery.range(from, to);

      const { data, error, count } = await supabaseQuery;

      if (error) {
        throw new DatabaseError(error.message);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / query.limit);

      return {
        data: data || [],
        total,
        page: query.page,
        totalPages,
      };
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to fetch reports: ${error}`);
    }
  }

  /**
   * Get report by ID
   */
  async findById(id: string): Promise<Report> {
    try {
      const { data, error } = await this.client
        .from("reports")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new NotFoundError("Report", id);
        }
        throw new DatabaseError(error.message);
      }

      return data;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to fetch report: ${error}`);
    }
  }

  /**
   * Get the next iteration number for a given organization and source type
   */
  async getNextIteration(orgName: string, sourceType: "internal" | "external"): Promise<number> {
    try {
      const { data, error } = await this.client
        .from("reports")
        .select("iteration")
        .eq("org_name", orgName)
        .eq("source_type", sourceType)
        .order("iteration", { ascending: false })
        .limit(1);

      if (error) {
        throw new DatabaseError(error.message);
      }

      // If no reports exist for this org/source type, start with iteration 1
      if (!data || data.length === 0) {
        return 1;
      }

      // Return the next iteration number
      return (data[0].iteration || 0) + 1;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to get next iteration: ${error}`);
    }
  }

  /**
   * Update report status and metadata
   */
  async updateStatus(id: string, status: "processing" | "completed" | "failed", processedDate?: Date): Promise<Report> {
    try {
      const updateData: Partial<Report> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (processedDate) {
        updateData.processed_date = processedDate.toISOString();
      }

      const { data, error } = await this.client
        .from("reports")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new DatabaseError(error.message);
      }

      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to update report status: ${error}`);
    }
  }

  /**
   * Delete report and all associated vulnerabilities
   */
  async deleteById(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from("reports")
        .delete()
        .eq("id", id);

      if (error) {
        throw new DatabaseError(error.message);
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to delete report: ${error}`);
    }
  }

  /**
   * Get report statistics
   */
  async getStats(): Promise<{
    total: number;
    processing: number;
    completed: number;
    failed: number;
    totalVulnerabilities: number;
  }> {
    try {
      const { data, error } = await this.client
        .from("reports")
        .select("status, total_vulnerabilities");

      if (error) {
        throw new DatabaseError(error.message);
      }

      const stats = {
        total: data?.length || 0,
        processing: 0,
        completed: 0,
        failed: 0,
        totalVulnerabilities: 0,
      };

      data?.forEach((report) => {
        if (report.status in stats) {
          stats[report.status as keyof typeof stats]++;
        }
        stats.totalVulnerabilities += report.total_vulnerabilities || 0;
      });

      return stats;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to fetch report statistics: ${error}`);
    }
  }
}
