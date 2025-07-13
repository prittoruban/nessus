import { NextRequest, NextResponse } from "next/server";
import { ReportService } from "@/lib/services/report.service";
import { handleApiError } from "@/lib/errors/errorHandler";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const reportName = formData.get("reportName") as string;
    const reportDescription = formData.get("reportDescription") as string;

    const service = new ReportService();
    const result = await service.processUpload(file, reportName, reportDescription);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
