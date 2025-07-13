import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

// Create Supabase client with centralized config
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Helper function to check connection
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from("vulnerabilities")
      .select("count", { count: "exact", head: true });

    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }

    return { success: true, count: data?.length || 0 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
