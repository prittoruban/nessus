import { 
  ExecutiveReportView, 
  HostSummaryView, 
  VulnerabilityDetailView
} from "@/lib/validators/executive-report.schema";

interface ExecutiveReportData {
  reportData: ExecutiveReportView;
  hostSummary: HostSummaryView[];
  vulnerabilities: VulnerabilityDetailView[];
  zeroDayVulnerabilities: VulnerabilityDetailView[];
  nonZeroDayVulnerabilities: VulnerabilityDetailView[];
  riskSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
  zeroDayRiskSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
}

/**
 * Executive PDF Service for generating structured vulnerability assessment reports
 * This service creates PDFs using server-side PDF generation libraries
 * Matches the HTC Global Executive Summary VA Report format
 */
export class ExecutivePDFService {
  /**
   * Generate complete executive report PDF
   */
  static async generateExecutiveReport(
    data: ExecutiveReportData
  ): Promise<Buffer> {
    // Import PDF library dynamically to avoid SSR issues
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;

    // Helper function to update Y position after table
    const updateYAfterTable = (offset = 10) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docAny = doc as any;
      currentY = (docAny.lastAutoTable?.finalY || currentY) + offset;
    };

    // Helper function to add new page
    const addNewPage = () => {
      doc.addPage();
      currentY = margin;
    };

    // Helper function to add section header
    const addSectionHeader = (title: string) => {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(title, margin, currentY);
      currentY += 20;
    };

    // Helper function to add centered text
    const addCenteredText = (text: string, y: number) => {
      const textWidth = doc.getTextWidth(text);
      const x = (pageWidth - textWidth) / 2;
      doc.text(text, x, y);
    };

    // Helper function to add wrapped text
    const addWrappedText = (text: string, startY: number, maxWidth: number) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      let currentLineY = startY;
      
      lines.forEach((line: string) => {
        if (currentLineY > pageHeight - 30) {
          addNewPage();
          currentLineY = margin;
        }
        doc.text(line, margin, currentLineY);
        currentLineY += 6;
      });
      
      currentY = currentLineY + 5;
    };

    // Section 1: Cover Page
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    addCenteredText("Internal Vulnerability Assessment Report", currentY + 40);
    currentY += 80;

    // Organization info
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Organization: ${data.reportData.org_name}`, margin, currentY);
    currentY += 15;
    doc.text(`Version: ${data.reportData.version}`, margin, currentY);
    currentY += 15;
    const dateRange = data.reportData.formatted_start_date && data.reportData.formatted_end_date
      ? `${data.reportData.formatted_start_date} to ${data.reportData.formatted_end_date}`
      : "Not specified";
    doc.text(`Date Range: ${dateRange}`, margin, currentY);
    currentY += 15;
    doc.text(`Document Type: ${data.reportData.document_type}`, margin, currentY);

    // Section 2: Scan Manifest
    addNewPage();
    addSectionHeader("2. SCAN MANIFEST");
    
    const manifestData = [
      ["Description", data.reportData.scan_description],
      ["Test Started On", data.reportData.formatted_start_date || "Not specified"],
      ["Test Completed On", data.reportData.formatted_end_date || "Not specified"],
      ["No. of IPs Tested", data.reportData.number_of_ips.toString()],
      ["Test Performed At", data.reportData.test_location],
      ["Tool Used", data.reportData.tool_used]
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Label", "Value"]],
      body: manifestData,
      theme: "striped",
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 10 },
      margin: { left: margin, right: margin }
    });
    updateYAfterTable();

    // Section 3: Executive Summary
    addNewPage();
    addSectionHeader("3. EXECUTIVE SUMMARY");
    
    const summaryText = `This internal assessment was conducted to understand the vulnerabilities affecting the environment. The assessment provides insights into the security posture and recommends remediation measures to strengthen the overall security framework.`;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    addWrappedText(summaryText, currentY, pageWidth - 2 * margin);
    currentY += 20;

    // Risk Model Table
    const riskModelData = [
      ["P1", "Critical", "9.0–10.0", "Full system compromise, data exfiltration possible"],
      ["P2", "High", "7.0–8.9", "Major security flaws risking unauthorized access"],
      ["P3", "Medium", "4.0–6.9", "Security flaws that need chaining to become exploitable"],
      ["P4", "Low", "0.1–3.9", "Minor misconfigurations or indirect security threats"],
      ["P5", "Informational", "0.0", "Informational findings with no direct security impact"]
    ];

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Risk Model:", margin, currentY);
    currentY += 10;

    autoTable(doc, {
      startY: currentY,
      head: [["Priority", "Severity", "CVSS Score", "Description"]],
      body: riskModelData,
      theme: "striped",
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin }
    });
    updateYAfterTable();

    // Section 5: Project Scope
    addNewPage();
    addSectionHeader("5. PROJECT SCOPE");

    const scopeTableData = data.hostSummary.map((host, index) => [
      (index + 1).toString(),
      host.ip_address,
      host.status
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["S.No", "IP Address", "Status"]],
      body: scopeTableData,
      theme: "striped",
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 10 },
      margin: { left: margin, right: margin }
    });
    updateYAfterTable(15);

    // Section 6: Summary of Vulnerable Hosts
    addNewPage();
    addSectionHeader("6. SUMMARY OF VULNERABLE HOSTS");

    const hostSummaryData = data.hostSummary.map(host => [
      host.ip_address,
      host.critical_count.toString(),
      host.high_count.toString(),
      host.medium_count.toString(),
      host.low_count.toString(),
      host.total_count.toString()
    ]);

    // Calculate totals
    const totals = data.hostSummary.reduce((acc, host) => ({
      critical: acc.critical + host.critical_count,
      high: acc.high + host.high_count,
      medium: acc.medium + host.medium_count,
      low: acc.low + host.low_count,
      total: acc.total + host.total_count
    }), { critical: 0, high: 0, medium: 0, low: 0, total: 0 });

    hostSummaryData.push([
      "Grand Total",
      totals.critical.toString(),
      totals.high.toString(),
      totals.medium.toString(),
      totals.low.toString(),
      totals.total.toString()
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Host IP", "Critical", "High", "Medium", "Low", "Total"]],
      body: hostSummaryData,
      theme: "striped",
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 10 },
      margin: { left: margin, right: margin }
    });
    updateYAfterTable();

    // Section 7: Risk-Level Summary
    addNewPage();
    addSectionHeader("7. RISK-LEVEL SUMMARY");

    const riskSummaryData = [
      ["Critical", data.riskSummary.critical.toString()],
      ["High", data.riskSummary.high.toString()],
      ["Medium", data.riskSummary.medium.toString()],
      ["Low", data.riskSummary.low.toString()],
      ["Info", data.riskSummary.info.toString()],
      ["Total", data.riskSummary.total.toString()]
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Risk", "Count"]],
      body: riskSummaryData,
      theme: "striped",
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 11 },
      margin: { left: margin, right: margin }
    });
    updateYAfterTable();

    // Section 8: Zero-Day Vulnerabilities (if any)
    if (data.zeroDayVulnerabilities.length > 0) {
      addNewPage();
      addSectionHeader("8. ZERO-DAY VULNERABILITIES");

      const zeroDayRiskData = [
        ["Critical", data.zeroDayRiskSummary.critical.toString()],
        ["High", data.zeroDayRiskSummary.high.toString()],
        ["Medium", data.zeroDayRiskSummary.medium.toString()],
        ["Low", data.zeroDayRiskSummary.low.toString()],
        ["Info", data.zeroDayRiskSummary.info.toString()],
        ["Total", data.zeroDayRiskSummary.total.toString()]
      ];

      autoTable(doc, {
        startY: currentY,
        head: [["Risk", "Count"]],
        body: zeroDayRiskData,
        theme: "striped",
        headStyles: { fillColor: [220, 53, 69] },
        styles: { fontSize: 10 },
        margin: { left: margin, right: margin }
      });
      updateYAfterTable(20);

      // Detailed zero-day vulnerabilities
      const zeroDayTableData = data.zeroDayVulnerabilities.slice(0, 15).map(vuln => [
        vuln.serial_number.toString(),
        vuln.display_cve,
        vuln.risk_priority,
        vuln.ip_address,
        (vuln.vuln_name || "N/A").substring(0, 30),
        (vuln.solution || "Patch available").substring(0, 40)
      ]);

      if (zeroDayTableData.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [["S.No", "CVE ID", "Risk", "Host IP", "Name", "Recommended Fix"]],
          body: zeroDayTableData,
          theme: "striped",
          headStyles: { fillColor: [220, 53, 69] },
          styles: { fontSize: 8 },
          margin: { left: margin, right: margin }
        });
        updateYAfterTable();
      }
    }

    // Section 9: All Vulnerabilities with Remediation
    addNewPage();
    addSectionHeader("9. ALL VULNERABILITIES WITH REMEDIATION");

    if (data.nonZeroDayVulnerabilities.length > 0) {
      const allVulnTableData = data.nonZeroDayVulnerabilities.slice(0, 20).map(vuln => [
        vuln.serial_number.toString(),
        vuln.risk_priority,
        vuln.ip_address,
        (vuln.vuln_name || "N/A").substring(0, 35),
        (vuln.solution || "Apply security updates").substring(0, 45)
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [["S.No", "Risk", "Host IP", "Vulnerability Name", "Fix Recommendation"]],
        body: allVulnTableData,
        theme: "striped",
        headStyles: { fillColor: [66, 139, 202] },
        styles: { fontSize: 8 },
        margin: { left: margin, right: margin }
      });
      updateYAfterTable();
    }

    // Section 10: Conclusion
    addNewPage();
    addSectionHeader("10. CONCLUSION");

    const conclusion = data.reportData.conclusion || 
      `This assessment identified ${data.reportData.total_vulnerabilities} vulnerabilities that require attention. ` +
      `It is strongly recommended to implement the suggested remediation measures prioritizing critical and high-risk findings. ` +
      `A follow-up assessment should be conducted after remediation to verify the effectiveness of implemented fixes.`;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    addWrappedText(conclusion, currentY, pageWidth - 2 * margin);

    // Convert to Buffer
    const pdfArrayBuffer = doc.output("arraybuffer");
    return Buffer.from(pdfArrayBuffer);
  }

  /**
   * Generate filename based on organization and date
   */
  static generateFilename(orgName: string, date?: string): string {
    const cleanOrgName = orgName.replace(/[^a-zA-Z0-9]/g, '_');
    const monthYear = date ? new Date(date).toLocaleDateString('en-US', { 
      month: '2-digit', 
      year: 'numeric' 
    }).replace('/', '_') : new Date().toLocaleDateString('en-US', { 
      month: '2-digit', 
      year: 'numeric' 
    }).replace('/', '_');
    
    return `${cleanOrgName}_VA_Report_${monthYear}.pdf`;
  }
}
