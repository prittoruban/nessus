import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  ExecutiveReportView, 
  HostSummaryView, 
  VulnerabilityDetailView,
  RISK_MODEL_DATA,
  METHODOLOGY_CONTENT
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

interface PdfOptions {
  includeCharts?: boolean;
  confidential?: boolean;
  watermark?: string;
}

/**
 * Executive PDF Service for generating structured vulnerability assessment reports
 * Matches the HTC Global Executive Summary VA Report format
 */
export class ExecutivePDFService {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private currentY: number = 20;
  private lineHeight: number = 6;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Generate complete executive report PDF
   */
  generateExecutiveReport(data: ExecutiveReportData, options: PdfOptions = {}): ArrayBuffer {
    const { reportData } = data;

    // Reset document
    this.doc = new jsPDF();
    this.currentY = this.margin;

    // Section 1: Cover Page
    this.addCoverPage(reportData);

    // Section 2: Scan Manifest
    this.addNewPage();
    this.addScanManifest(reportData);

    // Section 3: Executive Summary
    this.addNewPage();
    this.addExecutiveSummary();

    // Section 4: Methodology
    this.addNewPage();
    this.addMethodology();

    // Section 5: Project Scope
    this.addNewPage();
    this.addProjectScope(data);

    // Section 6: Summary of Vulnerable Hosts
    this.addNewPage();
    this.addHostSummary(data);

    // Section 7: Risk-Level Summary
    this.addNewPage();
    this.addRiskLevelSummary(data);

    // Section 8: Zero-Day Vulnerabilities
    if (data.zeroDayVulnerabilities.length > 0) {
      this.addNewPage();
      this.addZeroDayVulnerabilities(data);
    }

    // Section 9: All Vulnerabilities with Remediation
    this.addNewPage();
    this.addAllVulnerabilities(data);

    // Section 10: Conclusion
    this.addNewPage();
    this.addConclusion(reportData);

    // Add watermark if requested
    if (options.watermark) {
      this.addWatermark(options.watermark);
    }

    return this.doc.output("arraybuffer") as ArrayBuffer;
  }

  /**
   * Section 1: Cover Page
   */
  private addCoverPage(reportData: ExecutiveReportView): void {
    // Title
    this.doc.setFontSize(24);
    this.doc.setFont("helvetica", "bold");
    this.addCenteredText("Internal Vulnerability Assessment Report", this.currentY + 40);

    this.currentY += 80;

    // Organization and date info in grid layout
    this.doc.setFontSize(12);
    this.doc.setFont("helvetica", "normal");

    const leftCol = this.margin;
    const rightCol = this.pageWidth / 2 + 10;

    // Left column
    this.addLabelValue("Organization Name:", reportData.org_name, leftCol, this.currentY);
    this.addLabelValue("Version:", reportData.version, leftCol, this.currentY + 20);

    // Right column  
    const dateRange = reportData.formatted_start_date && reportData.formatted_end_date
      ? `${reportData.formatted_start_date} to ${reportData.formatted_end_date}`
      : "Not specified";
    this.addLabelValue("Date Range:", dateRange, rightCol, this.currentY);
    this.addLabelValue("Document Type:", reportData.document_type, rightCol, this.currentY + 20);

    this.currentY += 80;

    // Signature lines
    const signatures = [
      { label: "Assessee", name: reportData.assessee },
      { label: "Assessor", name: reportData.assessor },
      { label: "Reviewer", name: reportData.reviewer },
      { label: "Approved by", name: reportData.approver }
    ];

    signatures.forEach((sig, index) => {
      const yPos = this.currentY + (index * 30);
      this.doc.setFont("helvetica", "bold");
      this.doc.text(sig.label, leftCol, yPos);
      this.doc.setFont("helvetica", "normal");
      this.doc.line(leftCol + 30, yPos + 5, leftCol + 120, yPos + 5);
      if (sig.name) {
        this.doc.text(sig.name, leftCol + 30, yPos + 3);
      }
    });

    // Confidentiality disclaimers at bottom
    this.currentY = this.pageHeight - 60;
    this.doc.setFontSize(10);
    this.doc.setFont("helvetica", "normal");
    
    const disclaimer1 = reportData.legal_disclaimer || "This document contains confidential and proprietary information.";
    const disclaimer2 = `Confidentiality Level: ${reportData.confidentiality_level}`;
    
    this.addCenteredText(disclaimer1, this.currentY);
    this.addCenteredText(disclaimer2, this.currentY + 15);
  }

  /**
   * Section 2: Scan Manifest
   */
  private addScanManifest(reportData: ExecutiveReportView): void {
    this.addSectionHeader("2. SCAN MANIFEST");
    
    const manifestData = [
      ["Description", reportData.scan_description],
      ["Test Started On", reportData.formatted_start_date || "Not specified"],
      ["Test Completed On", reportData.formatted_end_date || "Not specified"],
      ["No. of IPs Tested", reportData.number_of_ips.toString()],
      ["Test Performed At", reportData.test_location],
      ["Tool Used", reportData.tool_used]
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [["Label", "Value"]],
      body: manifestData,
      theme: "striped",
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 10 },
      margin: { left: this.margin, right: this.margin }
    });

    // Use simplified typing for autoTable
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = this.doc as any;
    this.currentY = (doc.lastAutoTable?.finalY || this.currentY) + 10;
  }

  /**
   * Section 3: Executive Summary
   */
  private addExecutiveSummary(): void {
    this.addSectionHeader("3. EXECUTIVE SUMMARY");

    // Summary paragraph
    const summaryText = `This internal assessment was conducted to understand the vulnerabilities affecting the environment. The assessment provides insights into the security posture and recommends remediation measures to strengthen the overall security framework.`;
    
    this.doc.setFontSize(11);
    this.doc.setFont("helvetica", "normal");
    this.addWrappedText(summaryText, this.currentY, this.pageWidth - 2 * this.margin);
    
    this.currentY += 30;

    // Risk Model Table
    this.doc.setFontSize(12);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Risk Model:", this.margin, this.currentY);
    this.currentY += 10;

    const riskModelData = RISK_MODEL_DATA.map(risk => [
      risk.priority,
      risk.severity,
      risk.cvss_range,
      risk.description
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [["Priority", "Severity", "CVSS Score", "Description"]],
      body: riskModelData,
      theme: "striped",
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 9 },
      margin: { left: this.margin, right: this.margin },
      columnStyles: {
        3: { cellWidth: 80 }
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Section 4: Methodology
   */
  private addMethodology(): void {
    this.addSectionHeader("4. METHODOLOGY");

    this.doc.setFontSize(11);
    this.doc.setFont("helvetica", "normal");

    METHODOLOGY_CONTENT.forEach((step) => {
      if (this.currentY > this.pageHeight - 40) {
        this.addNewPage();
      }

      this.doc.setFont("helvetica", "bold");
      this.doc.text(`${step.step}. ${step.title}`, this.margin, this.currentY);
      
      this.currentY += this.lineHeight + 2;
      
      this.doc.setFont("helvetica", "normal");
      this.addWrappedText(step.description, this.currentY, this.pageWidth - 2 * this.margin);
      
      this.currentY += 16;
    });
  }

  /**
   * Section 5: Project Scope
   */
  private addProjectScope(data: ExecutiveReportData): void {
    this.addSectionHeader("5. PROJECT SCOPE");

    // Create table data from host summary
    const scopeTableData = data.hostSummary.map((host, index) => [
      (index + 1).toString(),
      host.ip_address,
      host.status
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [["S.No", "IP Address", "Status"]],
      body: scopeTableData,
      theme: "striped",
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 10 },
      margin: { left: this.margin, right: this.margin }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;

    // Disclaimer
    this.doc.setFontSize(10);
    this.doc.setFont("helvetica", "italic");
    const disclaimer = data.reportData.project_scope_notes || 
      "This assessment did not include brute-force, denial-of-service, phishing, or physical security testing methods.";
    this.addWrappedText(disclaimer, this.currentY, this.pageWidth - 2 * this.margin);
  }

  /**
   * Section 6: Summary of Vulnerable Hosts
   */
  private addHostSummary(data: ExecutiveReportData): void {
    this.addSectionHeader("6. SUMMARY OF VULNERABLE HOSTS");

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

    // Add totals row
    hostSummaryData.push([
      "Grand Total",
      totals.critical.toString(),
      totals.high.toString(),
      totals.medium.toString(),
      totals.low.toString(),
      totals.total.toString()
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [["Host IP", "Critical", "High", "Medium", "Low", "Total"]],
      body: hostSummaryData,
      theme: "striped",
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 10 },
      margin: { left: this.margin, right: this.margin },
      didParseCell: (data) => {
        // Highlight totals row
        if (data.row.index === hostSummaryData.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Section 7: Risk-Level Summary
   */
  private addRiskLevelSummary(data: ExecutiveReportData): void {
    this.addSectionHeader("7. RISK-LEVEL SUMMARY");

    const riskSummaryData = [
      ["Critical", data.riskSummary.critical.toString()],
      ["High", data.riskSummary.high.toString()],
      ["Medium", data.riskSummary.medium.toString()],
      ["Low", data.riskSummary.low.toString()],
      ["Info", data.riskSummary.info.toString()],
      ["Total", data.riskSummary.total.toString()]
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [["Risk", "Count"]],
      body: riskSummaryData,
      theme: "striped",
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 11 },
      margin: { left: this.margin, right: this.margin },
      didParseCell: (data) => {
        // Highlight total row
        if (data.row.index === riskSummaryData.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Section 8: Zero-Day Vulnerabilities
   */
  private addZeroDayVulnerabilities(data: ExecutiveReportData): void {
    this.addSectionHeader("8. ZERO-DAY VULNERABILITIES");

    // Part A: Risk-wise count
    this.doc.setFontSize(12);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Risk-wise Count:", this.margin, this.currentY);
    this.currentY += 10;

    const zeroDayRiskData = [
      ["Critical", data.zeroDayRiskSummary.critical.toString()],
      ["High", data.zeroDayRiskSummary.high.toString()],
      ["Medium", data.zeroDayRiskSummary.medium.toString()],
      ["Low", data.zeroDayRiskSummary.low.toString()],
      ["Info", data.zeroDayRiskSummary.info.toString()],
      ["Total", data.zeroDayRiskSummary.total.toString()]
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [["Risk", "Count"]],
      body: zeroDayRiskData,
      theme: "striped",
      headStyles: { fillColor: [220, 53, 69] },
      styles: { fontSize: 10 },
      margin: { left: this.margin, right: this.margin }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 20;

    // Part B: Detailed Table
    this.doc.setFontSize(12);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Detailed Zero-Day Vulnerabilities:", this.margin, this.currentY);
    this.currentY += 10;

    if (data.zeroDayVulnerabilities.length > 0) {
      const zeroDayTableData = data.zeroDayVulnerabilities.map(vuln => [
        vuln.serial_number.toString(),
        vuln.display_cve,
        vuln.risk_priority,
        vuln.ip_address,
        this.truncateText(vuln.vuln_name || "N/A", 30),
        this.truncateText(vuln.solution || "Patch available", 40)
      ]);

      this.addPaginatedTable({
        startY: this.currentY,
        head: [["S.No", "CVE ID", "Risk", "Host IP", "Name", "Recommended Fix"]],
        body: zeroDayTableData,
        theme: "striped",
        headStyles: { fillColor: [220, 53, 69] },
        styles: { fontSize: 8 },
        margin: { left: this.margin, right: this.margin }
      });
    } else {
      this.doc.setFont("helvetica", "normal");
      this.doc.text("No zero-day vulnerabilities found.", this.margin, this.currentY);
      this.currentY += 10;
    }
  }

  /**
   * Section 9: All Vulnerabilities with Remediation
   */
  private addAllVulnerabilities(data: ExecutiveReportData): void {
    this.addSectionHeader("9. ALL VULNERABILITIES WITH REMEDIATION");

    if (data.nonZeroDayVulnerabilities.length > 0) {
      const allVulnTableData = data.nonZeroDayVulnerabilities.map(vuln => [
        vuln.serial_number.toString(),
        vuln.risk_priority,
        vuln.ip_address,
        this.truncateText(vuln.vuln_name || "N/A", 35),
        this.truncateText(vuln.solution || "Apply security updates", 45)
      ]);

      this.addPaginatedTable({
        startY: this.currentY,
        head: [["S.No", "Risk", "Host IP", "Vulnerability Name", "Fix Recommendation"]],
        body: allVulnTableData,
        theme: "striped",
        headStyles: { fillColor: [66, 139, 202] },
        styles: { fontSize: 8 },
        margin: { left: this.margin, right: this.margin }
      });
    } else {
      this.doc.setFont("helvetica", "normal");
      this.doc.text("No additional vulnerabilities found.", this.margin, this.currentY);
      this.currentY += 10;
    }
  }

  /**
   * Section 10: Conclusion
   */
  private addConclusion(reportData: ExecutiveReportView): void {
    this.addSectionHeader("10. CONCLUSION");

    const conclusion = reportData.conclusion || 
      `This assessment identified ${reportData.total_vulnerabilities} vulnerabilities that require attention. ` +
      `It is strongly recommended to implement the suggested remediation measures prioritizing critical and high-risk findings. ` +
      `A follow-up assessment should be conducted after remediation to verify the effectiveness of implemented fixes. ` +
      `The security landscape continues to evolve, requiring ongoing vigilance and regular assessment activities.`;

    this.doc.setFontSize(11);
    this.doc.setFont("helvetica", "normal");
    this.addWrappedText(conclusion, this.currentY, this.pageWidth - 2 * this.margin);
  }

  /**
   * Helper Methods
   */
  private addNewPage(): void {
    this.doc.addPage();
    this.currentY = this.margin;
  }

  private addSectionHeader(title: string): void {
    this.doc.setFontSize(16);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 20;
  }

  private addCenteredText(text: string, y: number): void {
    const textWidth = this.doc.getTextWidth(text);
    const x = (this.pageWidth - textWidth) / 2;
    this.doc.text(text, x, y);
  }

  private addLabelValue(label: string, value: string, x: number, y: number): void {
    this.doc.setFont("helvetica", "bold");
    this.doc.text(label, x, y);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(value || "Not specified", x, y + 10);
  }

  private addWrappedText(text: string, startY: number, maxWidth: number): void {
    const lines = this.doc.splitTextToSize(text, maxWidth);
    let currentLineY = startY;
    
    lines.forEach((line: string) => {
      if (currentLineY > this.pageHeight - 30) {
        this.addNewPage();
        currentLineY = this.margin;
      }
      this.doc.text(line, this.margin, currentLineY);
      currentLineY += this.lineHeight;
    });
    
    this.currentY = currentLineY + 5;
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + "..." : text;
  }

  private addPaginatedTable(options: any): void {
    const itemsPerPage = 20;
    const totalItems = options.body.length;
    
    for (let i = 0; i < totalItems; i += itemsPerPage) {
      if (i > 0) {
        this.addNewPage();
      }
      
      const currentPageItems = options.body.slice(i, i + itemsPerPage);
      
      autoTable(this.doc, {
        ...options,
        startY: this.currentY,
        body: currentPageItems
      });
      
      this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
    }
  }

  private addWatermark(watermarkText: string): void {
    const totalPages = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.doc.setGState(this.doc.GState({ opacity: 0.1 }));
      this.doc.setFontSize(50);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(128, 128, 128);
      
      // Rotate and center watermark
      const centerX = this.pageWidth / 2;
      const centerY = this.pageHeight / 2;
      
      this.doc.text(watermarkText, centerX, centerY, {
        align: "center",
        angle: 45
      });
      
      // Reset state
      this.doc.setGState(this.doc.GState({ opacity: 1 }));
      this.doc.setTextColor(0, 0, 0);
    }
  }

  /**
   * Generate and return PDF as buffer
   */
  getBuffer(): Uint8Array {
    return new Uint8Array(this.doc.output("arraybuffer"));
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
