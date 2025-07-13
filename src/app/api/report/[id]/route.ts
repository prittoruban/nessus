import { NextRequest, NextResponse } from "next/server";
import { ReportService } from "@/lib/services/report.service";
import { handleApiError } from "@/lib/errors/errorHandler";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const service = new ReportService();
    const result = await service.getReportById(params.id);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const service = new ReportService();
    await service.deleteReport(params.id);

    return NextResponse.json({ message: "Report deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}