import { NextRequest, NextResponse } from "next/server";
import { ReportService } from "@/lib/services/report.service";
import { handleApiError } from "@/lib/errors/errorHandler";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const reportName = formData.get("reportName") as string;
    const reportDescription = formData.get("reportDescription") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const service = new ReportService();
    const result = await service.processUpload(
      file,
      reportName || `Nessus Scan - ${new Date().toLocaleDateString()}`,
      reportDescription || `Uploaded from ${file.name}`
    );

    return NextResponse.json({
      success: true,
      message: "Upload successful",
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
