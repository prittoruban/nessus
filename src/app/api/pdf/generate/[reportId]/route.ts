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
    const htmlContent = generateReportHTML(
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

function generateReportHTML(
  report: ReportData,
  hosts: HostData[],
  vulnerabilities: VulnerabilityData[],
  zeroDayVulns: VulnerabilityData[]
): string {
  const riskModel = [
    {
      priority: "P1",
      severity: "Critical",
      cvss: "9.0–10.0",
      description: "Full system compromise, data exfiltration",
    },
    {
      priority: "P2",
      severity: "High",
      cvss: "7.0–8.9",
      description: "Major flaws risking unauthorized access",
    },
    {
      priority: "P3",
      severity: "Medium",
      cvss: "4.0–6.9",
      description: "Flaws that need chaining to become exploitable",
    },
    {
      priority: "P4",
      severity: "Low",
      cvss: "0.1–3.9",
      description: "Minor misconfigurations or indirect threats",
    },
    {
      priority: "P5",
      severity: "Informational",
      cvss: "0.0",
      description: "Insightful but not risky on their own",
    },
  ];

  const methodologySteps = [
    "Asset Selection",
    "Reachability checks",
    "Informed initiation",
    "Tool execution",
    "Consolidation & Validation",
    "Severity Reclassification (if any)",
    "Reporting",
    "Secure Sharing",
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
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${report.org_name} Vulnerability Assessment Report</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0;
        }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .section { margin-bottom: 40px; page-break-inside: avoid; }
        .cover-page { 
          text-align: center; 
          page-break-after: always; 
          padding: 60px 0;
        }
        .cover-title { 
          font-size: 28px; 
          font-weight: bold; 
          margin-bottom: 40px; 
          color: #1f2937;
        }
        .cover-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 30px; 
          margin: 40px 0;
        }
        .cover-field { 
          text-align: left; 
          margin-bottom: 20px;
        }
        .cover-label { 
          font-weight: bold; 
          color: #374151; 
          display: block; 
          margin-bottom: 5px;
        }
        .cover-value { 
          font-size: 18px; 
          color: #111827;
        }
        .signatures { 
          display: grid; 
          grid-template-columns: repeat(4, 1fr); 
          gap: 20px; 
          margin-top: 60px;
        }
        .signature-field { 
          text-align: center;
        }
        .signature-label { 
          font-weight: bold; 
          margin-bottom: 10px;
        }
        .signature-line { 
          border-bottom: 2px solid #d1d5db; 
          height: 30px; 
          margin-bottom: 5px;
        }
        h1 { 
          font-size: 24px; 
          font-weight: bold; 
          color: #1f2937; 
          margin-bottom: 20px; 
          border-bottom: 2px solid #e5e7eb; 
          padding-bottom: 10px;
        }
        h2 { 
          font-size: 20px; 
          font-weight: bold; 
          color: #374151; 
          margin: 30px 0 15px 0;
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
        .manifest-table { 
          background-color: #f9fafb; 
          border-radius: 8px; 
          padding: 20px;
        }
        .manifest-table table { 
          margin: 0;
        }
        .manifest-table td { 
          border: none; 
          border-bottom: 1px solid #e5e7eb; 
          padding: 15px 0;
        }
        .methodology-step { 
          margin-bottom: 20px; 
          padding: 15px; 
          background-color: #f9fafb; 
          border-radius: 6px;
        }
        .zero-day-section { 
          background-color: #fef2f2; 
          border: 2px solid #fecaca; 
          border-radius: 8px; 
          padding: 20px; 
          margin: 20px 0;
        }
        .disclaimer { 
          font-style: italic; 
          color: #6b7280; 
          font-size: 12px; 
          margin-top: 15px;
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
      </style>
    </head>
    <body>
      <!-- COVER PAGE -->
      <div class="cover-page">
        <div class="cover-title">
          ${
            report.source_type === "internal" ? "Internal" : "External"
          } Vulnerability Assessment Report
        </div>
        
        <div class="cover-grid">
          <div class="cover-field">
            <span class="cover-label">Organization Name</span>
            <span class="cover-value">${report.org_name}</span>
          </div>
          <div class="cover-field">
            <span class="cover-label">Date Range</span>
            <span class="cover-value">${new Date(
              report.scan_start_date
            ).toLocaleDateString()} - ${new Date(
    report.scan_end_date
  ).toLocaleDateString()}</span>
          </div>
          <div class="cover-field">
            <span class="cover-label">Version</span>
            <span class="cover-value">${report.version}</span>
          </div>
          <div class="cover-field">
            <span class="cover-label">Document Type</span>
            <span class="cover-value">${report.document_type}</span>
          </div>
        </div>

        <div class="signatures">
          <div class="signature-field">
            <div class="signature-label">Assessee</div>
            <div class="signature-line"></div>
            <div>${report.assessee || ""}</div>
          </div>
          <div class="signature-field">
            <div class="signature-label">Assessor</div>
            <div class="signature-line"></div>
            <div>${report.assessor || ""}</div>
          </div>
          <div class="signature-field">
            <div class="signature-label">Reviewer</div>
            <div class="signature-line"></div>
            <div>${report.reviewer || ""}</div>
          </div>
          <div class="signature-field">
            <div class="signature-label">Approved by</div>
            <div class="signature-line"></div>
            <div>${report.approver || ""}</div>
          </div>
        </div>
      </div>

      <div class="container">
        <!-- SCAN MANIFEST -->
        <div class="section">
          <h1>Scan Manifest</h1>
          <div class="manifest-table">
            <table>
              <tr>
                <td style="font-weight: bold; width: 300px;">Description</td>
                <td>Network Vulnerability Assessment</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Test Started On</td>
                <td>${new Date(
                  report.scan_start_date
                ).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Test Completed On</td>
                <td>${new Date(report.scan_end_date).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">No. of IPs Tested</td>
                <td>${report.total_ips_tested}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Test Performed At</td>
                <td>On-site</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Tool Used</td>
                <td>Nessus</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- EXECUTIVE SUMMARY -->
        <div class="section page-break">
          <h1>Executive Summary</h1>
          <p style="font-size: 16px; line-height: 1.7; margin-bottom: 30px;">
            This ${
              report.source_type
            } assessment was conducted to understand the vulnerabilities affecting the environment
            of <strong>${
              report.org_name
            }</strong>. The assessment utilized automated scanning tools and manual verification 
            techniques to identify security weaknesses that could potentially be exploited by malicious actors. The findings 
            presented in this report are categorized according to industry-standard risk severity levels to facilitate 
            prioritized remediation efforts.
          </p>
          
          <h2>Risk Model</h2>
          <table>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Severity</th>
                <th>CVSS Score</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${riskModel
                .map(
                  (risk) => `
                <tr>
                  <td>${risk.priority}</td>
                  <td><span style="${getSeverityStyle(risk.severity)}">${
                    risk.severity
                  }</span></td>
                  <td>${risk.cvss}</td>
                  <td>${risk.description}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- METHODOLOGY -->
        <div class="section">
          <h1>Methodology</h1>
          ${methodologySteps
            .map(
              (step, index) => `
            <div class="methodology-step">
              <strong>${
                index + 1
              }. ${step}:</strong> ${getMethodologyDescription(step)}
            </div>
          `
            )
            .join("")}
        </div>

        <!-- PROJECT SCOPE -->
        <div class="section page-break">
          <h1>Project Scope</h1>
          <table>
            <thead>
              <tr>
                <th style="width: 80px;">S.No</th>
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
          <p class="disclaimer">
            This assessment did not include brute-force, DoS, phishing, or physical methods.
          </p>
        </div>

        <!-- SUMMARY OF VULNERABLE HOSTS -->
        <div class="section">
          <h1>Summary of Vulnerable Hosts</h1>
          <table>
            <thead>
              <tr>
                <th>Host IP</th>
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
                  (host) => `
                <tr>
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
                <td style="font-weight: bold;">Grand Total</td>
                <td style="text-align: center; font-weight: bold;">${
                  report.critical_count
                }</td>
                <td style="text-align: center; font-weight: bold;">${
                  report.high_count
                }</td>
                <td style="text-align: center; font-weight: bold;">${
                  report.medium_count
                }</td>
                <td style="text-align: center; font-weight: bold;">${
                  report.low_count
                }</td>
                <td style="text-align: center; font-weight: bold;">${
                  report.total_vulnerabilities
                }</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- RISK-LEVEL SUMMARY -->
        <div class="section page-break">
          <h1>Risk-Level Summary</h1>
          <table style="width: 50%;">
            <thead>
              <tr>
                <th>Risk</th>
                <th style="text-align: center;">Count</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span style="${getSeverityStyle(
                  "critical"
                )}">Critical</span></td>
                <td style="text-align: center; font-weight: bold;">${
                  report.critical_count
                }</td>
              </tr>
              <tr>
                <td><span style="${getSeverityStyle("high")}">High</span></td>
                <td style="text-align: center; font-weight: bold;">${
                  report.high_count
                }</td>
              </tr>
              <tr>
                <td><span style="${getSeverityStyle(
                  "medium"
                )}">Medium</span></td>
                <td style="text-align: center; font-weight: bold;">${
                  report.medium_count
                }</td>
              </tr>
              <tr>
                <td><span style="${getSeverityStyle("low")}">Low</span></td>
                <td style="text-align: center; font-weight: bold;">${
                  report.low_count
                }</td>
              </tr>
              <tr>
                <td><span style="${getSeverityStyle(
                  "informational"
                )}">Informational</span></td>
                <td style="text-align: center; font-weight: bold;">${
                  report.info_count
                }</td>
              </tr>
              <tr class="total-row">
                <td style="font-weight: bold;">Total</td>
                <td style="text-align: center; font-weight: bold;">${
                  report.total_vulnerabilities
                }</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${
          report.zero_day_count > 0
            ? `
        <!-- ZERO-DAY VULNERABILITIES -->
        <div class="section zero-day-section page-break">
          <h1 style="color: #dc2626;">Zero-Day Vulnerabilities</h1>
          
          <h2>Zero-Day Risk Distribution</h2>
          <table style="margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #fef2f2;">
                <th>Risk Level</th>
                <th style="text-align: center;">Count</th>
              </tr>
            </thead>
            <tbody>
              ${["critical", "high", "medium", "low"]
                .map((severity) => {
                  const count = zeroDayVulns.filter(
                    (v) => v.severity === severity
                  ).length;
                  return count > 0
                    ? `
                  <tr>
                    <td><span style="${getSeverityStyle(severity)}">${
                        severity.charAt(0).toUpperCase() + severity.slice(1)
                      }</span></td>
                    <td style="text-align: center; font-weight: bold;">${count}</td>
                  </tr>
                `
                    : "";
                })
                .join("")}
            </tbody>
          </table>

          <h2>Detailed Zero-Day Vulnerabilities</h2>
          <table>
            <thead>
              <tr style="background-color: #fef2f2;">
                <th style="width: 60px;">S.No</th>
                <th>CVE ID</th>
                <th>Risk</th>
                <th>Host IP</th>
                <th>Name</th>
                <th>Recommended Fix</th>
              </tr>
            </thead>
            <tbody>
              ${zeroDayVulns
                .map(
                  (vuln, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td style="font-family: monospace;">${
                    vuln.cve_id || "N/A"
                  }</td>
                  <td><span style="${getSeverityStyle(vuln.severity)}">${
                    vuln.severity.charAt(0).toUpperCase() +
                    vuln.severity.slice(1)
                  }</span></td>
                  <td style="font-family: monospace;">${vuln.host_ip}</td>
                  <td>${vuln.vulnerability_name}</td>
                  <td>${
                    vuln.fix_recommendation ||
                    vuln.solution ||
                    "Update to latest version"
                  }</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        `
            : ""
        }

        <!-- ALL VULNERABILITIES WITH REMEDIATION -->
        <div class="section page-break">
          <h1>All Vulnerabilities with Remediation</h1>
          <table>
            <thead>
              <tr>
                <th style="width: 60px;">S.No</th>
                <th style="width: 100px;">Risk</th>
                <th style="width: 120px;">Host IP</th>
                <th>Vulnerability Name</th>
                <th>Fix Recommendation</th>
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
          <h1>Conclusion</h1>
          <div style="font-size: 16px; line-height: 1.7; space-y: 20px;">
            <p style="margin-bottom: 20px;">
              The vulnerability assessment of <strong>${
                report.org_name
              }</strong> has identified <strong>${
    report.total_vulnerabilities
  }</strong> vulnerabilities 
              across <strong>${
                report.total_ips_tested
              }</strong> tested systems. The findings reveal a mix of security issues ranging from 
              critical vulnerabilities requiring immediate attention to informational findings that provide security insights.
            </p>
            
            <p style="margin-bottom: 20px;">
              We strongly recommend prioritizing the remediation of <strong>${
                report.critical_count
              } critical</strong> and <strong>${
    report.high_count
  } high-severity</strong> vulnerabilities 
              as they pose the most significant risk to the organization&apos;s security posture. The <strong>${
                report.medium_count
              } medium-severity</strong> vulnerabilities 
              should be addressed in the next maintenance cycle, while low-severity issues can be scheduled for routine maintenance.
            </p>
            
            ${
              report.zero_day_count > 0
                ? `
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border: 2px solid #fecaca; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold;">
                <strong>Critical Notice:</strong> This assessment identified <strong>${report.zero_day_count} zero-day vulnerabilities</strong> that require 
                immediate attention due to their recent disclosure and potential for exploitation.
              </p>
            </div>
            `
                : ""
            }
            
            <p style="margin-bottom: 20px;">
              Following the remediation efforts, we recommend conducting a follow-up assessment to verify that vulnerabilities have been 
              properly addressed and that no new security issues have been introduced during the remediation process.
            </p>
            
            <p style="margin-bottom: 20px;">
              The cybersecurity landscape continues to evolve rapidly, with new threats and vulnerabilities emerging regularly. We recommend 
              implementing a continuous vulnerability management program that includes regular scanning, timely patching procedures, and 
              security awareness training for all personnel.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getMethodologyDescription(step: string): string {
  const descriptions: Record<string, string> = {
    "Asset Selection":
      "Identified and catalogued all systems within the defined scope for vulnerability assessment.",
    "Reachability checks":
      "Verified network connectivity and accessibility of target systems prior to scanning.",
    "Informed initiation":
      "Coordinated with system administrators and stakeholders before commencing security testing.",
    "Tool execution":
      "Conducted comprehensive vulnerability scans using Nessus and other security assessment tools.",
    "Consolidation & Validation":
      "Aggregated scan results and manually verified findings to reduce false positives.",
    "Severity Reclassification (if any)":
      "Reviewed and adjusted vulnerability severity ratings based on environmental context.",
    Reporting:
      "Compiled findings into this comprehensive report with detailed remediation guidance.",
    "Secure Sharing":
      "Delivered the final report through secure channels to authorized personnel only.",
  };
  return descriptions[step] || "Standard security assessment procedure.";
}
