import { NextRequest, NextResponse } from 'next/server';
import { ExecutiveReportService } from '@/lib/services/executive-report.service';
import { ExecutivePDFService } from '@/lib/services/executive-pdf.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reportId = params.id;

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // Fetch report data
    const executiveReportService = new ExecutiveReportService();
    const reportData = await executiveReportService.getExecutiveReportData(reportId);

    if (!reportData) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Transform data for PDF service
    const pdfData = {
      reportData: {
        id: reportData.report.id,
        org_name: reportData.report.org_name,
        report_name: reportData.report.name,
        version: reportData.report.version,
        document_type: reportData.report.document_type,
        scan_start_date: reportData.report.scan_start_date || null,
        scan_end_date: reportData.report.scan_end_date || null,
        assessee: reportData.report.assessee || null,
        assessor: reportData.report.assessor || null,
        reviewer: reportData.report.reviewer || null,
        approver: reportData.report.approver || null,
        created_by: reportData.report.created_by || null,
        test_location: reportData.report.test_location,
        tool_used: reportData.report.tool_used,
        scan_description: reportData.report.scan_description,
        number_of_ips: reportData.hosts.length,
        total_vulnerabilities: reportData.vulnerabilityStats.total,
        critical_count: reportData.vulnerabilityStats.critical,
        high_count: reportData.vulnerabilityStats.high,
        medium_count: reportData.vulnerabilityStats.medium,
        low_count: reportData.vulnerabilityStats.low,
        info_count: reportData.vulnerabilityStats.info,
        zero_day_count: reportData.zeroDayVulnerabilities.length,
        methodology: reportData.report.methodology || null,
        project_scope_notes: reportData.report.project_scope_notes || null,
        conclusion: reportData.report.conclusion || null,
        confidentiality_level: reportData.report.confidentiality_level,
        legal_disclaimer: reportData.report.legal_disclaimer,
        created_at: reportData.report.created_at,
        scan_duration_days: reportData.report.scan_start_date && reportData.report.scan_end_date 
          ? Math.ceil((new Date(reportData.report.scan_end_date).getTime() - new Date(reportData.report.scan_start_date).getTime()) / (1000 * 60 * 60 * 24))
          : 1,
        formatted_start_date: reportData.report.scan_start_date 
          ? executiveReportService.formatDate(reportData.report.scan_start_date)
          : null,
        formatted_end_date: reportData.report.scan_end_date 
          ? executiveReportService.formatDate(reportData.report.scan_end_date)
          : null,
        report_month_year: reportData.report.scan_end_date 
          ? new Date(reportData.report.scan_end_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      },
      hostSummary: reportData.hostSummaries.map((host, index) => ({
        report_id: reportData.report.id,
        ip_address: host.ip_address,
        hostname: host.hostname || null,
        status: 'Completed',
        critical_count: host.critical,
        high_count: host.high,
        medium_count: host.medium,
        low_count: host.low,
        info_count: 0, // Assuming info is not tracked separately in current schema
        total_count: host.total,
        zero_day_count: 0, // This would need to be calculated per host if needed
        host_number: index + 1
      })),
      vulnerabilities: reportData.vulnerabilities.map((vuln, index) => ({
        report_id: reportData.report.id,
        ip_address: vuln.ip_address,
        cve: vuln.cve,
        severity: vuln.severity,
        cvss_score: vuln.cvss_score,
        vuln_name: vuln.vuln_name || null,
        solution: (vuln.solution || executiveReportService.generateRecommendedFix(vuln)) || null,
        is_zero_day: vuln.is_zero_day,
        description: vuln.description,
        synopsis: vuln.synopsis || null,
        port: vuln.port,
        protocol: vuln.protocol || null,
        service_name: vuln.service_name || null,
        risk_priority: (vuln.risk_priority as "P1" | "P2" | "P3" | "P4" | "P5") || 'P3',
        display_cve: vuln.cve || 'N/A',
        serial_number: index + 1
      })),
      zeroDayVulnerabilities: reportData.zeroDayVulnerabilities.map((vuln, index) => ({
        report_id: reportData.report.id,
        ip_address: vuln.ip_address,
        cve: vuln.cve,
        severity: vuln.severity,
        cvss_score: vuln.cvss_score,
        vuln_name: vuln.vuln_name || null,
        solution: (vuln.solution || executiveReportService.generateRecommendedFix(vuln)) || null,
        is_zero_day: vuln.is_zero_day,
        description: vuln.description,
        synopsis: vuln.synopsis || null,
        port: vuln.port,
        protocol: vuln.protocol || null,
        service_name: vuln.service_name || null,
        risk_priority: (vuln.risk_priority as "P1" | "P2" | "P3" | "P4" | "P5") || 'P1',
        display_cve: vuln.cve || 'N/A',
        serial_number: index + 1
      })),
      nonZeroDayVulnerabilities: reportData.vulnerabilities
        .filter(vuln => !vuln.is_zero_day)
        .map((vuln, index) => ({
          report_id: reportData.report.id,
          ip_address: vuln.ip_address,
          cve: vuln.cve,
          severity: vuln.severity,
          cvss_score: vuln.cvss_score,
          vuln_name: vuln.vuln_name || null,
          solution: (vuln.solution || executiveReportService.generateRecommendedFix(vuln)) || null,
          is_zero_day: vuln.is_zero_day,
          description: vuln.description,
          synopsis: vuln.synopsis || null,
          port: vuln.port,
          protocol: vuln.protocol || null,
          service_name: vuln.service_name || null,
          risk_priority: (vuln.risk_priority as "P1" | "P2" | "P3" | "P4" | "P5") || 'P3',
          display_cve: vuln.cve || 'N/A',
          serial_number: index + 1
        })),
      riskSummary: {
        critical: reportData.vulnerabilityStats.critical,
        high: reportData.vulnerabilityStats.high,
        medium: reportData.vulnerabilityStats.medium,
        low: reportData.vulnerabilityStats.low,
        info: reportData.vulnerabilityStats.info,
        total: reportData.vulnerabilityStats.total
      },
      zeroDayRiskSummary: {
        critical: reportData.zeroDayVulnerabilities.filter(v => v.severity === 'critical').length,
        high: reportData.zeroDayVulnerabilities.filter(v => v.severity === 'high').length,
        medium: reportData.zeroDayVulnerabilities.filter(v => v.severity === 'medium').length,
        low: reportData.zeroDayVulnerabilities.filter(v => v.severity === 'low').length,
        info: reportData.zeroDayVulnerabilities.filter(v => v.severity === 'info').length,
        total: reportData.zeroDayVulnerabilities.length
      }
    };

    // Generate PDF
    const pdfService = new ExecutivePDFService();
    const pdfArrayBuffer = await pdfService.generateExecutiveReport(pdfData);
    
    // Convert ArrayBuffer to Buffer for Next.js response
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    // Generate filename
    const filename = executiveReportService.generatePDFFilename(reportData.report);

    // Return PDF response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
