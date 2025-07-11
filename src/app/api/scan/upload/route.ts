"use server";

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Vulnerability } from "@/types/vulnerability";
import * as csv from "csv-parse/sync";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "CSV file is required" },
        { status: 400 }
      );
    }

    const text = await file.text();

    const records = csv.parse(text, {
      columns: true,
      skip_empty_lines: true,
    }) as Record<string, string>[];

    const formatted: Vulnerability[] = records.map((row) => ({
      ip_address: row["IP Address"],
      cve: row["CVE"] || row["Plugin ID"],
      severity: row["Severity"],
      plugin_name: row["Plugin Name"],
      description: row["Description"],
    }));

    const { data, error } = await supabase
      .from("vulnerabilities")
      .insert(formatted)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Upload successful",
      inserted: data?.length || 0,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
