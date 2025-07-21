import { NextRequest, NextResponse } from "next/server";
import { ExecutiveReportRepository } from "@/lib/repositories/executive-report.repository";
import { ExecutivePDFService } from "@/lib/services/executive-pdf-simple.service";
import { handleApiError } from "@/lib/errors/errorHandler";

/**
 * GET /api/reports/[id]/pdf
 * Generate and download executive report PDF
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
    
    // Generate PDF
    const pdfBuffer = await ExecutivePDFService.generateExecutiveReport(executiveReportData);
    
    // Generate filename
    const filename = ExecutivePDFService.generateFilename(
      executiveReportData.reportData.org_name,
      executiveReportData.reportData.scan_end_date || undefined
    );
    
    // Update PDF generation timestamp
    await repository.updatePdfGeneration(id);
    
    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
