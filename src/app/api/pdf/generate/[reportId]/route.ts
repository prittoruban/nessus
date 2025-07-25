import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

// Types
interface ReportData {
  id: string;
  org_name: string;
  source_type: string;
  scan_start_date: string;
  scan_end_date: string;
  test_performed_at: string;
  version: string;
  document_type: string;
  assessee: string | null;
  assessor: string | null;
  reviewer: string | null;
  approver: string | null;
  total_ips_tested: number;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  zero_day_count: number;
}

// Helper function to convert image to base64
function getImageAsBase64(imagePath: string): string {
  try {
    const fullPath = path.join(process.cwd(), "public", imagePath);
    const imageBuffer = fs.readFileSync(fullPath);
    const base64 = imageBuffer.toString("base64");
    const extension = path.extname(imagePath).toLowerCase();
    const mimeType = extension === ".png" ? "image/png" : "image/jpeg";
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Error loading image ${imagePath}:`, error);
    return "";
  }
}

interface HostData {
  id: string;
  ip_address: string;
  hostname: string | null;
  scan_status: string;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  total_vulnerabilities: number;
}

interface VulnerabilityData {
  id: string;
  cve_id: string | null;
  vulnerability_name: string;
  severity: string;
  host_ip: string;
  fix_recommendation: string | null;
  solution: string | null;
  is_zero_day: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    const supabase = createServerSupabase();

    // Fetch report data
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Fetch hosts
    const { data: hosts } = await supabase
      .from("report_hosts")
      .select("*")
      .eq("report_id", reportId)
      .order("ip_address");

    // Fetch vulnerabilities
    const { data: vulnerabilities } = await supabase
      .from("vulnerabilities")
      .select("*")
      .eq("report_id", reportId)
      .order("host_ip", { ascending: true });

    // Sort vulnerabilities by severity priority: critical, high, medium, low, info
    const sortedVulnerabilities = vulnerabilities?.sort((a, b) => {
      const severityOrder = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4, 'informational': 5 }
      const aOrder = severityOrder[a.severity as keyof typeof severityOrder] || 6
      const bOrder = severityOrder[b.severity as keyof typeof severityOrder] || 6
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }
      
      // If same severity, sort by host IP
      return a.host_ip.localeCompare(b.host_ip)
    }) || []

    const zeroDayVulns = sortedVulnerabilities?.filter((v) => v.is_zero_day) || [];

    // Generate HTML content
    const htmlContent = generateEnhancedReportHTML(
      report,
      hosts || [],
      sortedVulnerabilities || [],
      zeroDayVulns
    );

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: {
        top: "15mm",
        right: "15mm",
        bottom: "15mm",
        left: "15mm",
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div class="header-template" style="font-size: 9pt; text-align: center; width: 100%; color: white; font-family: 'Segoe UI', sans-serif; padding: 8pt 0; background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); border-bottom: 2px solid #ffc107;">
          <strong style="font-weight: 700;">${report.org_name}</strong> - ${
        report.source_type === "internal" ? "Internal" : "External"
      } Vulnerability Assessment Report | <span style="color: #ffeb3b; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">CONFIDENTIAL</span>
        </div>
      `,
      footerTemplate: `
        <div class="footer-template" style="font-size: 9pt; text-align: center; width: 100%; color: white; font-family: 'Segoe UI', sans-serif; padding: 8pt 0; background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); border-top: 2px solid #1976d2;">
          <span style="color: #64b5f6; font-weight: 700;">HTC Global Services</span> | Page <span class="pageNumber" style="font-weight: 700;"></span> of <span class="totalPages" style="font-weight: 700;"></span> | <span style="font-style: italic; color: #90a4ae;">Generated on ${new Date().toLocaleDateString(
            "en-GB",
            { day: "numeric", month: "long", year: "numeric" }
          )}</span>
        </div>
      `,
      preferCSSPageSize: true,
      scale: 0.98,
    });

    await browser.close();

    // Set response headers
    const date = new Date();
    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();
    const filename = `${report.org_name.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_VA_Report_${month}_${year}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate PDF", 
        details: error instanceof Error ? error.message : "Unknown error occurred" 
      },
      { status: 500 }
    );
  }
}

function generateEnhancedReportHTML(
  report: ReportData,
  hosts: HostData[],
  vulnerabilities: VulnerabilityData[],
  zeroDayVulns: VulnerabilityData[]
): string {
  const startDate = new Date(report.scan_start_date);
  const endDate = new Date(report.scan_end_date);

  // Convert images to base64
  const htcLogoBase64 = getImageAsBase64("HTC.png");
  const methodologyImageBase64 = getImageAsBase64("Methodology.png");

  const riskModel = [
    {
      priority: "P1",
      severity: "Critical",
      cvss: "9.0-10.0",
      description:
        "The exposure may be exploited resulting in bad outcomes such as unauthorized privilege escalation, data access, downtime, or compromise of data.",
    },
    {
      priority: "P2",
      severity: "High",
      cvss: "7.0-8.9",
      description:
        "These issues identify conditions that could directly result in the compromise or unauthorized access of a network, system, application, or sensitive information.",
    },
    {
      priority: "P3",
      severity: "Medium",
      cvss: "4.0-6.9",
      description:
        "These issues identify conditions that do not immediately or directly result in the compromise or unauthorized access of a network, system, application, or sensitive information, but do provide a capability or information that could in combination with others' capabilities or information result in the compromise unauthorized access of a network application or information.",
    },
    {
      priority: "P4",
      severity: "Low",
      cvss: "0.1-3.9",
      description:
        "These issues identify conditions that do not immediately or directly result in the compromise of a network, system, application, or information but do provide information that could be used in combination with other's information access to a network system, application, or information.",
    },
    {
      priority: "P5",
      severity: "Informational",
      cvss: "0",
      description:
        "Issues that leaking very basic information which might lead to information disclosure",
    },
  ];

  const methodologySteps = [
    {
      title: "Determine Assets",
      description: `The first step in vulnerability assessment is to check the assets shared by ${report.org_name} and understand the scope. Based on the identified scope list out the assets which are included in the scope.`,
    },
    {
      title: "Check Reachability and confirm",
      description:
        "Once the scope is confirmed as per the first step, proceed to check the connectivity. The connectivity and reachability to the in-scope assets are controlled by VLANS and or other restrictions like Firewall Rules. Once the reachability is validated, it is confirmed that all the required network permissions are in place to carry out the vulnerability assessment.",
    },
    {
      title: "Inform Start of Activity",
      description: `Inform the start of the activity to the designated single point of contact and get confirmation to start the activity and the defined VA window. This is a critical step since networks are dynamic in nature and there may be last-minute changes. Confirmation from the ${report.org_name} single-point of contact is essential to start the activity. On confirmation, Check the readiness of the tools and start the vulnerability assessment tools to the in-scope assets to identify security flaws and weaknesses from the tools.`,
    },
    {
      title: "Consolidate and validate the results",
      description:
        "The next step is to work with the collected data from the tool. Export the data in a preferred format and start analyzing the results. Check the results with the CVE ratings and other standard ratings. Check the identified CPEs with the listed CVSS and CPE from NVD and other standard locations. Identify the source as well as the root cause of the security weaknesses based on the CPE (Products and Listed Applications). Validate the suggested Remediation steps against the CVE portal and other vendor-shared solutions.",
    },
    {
      title: "Reclassify Results",
      description:
        "Customers generally follow their internal Risk classifications. It varies from company to company and is dependent on the organization-specific Risk models. Hence reclassify the findings against shared Risk ratings by the customer.",
    },
    {
      title: "Report Creation and Quality Check",
      description:
        "The next phase in the vulnerability assessment is to report the vulnerabilities identified in the specified templates. Ensure to capture essential data and version information as applicable. Validate the data in the document against the data identified by the tool.",
    },
    {
      title: "Share Report",
      description: `Once all the above steps are completed, share the report to ${report.org_name} in a secure manner. Preferably walk the HTC through the report to ensure clear understanding of the observations. Ensure that the results are in a pdf document which is password protected. Prevent copying or data extraction as applicable. Share the password through a secondary channel to the single point contact.`,
    },
  ];

  const getSeverityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "severity-critical";
      case "high":
        return "severity-high";
      case "medium":
        return "severity-medium";
      case "low":
        return "severity-low";
      default:
        return "severity-info";
    }
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${report.org_name} - Vulnerability Assessment Report</title>
      <style>
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        
        @page {
          size: A4;
          margin: 20mm 15mm;
        }
        
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #2c3e50; 
          font-size: 12px;
          background-color: #ffffff;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }
        
        .page-break {
          page-break-before: always;
          padding-top: 0;
        }
        
        .no-break {
          page-break-inside: avoid;
        }
        
        /* Cover Page Styles */
        .cover-page { 
          height: 100vh; 
          display: flex; 
          flex-direction: column; 
          justify-content: space-between; 
          text-align: center;
          page-break-after: always;
          padding: 30px 20px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }
        
        .cover-title { 
          font-size: 22px; 
          font-weight: 700; 
          color: #1976d2; 
          margin-bottom: 25px;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        
        .org-name {
          font-size: 28px;
          font-weight: 800;
          color: #2c3e50;
          margin: 25px 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .scan-dates {
          font-size: 14px;
          margin: 20px 0;
          color: #5d6d7e;
          font-weight: 500;
          line-height: 1.8;
        }
        
        .company-info {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          padding: 25px;
          border-radius: 8px;
          margin: 25px 0;
          text-align: left;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          border: 1px solid #e9ecef;
        }
        
        .company-header {
          font-size: 16px;
          font-weight: 700;
          color: #1976d2;
          margin-bottom: 15px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .company-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          font-size: 11px;
          line-height: 1.6;
          color: #34495e;
        }
        
        .htc-logo {
          text-align: center;
          margin: 25px 0;
          padding: 15px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .htc-logo img {
          max-width: 180px;
          max-height: 70px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }
        
        .doc-control-table {
          margin: 25px 0;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .doc-control-table table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .doc-control-table th,
        .doc-control-table td {
          border: 1px solid #dee2e6;
          padding: 12px 15px;
          text-align: left;
          font-size: 10px;
          vertical-align: middle;
        }
        
        .doc-control-table th {
          background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
          color: white;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .doc-control-table td {
          background: #ffffff;
          color: #2c3e50;
          font-weight: 500;
        }
        
        .disclaimers {
          font-size: 10px;
          color: #5d6d7e;
          font-style: italic;
          line-height: 1.6;
        }
        
        .disclaimer-box {
          background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
          border: 1px solid #ffc107;
          padding: 15px;
          margin: 12px 0;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(255,193,7,0.2);
        }
        
        /* Content Styles */
        h1 { 
          font-size: 20px; 
          font-weight: 700; 
          color: #1976d2; 
          margin: 25px 0 20px 0;
          border-bottom: 3px solid #1976d2;
          padding-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          position: relative;
        }
        
        h1::after {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 0;
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, #ffc107, #ff9800);
        }
        
        h2 { 
          font-size: 16px; 
          font-weight: 600; 
          color: #2c3e50; 
          margin: 20px 0 15px 0;
          padding-left: 10px;
          border-left: 4px solid #1976d2;
        }
        
        h3 { 
          font-size: 14px; 
          font-weight: 600; 
          color: #34495e; 
          margin: 15px 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        p { 
          margin-bottom: 15px; 
          text-align: justify;
          line-height: 1.7;
          color: #2c3e50;
          font-weight: 400;
        }
        
        /* Table Styles */
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0; 
          font-size: 10px;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border-radius: 6px;
          overflow: hidden;
        }
        
        th, td { 
          padding: 10px 12px; 
          text-align: left; 
          border: 1px solid #dee2e6;
          vertical-align: top;
          word-wrap: break-word;
          line-height: 1.5;
        }
        
        th { 
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
          color: white;
          font-weight: 600; 
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          font-size: 9px;
        }
        
        tbody tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        
        tbody tr:hover {
          background-color: #e3f2fd;
          transition: background-color 0.2s ease;
        }
        
        .total-row { 
          background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important;
          color: white !important;
          font-weight: 700 !important;
        }
        
        .total-row td {
          color: white !important;
          font-weight: 700 !important;
        }
        
        /* Scan Manifest */
        .manifest-section {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 25px;
          border-radius: 8px;
          margin: 20px 0;
          border: 1px solid #dee2e6;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .manifest-table table {
          background: white;
          border-radius: 6px;
          overflow: hidden;
        }
        
        .manifest-table th,
        .manifest-table td {
          padding: 12px 15px;
          font-size: 11px;
          border: 1px solid #dee2e6;
        }
        
        .manifest-table td:first-child {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          font-weight: 600;
          color: #2c3e50;
        }
        
        /* Table of Contents */
        .toc-section {
          page-break-after: always;
          padding: 20px;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .toc-item {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px dotted #bdc3c7;
          font-size: 12px;
          color: #2c3e50;
          transition: background-color 0.2s ease;
        }
        
        .toc-item:hover {
          background-color: #e3f2fd;
          padding-left: 10px;
          padding-right: 10px;
          border-radius: 4px;
        }
        
        .toc-item strong {
          color: #1976d2;
          font-weight: 700;
        }
        
        /* Executive Summary */
        .executive-summary {
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          padding: 25px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 5px solid #1976d2;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .executive-summary p {
          font-size: 12px;
          line-height: 1.8;
          margin-bottom: 18px;
          color: #2c3e50;
        }
        
        /* Methodology */
        .methodology-step { 
          margin-bottom: 25px; 
          padding: 20px; 
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 8px;
          border-left: 4px solid #1976d2;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          position: relative;
        }
        
        .methodology-step::before {
          content: '';
          position: absolute;
          left: -4px;
          top: 0;
          width: 4px;
          height: 30px;
          background: linear-gradient(180deg, #ffc107, #ff9800);
        }
        
        .methodology-title {
          font-weight: 700;
          font-size: 13px;
          color: #1976d2;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .methodology-step p {
          font-size: 11px;
          line-height: 1.7;
          color: #2c3e50;
        }
        
        .methodology-image {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          background: white;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .methodology-image img {
          max-width: 100%;
          max-height: 350px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .methodology-image-caption {
          font-size: 11px;
          color: #5d6d7e;
          margin-top: 12px;
          font-style: italic;
          font-weight: 500;
        }
        
        /* Scope Table */
        .scope-table {
          margin: 20px 0;
        }
        
        .scope-table table {
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .status-completed {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          box-shadow: 0 2px 4px rgba(40,167,69,0.3);
        }
        
        .status-failed {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          box-shadow: 0 2px 4px rgba(220,53,69,0.3);
        }
        
        /* Zero Day Section */
        .zero-day-section { 
          background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
          border: 3px solid #f44336; 
          border-radius: 8px; 
          padding: 25px; 
          margin: 25px 0;
          box-shadow: 0 4px 12px rgba(244,67,54,0.2);
          position: relative;
        }
        
        .zero-day-section::before {
          content: '⚠️';
          position: absolute;
          top: -15px;
          left: 20px;
          background: #f44336;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        
        .zero-day-header {
          color: #d32f2f;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 15px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* Risk Summary Table */
        .risk-summary-table {
          max-width: 400px;
          margin: 20px auto;
          box-shadow: 0 6px 12px rgba(0,0,0,0.1);
          border-radius: 8px;
          overflow: hidden;
        }
        
        /* Vulnerability Chart Styles */
        .vulnerability-chart {
          margin: 30px 0;
          padding: 25px;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-radius: 8px;
          border: 1px solid #dee2e6;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .chart-container {
          max-width: 600px;
          margin: 0 auto;
        }
        
        .chart-bar-row {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          padding: 5px 0;
        }
        
        .chart-label {
          width: 80px;
          margin-right: 15px;
          text-align: right;
        }
        
        .chart-bar-container {
          flex: 1;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          height: 25px;
          position: relative;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .chart-bar {
          transition: width 0.3s ease;
          position: relative;
          height: 100%;
          min-width: 30px;
          border-radius: 4px;
        }
        
        .chart-value {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 11px;
          font-weight: 700;
        }
        
        .severity-badge {
          font-family: 'Segoe UI', sans-serif;
          letter-spacing: 0.3px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
          white-space: nowrap;
        }
        
        /* Conclusion */
        .conclusion-section {
          font-size: 12px;
          line-height: 1.8;
          padding: 20px;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .conclusion-section p {
          margin-bottom: 18px;
          color: #2c3e50;
        }
        
        .highlight-text {
          background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
          color: #856404;
          border: 1px solid #ffeaa7;
        }
        
        .critical-notice {
          background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
          padding: 20px;
          border-radius: 8px;
          border: 2px solid #f44336;
          margin: 20px 0;
          box-shadow: 0 4px 8px rgba(244,67,54,0.2);
        }
        
        .document-end {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 3px solid #1976d2;
          font-weight: 700;
          font-size: 16px;
          color: #1976d2;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        /* Improved spacing and typography */
        .section {
          margin-bottom: 30px;
          padding: 0 10px;
        }
        
        .code-text {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          color: #495057;
          border: 1px solid #dee2e6;
        }
        
        /* Severity badges with enhanced styling */
        .severity-critical {
          background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
          color: white;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 4px rgba(211,47,47,0.3);
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        
        .severity-high {
          background: linear-gradient(135deg, #f57c00 0%, #ef6c00 100%);
          color: white;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 4px rgba(245,124,0,0.3);
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        
        .severity-medium {
          background: linear-gradient(135deg, #fbc02d 0%, #f9a825 100%);
          color: #333;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 4px rgba(251,192,45,0.3);
          text-shadow: 0 1px 2px rgba(255,255,255,0.5);
        }
        
        .severity-low {
          background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
          color: white;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 4px rgba(25,118,210,0.3);
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        
        .severity-info {
          background: linear-gradient(135deg, #757575 0%, #616161 100%);
          color: white;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 4px rgba(117,117,117,0.3);
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        
        /* Column width adjustments for better readability */
        .col-sno { width: 8%; text-align: center; }
        .col-priority { width: 10%; text-align: center; }
        .col-severity { width: 12%; text-align: center; }
        .col-cvss { width: 12%; text-align: center; }
        .col-description { width: 58%; }
        .col-ip { width: 25%; }
        .col-status { width: 15%; text-align: center; }
        .col-host { width: 20%; }
        .col-count { width: 10%; text-align: center; }
        .col-risk { width: 12%; text-align: center; }
        .col-name { width: 35%; }
        .col-solution { width: 45%; }
        .col-cve { width: 12%; text-align: center; }
        
        /* Enhanced number formatting */
        .number-cell {
          font-family: 'Monaco', 'Menlo', monospace;
          font-weight: 700;
          font-size: 11px;
        }
        
        .critical-number { color: #d32f2f; }
        .high-number { color: #f57c00; }
        .medium-number { color: #fbc02d; }
        .low-number { color: #1976d2; }
        
        /* Enhanced header styling */
        .header-template {
          background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
          color: white;
          padding: 8px 0;
          border-bottom: 2px solid #ffc107;
        }
        
        .footer-template {
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
          color: white;
          padding: 8px 0;
          border-top: 2px solid #1976d2;
        }
        
        /* Print optimizations */
        @media print {
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          .no-print { display: none; }
          
          /* Ensure proper page breaks */
          .methodology-step,
          .executive-summary,
          .manifest-section,
          .zero-day-section {
            page-break-inside: avoid;
          }
          
          /* Optimize table printing */
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
        }
        
        /* Responsive adjustments for better PDF rendering */
        @page {
          orphans: 3;
          widows: 3;
        }
        
        /* Enhanced visual hierarchy */
        .priority-1 { border-left: 4px solid #d32f2f; }
        .priority-2 { border-left: 4px solid #f57c00; }
        .priority-3 { border-left: 4px solid #fbc02d; }
        .priority-4 { border-left: 4px solid #1976d2; }
        .priority-5 { border-left: 4px solid #757575; }
        
        /* Professional spacing */
        .content-wrapper {
          max-width: 100%;
          margin: 0 auto;
          padding: 0 10px;
        }
        
        /* Enhanced readability */
        strong {
          font-weight: 700;
          color: #2c3e50;
        }
        
        em {
          font-style: italic;
          color: #5d6d7e;
        }
        
        /* Professional list styling */
        ul, ol {
          margin: 15px 0;
          padding-left: 25px;
        }
        
        li {
          margin-bottom: 8px;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <!-- COVER PAGE -->
      <div class="cover-page">
        <div>
          <div class="cover-title">
            ${
              report.source_type === "internal" ? "Internal" : "External"
            } Vulnerability Assessment Report
          </div>
          
          <div class="org-name">${report.org_name}</div>
          
          <div class="scan-dates">
            VA Conducted on: ${startDate.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })} to ${endDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}
            <br><br>
            <strong>Conducted by</strong>
          </div>
          
          <div class="htc-logo">
            <img src="${htcLogoBase64}" alt="HTC Global Services Logo" />
          </div>
          
          <div class="company-info">
            <div class="company-header">HTC Global Services</div>
            <div class="company-details">
              <div>
                <strong>Unit 25, SDF II, Phase II, MEPZ</strong><br>
                Chennai- 600045. India.<br>
                Phone: (44) 45158888 / 45158800
              </div>
              <div>
                <strong>H.Q 3270 West Big Beaver Road, Troy</strong><br>
                MI 48084<br>
                Phone: (248)7862500
              </div>
            </div>
          </div>
          
          <div class="doc-control-table">
            <table>
              <tr>
                <th style="width: 20%;">Document Type:</th>
                <td style="width: 30%;">${report.document_type}</td>
                <th style="width: 15%;">Version #:</th>
                <td style="width: 35%;">${report.version}</td>
              </tr>
              <tr>
                <th>Assessee:</th>
                <td>${report.assessee || ""}</td>
                <th>Signature:</th>
                <td></td>
              </tr>
              <tr>
                <th>Assessor:</th>
                <td>${report.assessor || ""}</td>
                <th>Signature:</th>
                <td></td>
              </tr>
              <tr>
                <th>Reviewer:</th>
                <td>${report.reviewer || ""}</td>
                <th>Signature:</th>
                <td></td>
              </tr>
              <tr>
                <th>Approved by:</th>
                <td>${report.approver || ""}</td>
                <th>Signature:</th>
                <td></td>
              </tr>
            </table>
          </div>
        </div>
        
        <div class="disclaimers">
          <div class="disclaimer-box">
            <strong>"No part of this document may be reproduced or transmitted in any form or by any means electronic or mechanical including photocopying and recording or by any information storage or retrieval system except as may be expressly permitted."</strong>
          </div>
          <div class="disclaimer-box">
            <strong>"Recipient of this document implicitly consents to this and also in consent with the applicable local privacy law"</strong>
          </div>
        </div>
      </div>

      <!-- SCAN MANIFEST -->
      <div class="page-break">
        <div class="section">
          <h1>Scan Manifest</h1>
          <div class="manifest-section">
            <table class="manifest-table">
              <tr>
                <td style="width: 30%; font-weight: bold;">a. Description</td>
                <td>Network Vulnerability Assessment</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">b. Test started on</td>
                <td>${startDate.toLocaleDateString("en-GB")}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">c. Test Completed on</td>
                <td>${endDate.toLocaleDateString("en-GB")}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">d. No. of IP's tested</td>
                <td>${report.total_ips_tested} IP's</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">e. Test performed at</td>
                <td>${report.test_performed_at}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">f. Tool used for Network testing</td>
                <td>Nessus</td>
              </tr>
            </table>
          </div>
        </div>
      </div>

      <!-- TABLE OF CONTENTS -->
      <div class="page-break">
        <div class="toc-section">
          <h1>Table of Contents</h1>
          <div style="margin-top: 20px;">
            <div class="toc-item">
              <span><strong>1. Executive Summary</strong></span>
              <span><strong>5</strong></span>
            </div>
            <div class="toc-item">
              <span>1.1 Overview</span>
              <span>5</span>
            </div>
            <div class="toc-item">
              <span>1.2 Risk Model</span>
              <span>6</span>
            </div>
            <div class="toc-item">
              <span><strong>2. Vulnerability Assessment Methodology</strong></span>
              <span><strong>7</strong></span>
            </div>
            <div class="toc-item">
              <span>2.1 Methodology</span>
              <span>7</span>
            </div>
            <div class="toc-item">
              <span>2.2 Project Scope</span>
              <span>9</span>
            </div>
            <div class="toc-item">
              <span><strong>3. Summary of Vulnerable Hosts in Network Segments</strong></span>
              <span><strong>10</strong></span>
            </div>
            <div class="toc-item">
              <span><strong>4. Zero Day Vulnerabilities</strong></span>
              <span><strong>11</strong></span>
            </div>
            <div class="toc-item">
              <span><strong>5. Vulnerabilities finding with Remediation</strong></span>
              <span><strong>14</strong></span>
            </div>
            <div class="toc-item">
              <span><strong>6. Conclusion</strong></span>
              <span><strong>27</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- EXECUTIVE SUMMARY -->
      <div class="page-break">
        <div class="section">
          <h1>1. Executive Summary</h1>
          
          <h2>1.1 Overview</h2>
          <div class="executive-summary">
            <p>
              This report provides the <strong>Scan</strong> results of the Vulnerability Assessment conducted on <strong>${
                report.org_name
              }</strong> from HTC Global Services. 
              The objective was to identify Network-level security vulnerabilities that could impact confidentiality, integrity, or availability. 
              The assessment included unauthorized transactions, confidential data access, and a range of vulnerabilities on IP's.
            </p>
            
            <p>
              The findings in this report pertain to the conditions discovered during the testing, and not necessarily the current state. 
              HTC Global Services engaged in this vulnerability assessment to identify risks and provide security enhancement recommendations 
              for ${
                report.source_type
              }-facing IPs. The assessment was conducted on <strong>${startDate.toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "long", year: "numeric" }
  )} to ${endDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}</strong>, 
              with the goal of uncovering vulnerabilities and assessing active exploits.
            </p>
            
            <p>
              In summary, this document outlines the analysis, findings, and recommendations from HTC Global Services for the vulnerabilities, 
              aimed at enhancing the overall security posture of the network infrastructure.
            </p>
          </div>

          <h2>1.2 Risk Model</h2>
          <p>Throughout this document, HTC has categorized the risk ratings for discovered vulnerabilities based on Global Standard risk definitions.</p>
          
          <table>
            <thead>
              <tr>
                <th class="col-priority">Priority Level</th>
                <th class="col-severity">Severity Scale</th>
                <th class="col-cvss">CVSS Score</th>
                <th class="col-description">Description of Vulnerability</th>
              </tr>
            </thead>
            <tbody>
              ${riskModel
                .map(
                  (risk) => `
                <tr>
                  <td class="col-priority priority-${risk.priority.toLowerCase()}" style="font-weight: 700; text-align: center; color: #2c3e50;">${
                    risk.priority
                  }</td>
                  <td class="col-severity" style="text-align: center;"><span class="${getSeverityStyle(
                    risk.severity
                  )}">${risk.severity}</span></td>
                  <td class="col-cvss" style="font-family: 'Monaco', 'Menlo', monospace; text-align: center; font-weight: 700; color: #2c3e50;">${
                    risk.cvss
                  }</td>
                  <td class="col-description" style="line-height: 1.6;">${risk.description}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- METHODOLOGY -->
      <div class="page-break">
        <div class="section">
          <h1>2. Vulnerability Assessment Methodology</h1>
          
          <h2>2.1 Methodology</h2>
          ${methodologySteps
            .slice(0, 4)
            .map(
              (step, index) => `
            <div class="methodology-step">
              <div class="methodology-title">${index + 1}. ${step.title}:</div>
              <p>${step.description}</p>
            </div>
          `
            )
            .join("")}
            
          <div class="methodology-image">
            <img src="${methodologyImageBase64}" alt="Vulnerability Assessment Methodology Flow" />
            <div class="methodology-image-caption">
              Figure 1: Vulnerability Assessment Methodology Flow Chart
            </div>
          </div>
          
          ${methodologySteps
            .slice(4)
            .map(
              (step, index) => `
            <div class="methodology-step">
              <div class="methodology-title">${index + 5}. ${step.title}:</div>
              <p>${step.description}</p>
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <!-- PROJECT SCOPE -->
      <div class="page-break">
        <div class="section">
          <h2>2.2 Project Scope</h2>
          <p>
            Formal communication from the customer outlined the IPs to be tested and the type of testing to be carried out. 
            Based on the received communication a security team was deployed to perform this activity. The assigned team 
            carried out the network vulnerability assessment for the IP's shared by <strong>${
              report.org_name
            }</strong>.
          </p>
          
          <h3>Scope Of IP's</h3>
          <table class="scope-table">
            <thead>
              <tr>
                <th class="col-sno">S No</th>
                <th class="col-ip">IP Address</th>
                <th class="col-status">Status</th>
              </tr>
            </thead>
            <tbody>
              ${hosts
                .map(
                  (host, index) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${
                    index + 1
                  }</td>
                  <td><span class="code-text">${host.ip_address}</span></td>
                  <td style="text-align: center;">
                    <span class="${
                      host.scan_status === "completed"
                        ? "status-completed"
                        : "status-failed"
                    }">
                      ${
                        host.scan_status.charAt(0).toUpperCase() +
                        host.scan_status.slice(1)
                      }
                    </span>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          
          <p style="margin-top: 15px; font-style: italic; color: #666; font-size: 10px;">
            In this testing except Brute force attack, HTC did not attempt any active network-based Denial of Service (DoS), 
            Password cracking, physical, process, and social engineering attacks.
          </p>
        </div>
      </div>

      <!-- SUMMARY OF VULNERABLE HOSTS -->
      <div class="page-break">
        <div class="section">
          <h1>3. Summary of Vulnerable Hosts in Network Segments</h1>
          <table>
            <thead>
              <tr>
                <th class="col-sno">S.No</th>
                <th class="col-host">Host</th>
                <th class="col-count">Critical</th>
                <th class="col-count">High</th>
                <th class="col-count">Medium</th>
                <th class="col-count">Low</th>
                <th class="col-count">Total</th>
              </tr>
            </thead>
            <tbody>
              ${hosts
                .map(
                  (host, index) => `
                <tr class="host-row">
                  <td class="col-sno number-cell" style="text-align: center; font-weight: 700;">${
                    index + 1
                  }</td>
                  <td class="col-host"><span class="code-text">${host.ip_address}</span></td>
                  <td class="col-count number-cell critical-number" style="text-align: center;">${
                    host.critical_count
                  }</td>
                  <td class="col-count number-cell high-number" style="text-align: center;">${
                    host.high_count
                  }</td>
                  <td class="col-count number-cell medium-number" style="text-align: center;">${
                    host.medium_count
                  }</td>
                  <td class="col-count number-cell low-number" style="text-align: center;">${
                    host.low_count
                  }</td>
                  <td class="col-count number-cell" style="text-align: center; font-weight: 700; color: #2c3e50;">${
                    host.total_vulnerabilities
                  }</td>
                </tr>
              `
                )
                .join("")}
              <tr class="total-row">
                <td colspan="2" style="font-weight: 700; text-align: center; font-size: 12px;">TOTAL COUNT</td>
                <td class="number-cell" style="text-align: center;">${
                  report.critical_count
                }</td>
                <td class="number-cell" style="text-align: center;">${
                  report.high_count
                }</td>
                <td class="number-cell" style="text-align: center;">${
                  report.medium_count
                }</td>
                <td class="number-cell" style="text-align: center;">${
                  report.low_count
                }</td>
                <td class="number-cell" style="text-align: center; font-size: 13px;">${
                  report.total_vulnerabilities
                }</td>
              </tr>
            </tbody>
          </table>
          
          <h3>Vulnerabilities count based on Risk Levels</h3>
          <table class="risk-summary-table">
            <thead>
              <tr>
                <th>Risk</th>
                <th style="text-align: center;">Count</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="${getSeverityStyle(
                  "Critical"
                )}">${"Critical"}</td>
                <td class="number-cell critical-number" style="text-align: center; font-size: 14px;">${
                  report.critical_count
                }</td>
              </tr>
              <tr>
                <td class="${getSeverityStyle("High")}">${"High"}</td>
                <td class="number-cell high-number" style="text-align: center; font-size: 14px;">${
                  report.high_count
                }</td>
              </tr>
              <tr>
                <td class="${getSeverityStyle(
                  "Medium"
                )}">${"Medium"}</td>
                <td class="number-cell medium-number" style="text-align: center; font-size: 14px;">${
                  report.medium_count
                }</td>
              </tr>
              <tr>
                <td class="${getSeverityStyle("Low")}">${"Low"}</td>
                <td class="number-cell low-number" style="text-align: center; font-size: 14px;">${
                  report.low_count
                }</td>
              </tr>
              <tr>
                <td class="${getSeverityStyle("Informational")}">${"Informational"}</td>
                <td class="number-cell info-number" style="text-align: center; font-size: 14px;">${
                  report.info_count
                }</td>
              </tr>
              <tr class="total-row">
                <td style="font-weight: 700; font-size: 12px;">GRAND TOTAL</td>
                <td class="number-cell" style="text-align: center; font-size: 16px;">${
                  report.total_vulnerabilities
                }</td>
              </tr>
            </tbody>
          </table>
          
          <div class="vulnerability-chart">
            <h4 style="text-align: center; margin: 25px 0 20px 0; color: #2c3e50; font-size: 14px; font-weight: 600;">Vulnerability Distribution by Severity</h4>
            <div class="chart-container">
              ${[
                { label: "Critical", count: report.critical_count, color: "#d32f2f", maxCount: Math.max(report.critical_count, report.high_count, report.medium_count, report.low_count, report.info_count) },
                { label: "High", count: report.high_count, color: "#f57c00", maxCount: Math.max(report.critical_count, report.high_count, report.medium_count, report.low_count, report.info_count) },
                { label: "Medium", count: report.medium_count, color: "#fbc02d", maxCount: Math.max(report.critical_count, report.high_count, report.medium_count, report.low_count, report.info_count) },
                { label: "Low", count: report.low_count, color: "#1976d2", maxCount: Math.max(report.critical_count, report.high_count, report.medium_count, report.low_count, report.info_count) },
                { label: "Info", count: report.info_count, color: "#757575", maxCount: Math.max(report.critical_count, report.high_count, report.medium_count, report.low_count, report.info_count) }
              ]
                .map(item => {
                  const percentage = item.maxCount > 0 ? (item.count / item.maxCount) * 100 : 0;
                  return `
                <div class="chart-bar-row">
                  <div class="chart-label">
                    <span class="severity-badge" style="background: ${item.color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase;">${item.label}</span>
                  </div>
                  <div class="chart-bar-container">
                    <div class="chart-bar" style="width: ${percentage}%; background: linear-gradient(90deg, ${item.color}, ${item.color}dd); height: 25px; border-radius: 4px; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      <span class="chart-value" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: white; font-weight: 700; font-size: 11px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${item.count}</span>
                    </div>
                  </div>
                </div>
              `;
                })
                .join("")}
            </div>
          </div>
        </div>
      </div>

      <!-- ZERO DAY VULNERABILITIES -->
      ${
        zeroDayVulns.length > 0
          ? `
      <div class="page-break">
        <div class="section">
          <h1>4. Zero Day Vulnerabilities</h1>
          
          <div class="zero-day-section">
            <div class="zero-day-header">Zero Day Vulnerabilities based on Risk Levels</div>
            <table style="max-width: 300px; margin: 0 auto;">
              <thead>
                <tr>
                  <th>Risk</th>
                  <th style="text-align: center;">Count</th>
                </tr>
              </thead>
              <tbody>
                ${["Critical", "High", "Medium", "Low"]
                  .map((severity) => {
                    const count = zeroDayVulns.filter(
                      (v) => v.severity.toLowerCase() === severity.toLowerCase()
                    ).length;
                    return `
                    <tr>
                      <td><span class="${getSeverityStyle(
                        severity
                      )}">${severity}</span></td>
                      <td style="text-align: center; font-weight: bold;">${count}</td>
                    </tr>
                  `;
                  })
                  .join("")}
                <tr class="total-row">
                  <td style="font-weight: bold;">Total</td>
                  <td style="text-align: center; font-weight: bold;">${
                    zeroDayVulns.length
                  }</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>4.1 Zero Day Vulnerabilities finding with Remediation</h3>
          <table>
            <thead>
              <tr>
                <th class="col-sno">S No</th>
                <th class="col-cve">CVE</th>
                <th class="col-risk">Risk</th>
                <th class="col-host">Host</th>
                <th class="col-name">Name</th>
                <th class="col-solution">Solution</th>
              </tr>
            </thead>
            <tbody>
              ${zeroDayVulns
                .map(
                  (vuln, index) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${
                    index + 1
                  }</td>
                  <td><span class="code-text">${
                    vuln.cve_id || "N/A"
                  }</span></td>
                  <td style="text-align: center;"><span class="${getSeverityStyle(
                    vuln.severity
                  )}">${vuln.severity}</span></td>
                  <td><span class="code-text">${vuln.host_ip}</span></td>
                  <td>${vuln.vulnerability_name}</td>
                  <td>${
                    vuln.fix_recommendation ||
                    vuln.solution ||
                    "See detailed description"
                  }</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
      `
          : ""
      }

      <!-- VULNERABILITIES WITH REMEDIATION -->
      <div class="page-break">
        <div class="section">
          <h1>5. Vulnerabilities finding with Remediation</h1>
          <table>
            <thead>
              <tr>
                <th class="col-sno">S No</th>
                <th class="col-risk">Risk</th>
                <th class="col-host">Host</th>
                <th class="col-name">Name</th>
                <th class="col-solution">Solution</th>
              </tr>
            </thead>
            <tbody>
              ${vulnerabilities
                .filter((v) => !v.is_zero_day)
                .map(
                  (vuln, index) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${
                    index + 1
                  }</td>
                  <td style="text-align: center;"><span class="${getSeverityStyle(
                    vuln.severity
                  )}">${vuln.severity}</span></td>
                  <td><span class="code-text">${vuln.host_ip}</span></td>
                  <td>${vuln.vulnerability_name}</td>
                  <td>${
                    vuln.fix_recommendation ||
                    vuln.solution ||
                    "See detailed description"
                  }</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- CONCLUSION -->
      <div class="page-break">
        <div class="section">
          <h1>6. Conclusion</h1>
          <div class="conclusion-section">
            <p>
              Nevertheless, we suggest that IP's allocated to <span class="highlight-text">${
                report.org_name
              }</span>, implement the recommendations in this document with respect to the affected servers and devices. We also propose to follow-on retest to verify that the recommended changes were made and made correctly. Please note that as technologies and risks change over time, the vulnerabilities associated with the operation of the systems described in this report, as well as the actions necessary to reduce the exposure to such vulnerabilities, will also change.
            </p>
            
            <p>
              The vulnerability assessment of <span class="highlight-text">${
                report.org_name
              }</span> has identified <span class="highlight-text">${
    report.total_vulnerabilities
  }</span> vulnerabilities 
              across <span class="highlight-text">${
                report.total_ips_tested
              }</span> tested systems. The findings reveal a mix of security issues ranging from 
              critical vulnerabilities requiring immediate attention to informational findings that provide security insights.
            </p>
            
            <p>
              We strongly recommend prioritizing the remediation of <span style="color: #d32f2f; font-weight: bold;">${
                report.critical_count
              } critical</span> and <span style="color: #f57c00; font-weight: bold;">${
    report.high_count
  } high-severity</span> vulnerabilities 
              as they pose the most significant risk to the organization's security posture. The <span style="color: #fbc02d; font-weight: bold;">${
                report.medium_count
              } medium-severity</span> vulnerabilities 
              should be addressed in the next maintenance cycle, while low-severity issues can be scheduled for routine maintenance.
            </p>
            
            ${
              report.zero_day_count > 0
                ? `
            <div class="critical-notice">
              <p style="margin: 0; font-weight: bold;">
                <strong>🚨 Critical Notice:</strong> This assessment identified <span class="highlight-text">${report.zero_day_count} zero-day vulnerabilities</span> that require 
                immediate attention due to their recent disclosure and potential for exploitation.
              </p>
            </div>
            `
                : ""
            }
            
            <p>
              Following the remediation efforts, we recommend conducting a follow-up assessment to verify that vulnerabilities have been 
              properly addressed and that no new security issues have been introduced during the remediation process.
            </p>
            
            <p>
              The cybersecurity landscape continues to evolve rapidly, with new threats and vulnerabilities emerging regularly. We recommend 
              implementing a continuous vulnerability management program that includes regular scanning, timely patching procedures, and 
              security awareness training for all personnel.
            </p>
            
            <div class="document-end">
              ------END OF THE DOCUMENT------
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
