import { NextRequest, NextResponse } from "next/server";
import { ExecutiveReportRepository } from "@/lib/repositories/executive-report.repository";
import { handleApiError } from "@/lib/errors/errorHandler";

/**
 * GET /api/reports/[id]/executive
 * Get complete executive report data for a specific report
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repository = new ExecutiveReportRepository();
    
    // Get complete executive report data
    const executiveReportData = await repository.getCompleteExecutiveReport(id);

    return NextResponse.json({
      success: true,
      data: executiveReportData
    });
  } catch (error) {
    return handleApiError(error);
  }
}
