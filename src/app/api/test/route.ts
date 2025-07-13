import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    console.log("Testing Supabase connection...");

    // Test basic connection
    const { data, error } = await supabase
      .from("vulnerabilities")
      .select("count", { count: "exact", head: true });

    if (error) {
      console.error("Supabase test error:", error);
      return NextResponse.json(
        {
          error: error.message,
          details: "Database connection failed",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Supabase connection successful",
      count: data?.length || 0,
      env: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Missing",
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Missing",
      },
    });
  } catch (err) {
    console.error("Test API error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
        details: "API route failed",
      },
      { status: 500 }
    );
  }
}
