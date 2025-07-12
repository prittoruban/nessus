import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Vulnerability } from "@/types/vulnerability";
import * as csv from "csv-parse/sync";

export async function POST(req: NextRequest) {
  try {
    console.log("API route called");
    
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.log("No file provided");
      return NextResponse.json(
        { error: "CSV file is required" },
        { status: 400 }
      );
    }

    console.log("File received:", file.name, file.size);
    const text = await file.text();
    console.log("File text length:", text.length);

    const records = csv.parse(text, {
      columns: true,
      skip_empty_lines: true,
    }) as Record<string, string>[];

    console.log("Parsed records:", records.length);

    const formatted: Vulnerability[] = records.map((row) => ({
      ip_address: row["IP Address"] || row["IP"] || "",
      cve: row["CVE"] || row["Plugin ID"] || row["Plugin ID"] || "",
      severity: row["Severity"] || row["Risk"] || "medium",
      plugin_name: row["Plugin Name"] || row["Name"] || "",
      description: row["Description"] || row["Synopsis"] || "",
    }));

    console.log("Formatted vulnerabilities:", formatted.length);

    const { data, error } = await supabase
      .from("vulnerabilities")
      .insert(formatted)
      .select();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("Successfully inserted:", data?.length || 0, "records");
    return NextResponse.json({
      message: "Upload successful",
      inserted: data?.length || 0,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
