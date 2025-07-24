import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import puppeteer from "puppeteer";

// Types
interface ReportData {
  id: string;
  org_name: string;
  source_type: string;
  scan_start_date: string;
  scan_end_date: string;
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
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
          ${report.org_name} - Vulnerability Assessment Report
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
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
        return "color: #dc2626; background-color: #fef2f2; padding: 4px 8px; border-radius: 4px; font-weight: 600;";
      case "high":
        return "color: #ea580c; background-color: #fff7ed; padding: 4px 8px; border-radius: 4px; font-weight: 600;";
      case "medium":
        return "color: #d97706; background-color: #fffbeb; padding: 4px 8px; border-radius: 4px; font-weight: 600;";
      case "low":
        return "color: #2563eb; background-color: #eff6ff; padding: 4px 8px; border-radius: 4px; font-weight: 600;";
      default:
        return "color: #374151; background-color: #f9fafb; padding: 4px 8px; border-radius: 4px; font-weight: 600;";
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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
          font-family: 'Arial', sans-serif; 
          line-height: 1.6; 
          color: #333; 
          font-size: 14px;
        }
        
        .cover-page { 
          height: 100vh; 
          display: flex; 
          flex-direction: column; 
          justify-content: space-between; 
          padding: 40px; 
          page-break-after: always;
          text-align: center;
        }
        
        .header-section {
          margin-bottom: 40px;
        }
        
        .cover-title { 
          font-size: 28px; 
          font-weight: bold; 
          color: #1f2937; 
          margin-bottom: 30px;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 15px;
        }
        
        .org-name {
          font-size: 32px;
          font-weight: bold;
          color: #1f2937;
          margin: 30px 0;
        }
        
        .scan-dates {
          font-size: 16px;
          margin: 20px 0;
          color: #4b5563;
        }
        
        .company-info {
          text-align: left;
          background-color: #f8fafc;
          padding: 25px;
          border-radius: 10px;
          margin: 30px 0;
        }
        
        .company-header {
          font-size: 18px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 15px;
        }
        
        .company-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 15px;
        }
        
        .doc-control-table {
          margin: 30px 0;
        }
        
        .doc-control-table table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        .doc-control-table th,
        .doc-control-table td {
          border: 1px solid #d1d5db;
          padding: 12px;
          text-align: left;
        }
        
        .doc-control-table th {
          background-color: #f9fafb;
          font-weight: bold;
        }
        
        .disclaimers {
          margin-top: auto;
          font-size: 12px;
          color: #6b7280;
          font-style: italic;
          line-height: 1.5;
        }
        
        .disclaimer-box {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          padding: 15px;
          margin: 10px 0;
          border-radius: 5px;
        }
        
        .section { 
          margin: 30px 0; 
          padding: 0 20px;
        }
        
        h1 { 
          font-size: 24px; 
          font-weight: bold; 
          color: #1f2937; 
          margin-bottom: 20px;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 10px;
        }
        
        h2 { 
          font-size: 20px; 
          font-weight: bold; 
          color: #374151; 
          margin: 25px 0 15px 0;
        }
        
        h3 { 
          font-size: 16px; 
          font-weight: bold; 
          color: #4b5563; 
          margin: 20px 0 10px 0;
        }
        
        p { 
          margin-bottom: 15px; 
          text-align: justify;
        }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0; 
          font-size: 14px;
        }
        
        th, td { 
          padding: 12px; 
          text-align: left; 
          border: 1px solid #d1d5db;
        }
        
        th { 
          background-color: #f9fafb; 
          font-weight: bold; 
          color: #374151;
        }
        
        .total-row { 
          background-color: #f3f4f6; 
          font-weight: bold;
        }
        
        .manifest-section {
          background-color: #f8fafc;
          padding: 25px;
          border-radius: 10px;
          margin: 25px 0;
        }
        
        .manifest-table table {
          background-color: white;
          border: 1px solid #e5e7eb;
        }
        
        .methodology-step { 
          margin-bottom: 25px; 
          padding: 20px; 
          background-color: #f9fafb; 
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }
        
        .methodology-title {
          font-weight: bold;
          font-size: 16px;
          color: #1f2937;
          margin-bottom: 10px;
        }
        
        .zero-day-section { 
          background-color: #fef2f2; 
          border: 2px solid #fecaca; 
          border-radius: 8px; 
          padding: 25px; 
          margin: 25px 0;
        }
        
        .zero-day-header {
          color: #dc2626;
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 15px;
        }
        
        .page-break { 
          page-break-before: always;
        }
        
        .severity-badge { 
          display: inline-block; 
          padding: 4px 8px; 
          border-radius: 4px; 
          font-size: 12px; 
          font-weight: 600;
        }
        
        .toc-section {
          padding: 40px;
          page-break-after: always;
        }
        
        .toc-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px dotted #d1d5db;
        }
        
        .scope-table {
          margin: 20px 0;
        }
        
        .executive-summary {
          background-color: #f8fafc;
          padding: 25px;
          border-radius: 10px;
          margin: 25px 0;
        }
      </style>
    </head>
    <body>
      <!-- COVER PAGE -->
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

      <!-- SCAN MANIFEST -->
      <div class="section page-break">
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
              <td>${report.source_type === 'internal' ? 'On-site' : 'Remote'}</td>
            </tr>
            <tr>
              <td><strong>f. Tool used for Network testing</strong></td>
              <td>Nessus</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- TABLE OF CONTENTS -->
      <div class="toc-section page-break">
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

      <!-- EXECUTIVE SUMMARY -->
      <div class="section page-break">
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
        
        <table>
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
                <td style="font-weight: bold;">${risk.priority}</td>
                <td><span style="${getSeverityStyle(risk.severity)}">${risk.severity}</span></td>
                <td style="font-family: monospace;">${risk.cvss}</td>
                <td>${risk.description}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <!-- METHODOLOGY -->
      <div class="section page-break">
        <h1>2. Vulnerability Assessment Methodology</h1>
        
        <h2>2.1 Methodology</h2>
        ${methodologySteps
          .map(
            (step, index) => `
          <div class="methodology-step">
            <div class="methodology-title">${index + 1}. ${step.title}:</div>
            <p>${step.description}</p>
          </div>
        `
          )
          .join("")}
      </div>

      <!-- PROJECT SCOPE -->
      <div class="section page-break">
        <h1>2.2 Project Scope</h1>
        <p>
          Formal communication from the customer outlined the IPs to be tested and the type of testing to be carried out. 
          Based on the received communication a security team was deployed to perform this activity. The assigned team 
          carried out the network vulnerability assessment for the IP's shared by ${report.org_name}.
        </p>
        
        <h3>Scope Of IP's</h3>
        <table class="scope-table">
          <thead>
            <tr>
              <th style="width: 80px;">S No</th>
              <th>IP Address</th>
              <th style="width: 120px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${hosts
              .map(
                (host, index) => `
              <tr>
                <td>${index + 1}</td>
                <td style="font-family: monospace;">${host.ip_address}</td>
                <td><span style="${
                  host.scan_status === "completed"
                    ? "color: #059669; background-color: #d1fae5;"
                    : "color: #dc2626; background-color: #fee2e2;"
                } padding: 4px 8px; border-radius: 4px; font-weight: 600;">${
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

      <!-- SUMMARY OF VULNERABLE HOSTS -->
      <div class="section page-break">
        <h1>3. Summary of Vulnerable Hosts in Network Segments</h1>
        <table>
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
                <td>${index + 1}</td>
                <td style="font-family: monospace;">${host.ip_address}</td>
                <td style="text-align: center;">${host.critical_count}</td>
                <td style="text-align: center;">${host.high_count}</td>
                <td style="text-align: center;">${host.medium_count}</td>
                <td style="text-align: center;">${host.low_count}</td>
                <td style="text-align: center; font-weight: bold;">${host.total_vulnerabilities}</td>
              </tr>
            `
              )
              .join("")}
            <tr class="total-row">
              <td style="font-weight: bold;">Total Count</td>
              <td style="font-weight: bold;"></td>
              <td style="text-align: center; font-weight: bold;">${report.critical_count}</td>
              <td style="text-align: center; font-weight: bold;">${report.high_count}</td>
              <td style="text-align: center; font-weight: bold;">${report.medium_count}</td>
              <td style="text-align: center; font-weight: bold;">${report.low_count}</td>
              <td style="text-align: center; font-weight: bold;">${report.total_vulnerabilities}</td>
            </tr>
          </tbody>
        </table>
        
        <h3>Vulnerabilities count based on Risk Levels</h3>
        <table style="max-width: 400px;">
          <thead>
            <tr>
              <th>Risk</th>
              <th style="text-align: center;">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span style="${getSeverityStyle('Critical')}">Critical</span></td>
              <td style="text-align: center; font-weight: bold;">${report.critical_count}</td>
            </tr>
            <tr>
              <td><span style="${getSeverityStyle('High')}">High</span></td>
              <td style="text-align: center; font-weight: bold;">${report.high_count}</td>
            </tr>
            <tr>
              <td><span style="${getSeverityStyle('Medium')}">Medium</span></td>
              <td style="text-align: center; font-weight: bold;">${report.medium_count}</td>
            </tr>
            <tr>
              <td><span style="${getSeverityStyle('Low')}">Low</span></td>
              <td style="text-align: center; font-weight: bold;">${report.low_count}</td>
            </tr>
            <tr class="total-row">
              <td style="font-weight: bold;">Grand Total</td>
              <td style="text-align: center; font-weight: bold;">${report.total_vulnerabilities}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ZERO DAY VULNERABILITIES -->
      ${zeroDayVulns.length > 0 ? `
      <div class="section page-break">
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
      ` : ''}

      <!-- VULNERABILITIES WITH REMEDIATION -->
      <div class="section page-break">
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

      <!-- CONCLUSION -->
      <div class="section page-break">
        <h1>6. Conclusion</h1>
        <div style="font-size: 16px; line-height: 1.7; space-y: 20px;">
          <p style="margin-bottom: 20px;">
            Nevertheless, we suggest that IP's allocated to <strong>${report.org_name}</strong>, implement the recommendations in this document with respect to the affected servers and devices. We also propose to follow-on retest to verify that the recommended changes were made and made correctly. Please note that as technologies and risks change over time, the vulnerabilities associated with the operation of the systems described in this report, as well as the actions necessary to reduce the exposure to such vulnerabilities, will also change.
          </p>
          
          <p style="margin-bottom: 20px;">
            The vulnerability assessment of <strong>${report.org_name}</strong> has identified <strong>${report.total_vulnerabilities}</strong> vulnerabilities 
            across <strong>${report.total_ips_tested}</strong> tested systems. The findings reveal a mix of security issues ranging from 
            critical vulnerabilities requiring immediate attention to informational findings that provide security insights.
          </p>
          
          <p style="margin-bottom: 20px;">
            We strongly recommend prioritizing the remediation of <strong>${report.critical_count} critical</strong> and <strong>${report.high_count} high-severity</strong> vulnerabilities 
            as they pose the most significant risk to the organization's security posture. The <strong>${report.medium_count} medium-severity</strong> vulnerabilities 
            should be addressed in the next maintenance cycle, while low-severity issues can be scheduled for routine maintenance.
          </p>
          
          ${report.zero_day_count > 0 ? `
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border: 2px solid #fecaca; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">
              <strong>Critical Notice:</strong> This assessment identified <strong>${report.zero_day_count} zero-day vulnerabilities</strong> that require 
              immediate attention due to their recent disclosure and potential for exploitation.
            </p>
          </div>
          ` : ""}
          
          <p style="margin-bottom: 20px;">
            Following the remediation efforts, we recommend conducting a follow-up assessment to verify that vulnerabilities have been 
            properly addressed and that no new security issues have been introduced during the remediation process.
          </p>
          
          <p style="margin-bottom: 20px;">
            The cybersecurity landscape continues to evolve rapidly, with new threats and vulnerabilities emerging regularly. We recommend 
            implementing a continuous vulnerability management program that includes regular scanning, timely patching procedures, and 
            security awareness training for all personnel.
          </p>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <p style="font-weight: bold; font-size: 18px;">------END OF THE DOCUMENT----</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
