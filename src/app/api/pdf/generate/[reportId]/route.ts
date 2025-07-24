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
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    const imageBuffer = fs.readFileSync(fullPath);
    const base64 = imageBuffer.toString('base64');
    const extension = path.extname(imagePath).toLowerCase();
    const mimeType = extension === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Error loading image ${imagePath}:`, error);
    return '';
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
      .order("severity", { ascending: false })
      .order("host_ip");

    const zeroDayVulns = vulnerabilities?.filter((v) => v.is_zero_day) || [];

    // Generate HTML content
    const htmlContent = generateEnhancedReportHTML(
      report,
      hosts || [],
      vulnerabilities || [],
      zeroDayVulns
    );

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: {
        top: "15mm",
        right: "20mm",
        bottom: "15mm",
        left: "20mm",
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 9pt; text-align: center; width: 100%; color: #4a5568; font-family: 'Segoe UI', sans-serif; padding: 5pt 0; border-bottom: 1pt solid #e2e8f0;">
          <strong>${report.org_name}</strong> - Vulnerability Assessment Report | <span style="color: #2b6cb0;">CONFIDENTIAL</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 9pt; text-align: center; width: 100%; color: #4a5568; font-family: 'Segoe UI', sans-serif; padding: 5pt 0; border-top: 1pt solid #e2e8f0;">
          <span style="color: #2b6cb0;">HTC Global Services</span> | Page <span class="pageNumber"></span> of <span class="totalPages"></span> | <span style="font-style: italic;">Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      `,
      preferCSSPageSize: true,
      scale: 0.95,
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
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
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
  const htcLogoBase64 = getImageAsBase64('HTC.png');
  const methodologyImageBase64 = getImageAsBase64('Methodology.png');
  
  const riskModel = [
    {
      priority: "P1",
      severity: "Critical",
      cvss: "9.0-10.0",
      description: "The exposure may be exploited resulting in bad outcomes such as unauthorized privilege escalation, data access, downtime, or compromise of data.",
    },
    {
      priority: "P2",
      severity: "High",
      cvss: "7.0-8.9",
      description: "These issues identify conditions that could directly result in the compromise or unauthorized access of a network, system, application, or sensitive information.",
    },
    {
      priority: "P3",
      severity: "Medium",
      cvss: "4.0-6.9",
      description: "These issues identify conditions that do not immediately or directly result in the compromise or unauthorized access of a network, system, application, or sensitive information, but do provide a capability or information that could in combination with others' capabilities or information result in the compromise unauthorized access of a network application or information.",
    },
    {
      priority: "P4",
      severity: "Low",
      cvss: "0.1-3.9",
      description: "These issues identify conditions that do not immediately or directly result in the compromise of a network, system, application, or information but do provide information that could be used in combination with other's information access to a network system, application, or information.",
    },
    {
      priority: "P5",
      severity: "Informational",
      cvss: "0",
      description: "Issues that leaking very basic information which might lead to information disclosure",
    },
  ];

  const methodologySteps = [
    {
      title: "Determine Assets",
      description: `The first step in vulnerability assessment is to check the assets shared by ${report.org_name} and understand the scope. Based on the identified scope list out the assets which are included in the scope.`
    },
    {
      title: "Check Reachability and confirm",
      description: "Once the scope is confirmed as per the first step, proceed to check the connectivity. The connectivity and reachability to the in-scope assets are controlled by VLANS and or other restrictions like Firewall Rules. Once the reachability is validated, it is confirmed that all the required network permissions are in place to carry out the vulnerability assessment."
    },
    {
      title: "Inform Start of Activity",
      description: `Inform the start of the activity to the designated single point of contact and get confirmation to start the activity and the defined VA window. This is a critical step since networks are dynamic in nature and there may be last-minute changes. Confirmation from the ${report.org_name} single-point of contact is essential to start the activity. On confirmation, Check the readiness of the tools and start the vulnerability assessment tools to the in-scope assets to identify security flaws and weaknesses from the tools.`
    },
    {
      title: "Consolidate and validate the results",
      description: "The next step is to work with the collected data from the tool. Export the data in a preferred format and start analyzing the results. Check the results with the CVE ratings and other standard ratings. Check the identified CPEs with the listed CVSS and CPE from NVD and other standard locations. Identify the source as well as the root cause of the security weaknesses based on the CPE (Products and Listed Applications). Validate the suggested Remediation steps against the CVE portal and other vendor-shared solutions."
    },
    {
      title: "Reclassify Results",
      description: "Customers generally follow their internal Risk classifications. It varies from company to company and is dependent on the organization-specific Risk models. Hence reclassify the findings against shared Risk ratings by the customer."
    },
    {
      title: "Report Creation and Quality Check",
      description: "The next phase in the vulnerability assessment is to report the vulnerabilities identified in the specified templates. Ensure to capture essential data and version information as applicable. Validate the data in the document against the data identified by the tool."
    },
    {
      title: "Share Report",
      description: `Once all the above steps are completed, share the report to ${report.org_name} in a secure manner. Preferably walk the HTC through the report to ensure clear understanding of the observations. Ensure that the results are in a pdf document which is password protected. Prevent copying or data extraction as applicable. Share the password through a secondary channel to the single point contact.`
    }
  ];

  const getSeverityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "color: #991b1b; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); padding: 6pt 12pt; border-radius: 4pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5pt; border: 1pt solid #fca5a5;";
      case "high":
        return "color: #c2410c; background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%); padding: 6pt 12pt; border-radius: 4pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5pt; border: 1pt solid #fb923c;";
      case "medium":
        return "color: #a16207; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 6pt 12pt; border-radius: 4pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5pt; border: 1pt solid #facc15;";
      case "low":
        return "color: #1e40af; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 6pt 12pt; border-radius: 4pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5pt; border: 1pt solid #93c5fd;";
      default:
        return "color: #374151; background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); padding: 6pt 12pt; border-radius: 4pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5pt; border: 1pt solid #d1d5db;";
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
          margin: 15mm 20mm 15mm 20mm;
        }
        
        body { 
          font-family: 'Segoe UI', 'Calibri', 'Arial', sans-serif; 
          line-height: 1.7; 
          color: #2c3e50; 
          font-size: 11pt;
          margin: 0;
          padding: 0;
          background-color: #ffffff;
        }
        
        .page-container {
          border: 1.5pt solid #34495e;
          margin: 8pt;
          padding: 20pt;
          min-height: calc(100vh - 50mm);
          position: relative;
          page-break-after: always;
          background-color: #ffffff;
          box-shadow: 0 2pt 4pt rgba(0,0,0,0.1);
        }
        
        .page-container:last-child {
          page-break-after: auto;
        }
        
        .cover-page { 
          height: calc(100vh - 60pt); 
          display: flex; 
          flex-direction: column; 
          justify-content: space-between; 
          padding: 0; 
          text-align: center;
          position: relative;
        }
        
        .header-section {
          margin-bottom: 45pt;
        }
        
        .cover-title { 
          font-size: 22pt; 
          font-weight: 700; 
          color: #1a365d; 
          margin-bottom: 35pt;
          border-bottom: 3pt solid #2b6cb0;
          padding-bottom: 18pt;
          letter-spacing: 0.5pt;
          text-transform: uppercase;
        }
        
        .org-name {
          font-size: 28pt;
          font-weight: 800;
          color: #1a202c;
          margin: 40pt 0 35pt 0;
          text-shadow: 1pt 1pt 2pt rgba(0,0,0,0.1);
          letter-spacing: 1pt;
        }
        
        .scan-dates {
          font-size: 12pt;
          margin: 25pt 0;
          color: #4a5568;
          font-weight: 500;
          line-height: 1.6;
        }
        
        .company-info {
          text-align: left;
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          padding: 30pt;
          border-radius: 8pt;
          margin: 35pt 0;
          border: 1pt solid #e2e8f0;
          box-shadow: 0 2pt 8pt rgba(0,0,0,0.08);
        }
        
        .htc-logo {
          text-align: center;
          margin: 25pt 0;
          padding: 15pt;
        }
        
        .htc-logo img {
          max-width: 200pt;
          max-height: 80pt;
          object-fit: contain;
          filter: drop-shadow(0 2pt 4pt rgba(0,0,0,0.1));
        }
        
        .company-header {
          font-size: 16pt;
          font-weight: 700;
          color: #1a365d;
          margin-bottom: 18pt;
          text-align: center;
          border-bottom: 1pt solid #cbd5e0;
          padding-bottom: 12pt;
        }
        
        .company-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25pt;
          margin-top: 18pt;
          font-size: 10pt;
          line-height: 1.6;
        }
        
        .doc-control-table {
          margin: 35pt 0;
        }
        
        .doc-control-table table {
          width: 100%;
          border-collapse: collapse;
          margin: 25pt 0;
          background-color: #ffffff;
          border: 1pt solid #cbd5e0;
          box-shadow: 0 2pt 4pt rgba(0,0,0,0.05);
        }
        
        .doc-control-table th,
        .doc-control-table td {
          border: 1pt solid #e2e8f0;
          padding: 12pt 15pt;
          text-align: left;
          font-size: 10pt;
        }
        
        .doc-control-table th {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          font-weight: 600;
          color: #2d3748;
        }
        
        .disclaimers {
          margin-top: auto;
          font-size: 9pt;
          color: #718096;
          font-style: italic;
          line-height: 1.5;
        }
        
        .disclaimer-box {
          background: linear-gradient(135deg, #fef5e7 0%, #fed7aa 100%);
          border: 1pt solid #f6ad55;
          padding: 15pt;
          margin: 12pt 0;
          border-radius: 6pt;
          font-weight: 500;
          box-shadow: 0 2pt 4pt rgba(0,0,0,0.05);
        }
        
        .section { 
          margin: 30pt 0; 
          padding: 0 12pt;
        }
        
        .toc-section {
          padding: 0;
        }
        
        h1 { 
          font-size: 18pt; 
          font-weight: 700; 
          color: #1a365d; 
          margin-bottom: 25pt;
          border-bottom: 2pt solid #2b6cb0;
          padding-bottom: 12pt;
          text-transform: uppercase;
          letter-spacing: 0.8pt;
        }
        
        h2 { 
          font-size: 14pt; 
          font-weight: 600; 
          color: #2d3748; 
          margin: 28pt 0 18pt 0;
          padding-bottom: 8pt;
          border-bottom: 1pt solid #e2e8f0;
        }
        
        h3 { 
          font-size: 12pt; 
          font-weight: 600; 
          color: #4a5568; 
          margin: 22pt 0 12pt 0;
          padding-left: 8pt;
          border-left: 3pt solid #2b6cb0;
        }
        
        p { 
          margin-bottom: 15pt; 
          text-align: justify;
          line-height: 1.7;
          font-size: 11pt;
          text-indent: 0;
        }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 25pt 0; 
          font-size: 10pt;
          background-color: #ffffff;
          border: 1pt solid #cbd5e0;
          box-shadow: 0 2pt 6pt rgba(0,0,0,0.08);
        }
        
        th, td { 
          padding: 12pt 15pt; 
          text-align: left; 
          border: 1pt solid #e2e8f0;
          vertical-align: top;
        }
        
        th { 
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          font-weight: 600; 
          color: #2d3748;
          font-size: 10pt;
          text-transform: uppercase;
          letter-spacing: 0.5pt;
        }
        
        .total-row { 
          background: linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%);
          font-weight: 700;
          border-top: 2pt solid #2b6cb0;
        }
        
        .manifest-section {
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          padding: 25pt;
          border-radius: 8pt;
          margin: 30pt 0;
          border: 1pt solid #e2e8f0;
          box-shadow: 0 3pt 8pt rgba(0,0,0,0.08);
        }
        
        .manifest-table table {
          background-color: #ffffff;
          border: 1pt solid #cbd5e0;
        }
        
        .methodology-step { 
          margin-bottom: 30pt; 
          padding: 22pt; 
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 8pt;
          border-left: 4pt solid #2b6cb0;
          box-shadow: 0 2pt 6pt rgba(0,0,0,0.05);
        }
        
        .methodology-image {
          text-align: center;
          margin: 35pt 0;
          padding: 20pt;
          background-color: #ffffff;
          border-radius: 8pt;
          border: 1pt solid #e2e8f0;
          box-shadow: 0 3pt 8pt rgba(0,0,0,0.08);
        }
        
        .methodology-image img {
          max-width: 100%;
          max-height: 400pt;
          object-fit: contain;
          filter: drop-shadow(0 2pt 4pt rgba(0,0,0,0.1));
        }
        
        .methodology-image-caption {
          font-size: 10pt;
          color: #4a5568;
          margin-top: 12pt;
          font-style: italic;
          text-align: center;
        }
        
        .methodology-title {
          font-weight: 700;
          font-size: 12pt;
          color: #1a365d;
          margin-bottom: 12pt;
          text-transform: uppercase;
          letter-spacing: 0.5pt;
        }
        
        .zero-day-section { 
          background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
          border: 2pt solid #fc8181; 
          border-radius: 8pt; 
          padding: 30pt; 
          margin: 30pt 0;
          box-shadow: 0 4pt 12pt rgba(220, 38, 38, 0.15);
        }
        
        .zero-day-header {
          color: #c53030;
          font-size: 16pt;
          font-weight: 700;
          margin-bottom: 18pt;
          text-transform: uppercase;
          letter-spacing: 0.8pt;
          text-align: center;
          border-bottom: 2pt solid #c53030;
          padding-bottom: 12pt;
        }
        
        .page-break { 
          page-break-before: auto;
        }
        
        .severity-badge { 
          display: inline-block; 
          padding: 6pt 12pt; 
          border-radius: 4pt; 
          font-size: 9pt; 
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5pt;
        }
        
        .toc-section {
          padding: 0;
          page-break-after: always;
        }
        
        .toc-item {
          display: flex;
          justify-content: space-between;
          padding: 12pt 0;
          border-bottom: 1pt dotted #cbd5e0;
          font-size: 11pt;
          line-height: 1.5;
        }
        
        .toc-item:hover {
          background-color: #f7fafc;
        }
        
        .scope-table {
          margin: 25pt 0;
        }
        
        .executive-summary {
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          padding: 30pt;
          border-radius: 8pt;
          margin: 30pt 0;
          border: 1pt solid #e2e8f0;
          box-shadow: 0 3pt 8pt rgba(0,0,0,0.08);
        }
        
        .status-active {
          color: #065f46;
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          padding: 4pt 8pt;
          border-radius: 4pt;
          font-weight: 600;
          font-size: 9pt;
          text-transform: uppercase;
        }
        
        .status-failed {
          color: #991b1b;
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          padding: 4pt 8pt;
          border-radius: 4pt;
          font-weight: 600;
          font-size: 9pt;
          text-transform: uppercase;
        }
        
        .risk-summary-table {
          max-width: 450pt;
          margin: 25pt auto;
        }
        
        .conclusion-section {
          font-size: 11pt;
          line-height: 1.8;
          text-align: justify;
        }
        
        .conclusion-section p {
          margin-bottom: 18pt;
        }
        
        .critical-notice {
          background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
          padding: 25pt;
          border-radius: 8pt;
          border: 2pt solid #fc8181;
          margin: 25pt 0;
          box-shadow: 0 4pt 12pt rgba(220, 38, 38, 0.15);
        }
        
        .document-end {
          text-align: center;
          margin-top: 50pt;
          padding-top: 25pt;
          border-top: 3pt solid #2b6cb0;
          font-weight: 700;
          font-size: 14pt;
          color: #1a365d;
          letter-spacing: 2pt;
        }
        
        /* Improved typography */
        .section-number {
          color: #2b6cb0;
          font-weight: 700;
        }
        
        .highlight-text {
          background-color: #fff3cd;
          padding: 2pt 4pt;
          border-radius: 2pt;
          font-weight: 600;
        }
        
        .code-text {
          font-family: 'Courier New', monospace;
          background-color: #f8f9fa;
          padding: 2pt 4pt;
          border-radius: 2pt;
          border: 1pt solid #e9ecef;
        }
        
        /* Enhanced table styling */
        .data-table {
          border: 1pt solid #2b6cb0;
        }
        
        .data-table thead th {
          background: linear-gradient(135deg, #2b6cb0 0%, #1e40af 100%);
          color: #ffffff;
          text-align: center;
          font-weight: 700;
        }
        
        .data-table tbody tr:nth-child(even) {
          background-color: #f8fafc;
        }
        
        .data-table tbody tr:hover {
          background-color: #e2e8f0;
        }
      </style>
    </head>
    <body>
      <!-- COVER PAGE -->
      <div class="page-container">
      <div class="cover-page">
        <div class="header-section">
          <div class="cover-title">
            ${report.source_type === "internal" ? "Internal" : "External"} Vulnerability Assessment Report
          </div>
          
          <div class="org-name">${report.org_name}</div>
          
          <div class="scan-dates">
            VA Conducted on: ${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} to ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            <br>
            Conducted by
          </div>
          
          <div class="company-info">
            <div class="company-header">HTC Global Services</div>
            <div class="company-details">
              <div>
                Unit 25, SDF II, Phase II, MEPZ<br>
                Chennai- 600045. India.<br>
                Phone: (44) 45158888 / 45158800
              </div>
              <div>
                H.Q 3270 West Big Beaver Road, Troy<br>
                MI 48084<br>
                Phone: (248)7862500
              </div>
            </div>
          </div>
          
          <div class="htc-logo">
            <img src="${htcLogoBase64}" alt="HTC Global Services Logo" />
          </div>
          
          <div class="doc-control-table">
            <table>
              <tr>
                <th>Document Type:</th>
                <td>${report.document_type}</td>
                <th>Version #:</th>
                <td>${report.version}</td>
              </tr>
              <tr>
                <th>Assessee:</th>
                <td>${report.assessee || ''}</td>
                <th>Signature:</th>
                <td></td>
              </tr>
              <tr>
                <th>Assessor:</th>
                <td>${report.assessor || ''}</td>
                <th>Signature:</th>
                <td></td>
              </tr>
              <tr>
                <th>Reviewer:</th>
                <td>${report.reviewer || ''}</td>
                <th>Signature:</th>
                <td></td>
              </tr>
              <tr>
                <th>Approved by:</th>
                <td>${report.approver || ''}</td>
                <th>Signature:</th>
                <td></td>
              </tr>
            </table>
          </div>
        </div>
        
        <div class="disclaimers">
          <div class="disclaimer-box">
            "No part of this document may be reproduced or transmitted in any form or by any means electronic or mechanical including photocopying and recording or by any information storage or retrieval system except as may be expressly permitted."
          </div>
          <div class="disclaimer-box">
            "Recipient of this document implicitly consents to this and also in consent with the applicable local privacy law"
          </div>
        </div>
      </div>
      </div> <!-- Close cover page container -->

      <!-- SCAN MANIFEST -->
      <div class="page-container">
      <div class="section">
        <h1>Scan Manifest</h1>
        <div class="manifest-section">
          <table class="manifest-table">
            <tr>
              <td><strong>a. Description</strong></td>
              <td>Network Vulnerability Assessment</td>
            </tr>
            <tr>
              <td><strong>b. Test started on</strong></td>
              <td>${startDate.toLocaleDateString('en-GB')}</td>
            </tr>
            <tr>
              <td><strong>c. Test Completed on</strong></td>
              <td>${endDate.toLocaleDateString('en-GB')}</td>
            </tr>
            <tr>
              <td><strong>d. No. of IP's tested</strong></td>
              <td>${report.total_ips_tested} IP's</td>
            </tr>
            <tr>
              <td><strong>e. Test performed at</strong></td>
              <td>${report.test_performed_at}</td>
            </tr>
            <tr>
              <td><strong>f. Tool used for Network testing</strong></td>
              <td>Nessus</td>
            </tr>
          </table>
        </div>
      </div>
      </div> <!-- Close scan manifest container -->

      <!-- TABLE OF CONTENTS -->
      <div class="page-container">
      <div class="toc-section">
        <h1>Table of Contents</h1>
        <div style="margin-top: 30px;">
          <div class="toc-item">
            <span>1. Executive Summary</span>
            <span>5</span>
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
            <span>2. Vulnerability Assessment Methodology</span>
            <span>7</span>
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
            <span>3. Summary of Vulnerable Hosts in Network Segments</span>
            <span>10</span>
          </div>
          <div class="toc-item">
            <span>4. Zero Day Vulnerabilities</span>
            <span>11</span>
          </div>
          <div class="toc-item">
            <span>5. Vulnerabilities finding with Remediation</span>
            <span>14</span>
          </div>
          <div class="toc-item">
            <span>6. Conclusion</span>
            <span>27</span>
          </div>
        </div>
      </div>
      </div> <!-- Close TOC container -->

      <!-- EXECUTIVE SUMMARY -->
      <div class="page-container">
      <div class="section">
        <h1>1. Executive Summary</h1>
        
        <h2>1.1 Overview</h2>
        <div class="executive-summary">
          <p>
            This report provides the Scan results of the Vulnerability Assessment conducted on <strong>${report.org_name}</strong> from HTC Global Services. 
            The objective was to identify Network-level security vulnerabilities that could impact confidentiality, integrity, or availability. 
            The assessment included unauthorized transactions, confidential data access, and a range of vulnerabilities on IP's.
          </p>
          
          <p>
            The findings in this report pertain to the conditions discovered during the testing, and not necessarily the current state. 
            HTC Global Services engaged in this vulnerability assessment to identify risks and provide security enhancement recommendations 
            for internal-facing IPs. The assessment was conducted on ${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} to ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}, 
            with the goal of uncovering vulnerabilities and assessing active exploits.
          </p>
          
          <p>
            In summary, this document outlines the analysis, findings, and recommendations from HTC Global Services for the vulnerabilities, 
            aimed at enhancing the overall security posture of the network infrastructure.
          </p>
        </div>

        <h2>1.2 Risk Model</h2>
        <p>Throughout this document, HTC has categorized the risk ratings for discovered vulnerabilities based on Global Standard risk definitions.</p>
        
        <table class="data-table">
          <thead>
            <tr>
              <th>Priority Level</th>
              <th>Severity Scale</th>
              <th>CVSS Score</th>
              <th>Description of Vulnerability</th>
            </tr>
          </thead>
          <tbody>
            ${riskModel
              .map(
                (risk) => `
              <tr>
                <td style="font-weight: 700; color: #1a365d; text-align: center;">${risk.priority}</td>
                <td><span style="${getSeverityStyle(risk.severity)}">${risk.severity}</span></td>
                <td style="font-family: 'Courier New', monospace; text-align: center; font-weight: 600;">${risk.cvss}</td>
                <td style="line-height: 1.6;">${risk.description}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      </div> <!-- Close executive summary container -->

      <!-- METHODOLOGY -->
      <div class="page-container">
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
      </div> <!-- Close methodology container -->

      <!-- PROJECT SCOPE -->
      <div class="page-container">
      <div class="section">
        <h1>2.2 Project Scope</h1>
        <p>
          Formal communication from the customer outlined the IPs to be tested and the type of testing to be carried out. 
          Based on the received communication a security team was deployed to perform this activity. The assigned team 
          carried out the network vulnerability assessment for the IP's shared by ${report.org_name}.
        </p>
        
        <h3>Scope Of IP's</h3>
        <table class="scope-table data-table">
          <thead>
            <tr>
              <th style="width: 80pt;">S No</th>
              <th>IP Address</th>
              <th style="width: 120pt;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${hosts
              .map(
                (host, index) => `
              <tr>
                <td style="text-align: center; font-weight: 600;">${index + 1}</td>
                <td><span class="code-text">${host.ip_address}</span></td>
                <td style="text-align: center;"><span class="${
                  host.scan_status === "completed" ? "status-active" : "status-failed"
                }">${
                  host.scan_status.charAt(0).toUpperCase() +
                  host.scan_status.slice(1)
                }</span></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        
        <p style="margin-top: 20px; font-style: italic; color: #6b7280;">
          In this testing except Brute force attack, HTC did not attempt any active network-based Denial of Service (DoS), 
          Password cracking, physical, process, and social engineering attacks.
        </p>
      </div>
      </div> <!-- Close project scope container -->

      <!-- SUMMARY OF VULNERABLE HOSTS -->
      <div class="page-container">
      <div class="section">
        <h1>3. Summary of Vulnerable Hosts in Network Segments</h1>
        <table class="data-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Host</th>
              <th style="text-align: center;">Critical</th>
              <th style="text-align: center;">High</th>
              <th style="text-align: center;">Medium</th>
              <th style="text-align: center;">Low</th>
              <th style="text-align: center;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${hosts
              .map(
                (host, index) => `
              <tr>
                <td style="text-align: center; font-weight: 600;">${index + 1}</td>
                <td><span class="code-text">${host.ip_address}</span></td>
                <td style="text-align: center; font-weight: 600; color: #991b1b;">${host.critical_count}</td>
                <td style="text-align: center; font-weight: 600; color: #c2410c;">${host.high_count}</td>
                <td style="text-align: center; font-weight: 600; color: #a16207;">${host.medium_count}</td>
                <td style="text-align: center; font-weight: 600; color: #1e40af;">${host.low_count}</td>
                <td style="text-align: center; font-weight: 700; color: #1a365d;">${host.total_vulnerabilities}</td>
              </tr>
            `
              )
              .join("")}
            <tr class="total-row">
              <td style="font-weight: 700;">Total Count</td>
              <td style="font-weight: 700;"></td>
              <td style="text-align: center; font-weight: 700; color: #991b1b;">${report.critical_count}</td>
              <td style="text-align: center; font-weight: 700; color: #c2410c;">${report.high_count}</td>
              <td style="text-align: center; font-weight: 700; color: #a16207;">${report.medium_count}</td>
              <td style="text-align: center; font-weight: 700; color: #1e40af;">${report.low_count}</td>
              <td style="text-align: center; font-weight: 700; color: #1a365d;">${report.total_vulnerabilities}</td>
            </tr>
          </tbody>
        </table>
        
        <h3>Vulnerabilities count based on Risk Levels</h3>
        <table class="risk-summary-table data-table">
          <thead>
            <tr>
              <th>Risk</th>
              <th style="text-align: center;">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span style="${getSeverityStyle('Critical')}">Critical</span></td>
              <td style="text-align: center; font-weight: 700; color: #991b1b; font-size: 12pt;">${report.critical_count}</td>
            </tr>
            <tr>
              <td><span style="${getSeverityStyle('High')}">High</span></td>
              <td style="text-align: center; font-weight: 700; color: #c2410c; font-size: 12pt;">${report.high_count}</td>
            </tr>
            <tr>
              <td><span style="${getSeverityStyle('Medium')}">Medium</span></td>
              <td style="text-align: center; font-weight: 700; color: #a16207; font-size: 12pt;">${report.medium_count}</td>
            </tr>
            <tr>
              <td><span style="${getSeverityStyle('Low')}">Low</span></td>
              <td style="text-align: center; font-weight: 700; color: #1e40af; font-size: 12pt;">${report.low_count}</td>
            </tr>
            <tr class="total-row">
              <td style="font-weight: 700;">Grand Total</td>
              <td style="text-align: center; font-weight: 700; color: #1a365d; font-size: 14pt;">${report.total_vulnerabilities}</td>
            </tr>
          </tbody>
        </table>
      </div>
      </div> <!-- Close vulnerable hosts summary container -->

      <!-- ZERO DAY VULNERABILITIES -->
      ${zeroDayVulns.length > 0 ? `
      <div class="page-container">
      <div class="section">
        <h1>4. Zero Day Vulnerabilities</h1>
        
        <div class="zero-day-section">
          <div class="zero-day-header">Zero Day Vulnerabilities based on Risk Levels</div>
          <table style="max-width: 400px;">
            <thead>
              <tr>
                <th>Risk</th>
                <th style="text-align: center;">Count</th>
              </tr>
            </thead>
            <tbody>
              ${['Critical', 'High', 'Medium', 'Low'].map(severity => {
                const count = zeroDayVulns.filter(v => v.severity.toLowerCase() === severity.toLowerCase()).length;
                return `
                  <tr>
                    <td><span style="${getSeverityStyle(severity)}">${severity}</span></td>
                    <td style="text-align: center; font-weight: bold;">${count}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="total-row">
                <td style="font-weight: bold;">Total</td>
                <td style="text-align: center; font-weight: bold;">${zeroDayVulns.length}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>4.1 Zero Day Vulnerabilities finding with Remediation</h3>
        <table>
          <thead>
            <tr>
              <th>S No</th>
              <th>CVE</th>
              <th>Risk</th>
              <th>Host</th>
              <th>Name</th>
              <th>Solution</th>
            </tr>
          </thead>
          <tbody>
            ${zeroDayVulns
              .map(
                (vuln, index) => `
              <tr>
                <td>${index + 1}</td>
                <td style="font-family: monospace;">${vuln.cve_id || 'N/A'}</td>
                <td><span style="${getSeverityStyle(vuln.severity)}">${vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1)}</span></td>
                <td style="font-family: monospace;">${vuln.host_ip}</td>
                <td>${vuln.vulnerability_name}</td>
                <td>${vuln.fix_recommendation || vuln.solution || 'See detailed description'}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      </div> <!-- Close zero day container -->
      ` : ''}

      <!-- VULNERABILITIES WITH REMEDIATION -->
      <div class="page-container">
      <div class="section">
        <h1>5. Vulnerabilities finding with Remediation</h1>
        <table>
          <thead>
            <tr>
              <th>S No</th>
              <th>Risk</th>
              <th>Host</th>
              <th>Name</th>
              <th>Solution</th>
            </tr>
          </thead>
          <tbody>
            ${vulnerabilities
              .filter((v) => !v.is_zero_day)
              .map(
                (vuln, index) => `
              <tr>
                <td>${index + 1}</td>
                <td><span style="${getSeverityStyle(vuln.severity)}">${
                  vuln.severity.charAt(0).toUpperCase() +
                  vuln.severity.slice(1)
                }</span></td>
                <td style="font-family: monospace;">${vuln.host_ip}</td>
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
      </div> <!-- Close vulnerabilities container -->

      <!-- CONCLUSION -->
      <div class="page-container">
      <div class="section">
        <h1>6. Conclusion</h1>
        <div class="conclusion-section">
          <p>
            Nevertheless, we suggest that IP's allocated to <span class="highlight-text">${report.org_name}</span>, implement the recommendations in this document with respect to the affected servers and devices. We also propose to follow-on retest to verify that the recommended changes were made and made correctly. Please note that as technologies and risks change over time, the vulnerabilities associated with the operation of the systems described in this report, as well as the actions necessary to reduce the exposure to such vulnerabilities, will also change.
          </p>
          
          <p>
            The vulnerability assessment of <span class="highlight-text">${report.org_name}</span> has identified <span class="highlight-text">${report.total_vulnerabilities}</span> vulnerabilities 
            across <span class="highlight-text">${report.total_ips_tested}</span> tested systems. The findings reveal a mix of security issues ranging from 
            critical vulnerabilities requiring immediate attention to informational findings that provide security insights.
          </p>
          
          <p>
            We strongly recommend prioritizing the remediation of <span style="color: #991b1b; font-weight: 700;">${report.critical_count} critical</span> and <span style="color: #c2410c; font-weight: 700;">${report.high_count} high-severity</span> vulnerabilities 
            as they pose the most significant risk to the organization's security posture. The <span style="color: #a16207; font-weight: 700;">${report.medium_count} medium-severity</span> vulnerabilities 
            should be addressed in the next maintenance cycle, while low-severity issues can be scheduled for routine maintenance.
          </p>
          
          ${report.zero_day_count > 0 ? `
          <div class="critical-notice">
            <p style="margin: 0; font-weight: 700;">
              <strong>🚨 Critical Notice:</strong> This assessment identified <span class="highlight-text">${report.zero_day_count} zero-day vulnerabilities</span> that require 
              immediate attention due to their recent disclosure and potential for exploitation.
            </p>
          </div>
          ` : ""}
          
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
            ------END OF THE DOCUMENT----
          </div>
        </div>
      </div>
      </div> <!-- Close conclusion container -->
    </body>
    </html>
  `;
}
