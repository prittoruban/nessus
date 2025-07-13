import { NextRequest, NextResponse } from "next/server";
import { ReportService } from "@/lib/services/report.service";
import { handleApiError } from "@/lib/errors/errorHandler";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const service = new ReportService();
    const result = await service.getReports(queryParams);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
