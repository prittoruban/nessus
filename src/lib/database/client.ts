import { createClient } from "@supabase/supabase-js";
import { config } from "../config";

/**
 * Database client wrapper with enhanced error handling and connection management
 */
class DatabaseClient {
  private static instance: DatabaseClient;
  private client;

  private constructor() {
    this.client = createClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
        db: {
          schema: 'public'
        }
      }
    );
  }

  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  public getClient() {
    return this.client;
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.client
        .from("vulnerabilities")
        .select("count", { count: "exact", head: true });

      if (error) {
        throw new Error(`Database connection failed: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Execute a query with error handling
   */
  public async executeQuery<T>(
    queryFn: (client: typeof this.client) => Promise<{ data: T | null; error: unknown }>
  ): Promise<{ data: T | null; error: string | null }> {
    try {
      const result = await queryFn(this.client);
      
      if (result.error) {
        return { data: null, error: String(result.error) };
      }
      
      return { data: result.data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown database error"
      };
    }
  }
}

export const databaseClient = DatabaseClient.getInstance();
export const supabase = databaseClient.getClient(); // Backward compatibility
