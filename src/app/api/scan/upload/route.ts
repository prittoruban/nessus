import { NextRequest, NextResponse } from "next/server";
import { ReportService } from "@/lib/services/report.service";
import { handleApiError } from "@/lib/errors/errorHandler";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    // Use the new report service for upload
    const service = new ReportService();
    const result = await service.processUpload(
      file,
      `Nessus Scan - ${new Date().toLocaleDateString()}`,
      `Uploaded via legacy API from ${file.name}`
    );

    // Return response compatible with existing frontend
    return NextResponse.json({
      message: "Upload successful",
      inserted: result.inserted,
      reportId: result.reportId,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
