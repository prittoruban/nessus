import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Vulnerability } from "@/types/vulnerability";

export interface ReportData {
  id: string;
  name: string;
  description?: string;
  file_name: string;
  total_vulnerabilities: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  upload_date: string;
  processed_date?: string;
}

export interface IPSummary {
  ip: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  vulnerabilities: Vulnerability[];
}

export interface CVESummary {
  cve: string;
  total: number;
  severity: string;
  affectedIPs: string[];
  description?: string;
  vulnerabilities: Vulnerability[];
}

export class PDFService {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private currentY: number = 20;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Generate comprehensive vulnerability report PDF
   */
  generateVulnerabilityReport(
    report: ReportData,
    vulnerabilities: Vulnerability[],
    options: {
      includeIPSummary?: boolean;
      includeCVESummary?: boolean;
      includeVulnerabilityDetails?: boolean;
      includeCharts?: boolean;
    } = {}
  ): void {
    const {
      includeIPSummary = true,
      includeCVESummary = true,
      includeVulnerabilityDetails = true,
      includeCharts = true,
    } = options;

    // Reset document
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();

    // Add title page
    this.addTitlePage(report);

    // Add executive summary with charts
    this.addExecutiveSummary(report, vulnerabilities, includeCharts);

    // Add severity distribution chart
    if (includeCharts) {
      this.addSeverityChart(report);
    }

    // Add IP-based analysis
    if (includeIPSummary) {
      this.addComprehensiveIPAnalysis(vulnerabilities);
    }

    // Add CVE-based analysis
    if (includeCVESummary) {
      this.addComprehensiveCVEAnalysis(vulnerabilities);
    }

    // Add complete vulnerability details (ALL vulnerabilities)
    if (includeVulnerabilityDetails) {
      this.addCompleteVulnerabilityDetails(vulnerabilities);
    }

    // Add recommendations
    this.addRecommendations(vulnerabilities);

    // Add appendix with detailed statistics
    this.addDetailedStatistics(report, vulnerabilities);

    // Add footer to all pages
    this.addFooters();
  }

  /**
   * Download the generated PDF
   */
  download(filename?: string): void {
    const defaultFilename = `vulnerability-report-${new Date().toISOString().split('T')[0]}.pdf`;
    this.doc.save(filename || defaultFilename);
  }

  /**
   * Get PDF as blob for further processing
   */
  getBlob(): Blob {
    return this.doc.output('blob');
  }

  /**
   * Add a new page and reset Y position
   */
  private addNewPage(): void {
    this.doc.addPage();
    this.currentY = 30;
  }

  /**
   * Add section header
   */
  private addSectionHeader(title: string): void {
    if (this.currentY > this.pageHeight - 60) {
      this.addNewPage();
    }

    this.doc.setFontSize(16);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(31, 41, 55);
    this.doc.text(title, this.margin, this.currentY);
    
    // Add underline
    this.doc.setDrawColor(59, 130, 246);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY + 3, this.pageWidth - this.margin, this.currentY + 3);
    
    this.currentY += 20;
  }

  /**
   * Add enhanced title page
   */
  private addTitlePage(report: ReportData): void {
    this.currentY = 40;

    // Company/Report Header
    this.doc.setFontSize(28);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(31, 41, 55);
    this.doc.text("VULNERABILITY ASSESSMENT", this.pageWidth / 2, this.currentY, { align: "center" });
    
    this.currentY += 15;
    this.doc.setFontSize(24);
    this.doc.setTextColor(59, 130, 246);
    this.doc.text("SECURITY REPORT", this.pageWidth / 2, this.currentY, { align: "center" });

    this.currentY += 30;
    this.doc.setFontSize(18);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(75, 85, 99);
    const reportTitle = this.doc.splitTextToSize(report.name, this.pageWidth - 80);
    this.doc.text(reportTitle, this.pageWidth / 2, this.currentY, { align: "center" });

    this.currentY += 40;

    // Report metadata box
    this.doc.setDrawColor(229, 231, 235);
    this.doc.setFillColor(249, 250, 251);
    this.doc.rect(40, this.currentY, this.pageWidth - 80, 80, 'FD');

    this.currentY += 20;
    this.doc.setFontSize(12);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(31, 41, 55);
    this.doc.text("REPORT DETAILS", 50, this.currentY);

    this.currentY += 15;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10);
    
    const details = [
      `Report ID: ${report.id}`,
      `Source File: ${report.file_name}`,
      `Scan Date: ${new Date(report.upload_date).toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      })}`,
      `Generated: ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      })}`,
      `Total Findings: ${report.total_vulnerabilities} vulnerabilities`
    ];

    details.forEach((detail) => {
      this.doc.text(detail, 50, this.currentY);
      this.currentY += 12;
    });

    // Risk overview
    this.currentY += 20;
    this.doc.setFontSize(14);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("RISK OVERVIEW", 40, this.currentY);

    this.currentY += 10;
    this.addSeveritySummaryTable(report);

    // Add description if available
    if (report.description) {
      this.currentY += 30;
      this.doc.setFontSize(12);
      this.doc.setFont("helvetica", "bold");
      this.doc.text("DESCRIPTION", 40, this.currentY);
      
      this.currentY += 15;
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(10);
      const description = this.doc.splitTextToSize(report.description, this.pageWidth - 80);
      this.doc.text(description, 40, this.currentY);
    }

    this.addNewPage();
  }

  /**
   * Add severity summary table
   */
  private addSeveritySummaryTable(report: ReportData): void {
    const severityData = [
      {
        severity: "HIGH",
        count: report.high_count,
        percentage: ((report.high_count / report.total_vulnerabilities) * 100).toFixed(1),
        description: "Critical security risks requiring immediate attention"
      },
      {
        severity: "MEDIUM", 
        count: report.medium_count,
        percentage: ((report.medium_count / report.total_vulnerabilities) * 100).toFixed(1),
        description: "Moderate risks that should be addressed promptly"
      },
      {
        severity: "LOW",
        count: report.low_count,
        percentage: ((report.low_count / report.total_vulnerabilities) * 100).toFixed(1),
        description: "Minor issues with lower security impact"
      },
      {
        severity: "INFO",
        count: report.info_count,
        percentage: ((report.info_count / report.total_vulnerabilities) * 100).toFixed(1),
        description: "Informational findings for awareness"
      }
    ];

    const tableData = severityData.map(item => [
      item.severity,
      item.count.toString(),
      `${item.percentage}%`,
      item.description
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [["Severity", "Count", "Percentage", "Description"]],
      body: tableData,
      theme: 'grid',
      styles: { 
        fontSize: 9,
        cellPadding: 5
      },
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 25 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'center', cellWidth: 25 },
        3: { cellWidth: 100 }
      },
      didParseCell: (data) => {
        if (data.row.index >= 0 && data.column.index === 0) {
          const severityIndex = data.row.index;
          const colors: [number, number, number][] = [
            [254, 226, 226], // Light red
            [255, 237, 213], // Light orange  
            [220, 252, 231], // Light green
            [243, 244, 246]  // Light gray
          ];
          data.cell.styles.fillColor = colors[severityIndex];
          data.cell.styles.textColor = [31, 41, 55];
        }
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.currentY = (this.doc as any).lastAutoTable?.finalY + 10 || this.currentY + 80;
  }

  /**
   * Add enhanced executive summary
   */
  private addExecutiveSummary(report: ReportData, vulnerabilities: Vulnerability[], includeCharts: boolean): void {
    this.addSectionHeader("EXECUTIVE SUMMARY");

    const uniqueIPs = new Set(vulnerabilities.map(v => v.ip_address)).size;
    const uniqueCVEs = new Set(vulnerabilities.filter(v => v.cve && v.cve !== 'N/A').map(v => v.cve)).size;
    
    const summary = [
      `This comprehensive vulnerability assessment report details ${report.total_vulnerabilities} security findings identified across ${uniqueIPs} unique IP addresses during the security scan conducted on ${new Date(report.upload_date).toLocaleDateString()}.`,
      "",
      `CRITICAL FINDINGS: ${report.high_count} high-severity vulnerabilities require immediate remediation to prevent potential security breaches and unauthorized access.`,
      "",
      `RISK ANALYSIS: The assessment identified ${uniqueCVEs} distinct CVE (Common Vulnerabilities and Exposures) entries, indicating specific, documented security vulnerabilities with available patches or mitigation strategies.`,
      "",
      `SCOPE: This report covers ${report.medium_count} medium-severity issues requiring prompt attention, ${report.low_count} low-severity findings for future consideration, and ${report.info_count} informational items for security awareness.`,
      "",
      "RECOMMENDATIONS: Prioritize high-severity vulnerabilities for immediate patching, implement network segmentation for affected systems, and establish a regular vulnerability management process."
    ];

    this.currentY += 10;
    this.doc.setFontSize(11);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(55, 65, 81);

    summary.forEach((paragraph) => {
      if (paragraph === "") {
        this.currentY += 8;
      } else {
        const splitText = this.doc.splitTextToSize(paragraph, this.pageWidth - 2 * this.margin);
        this.doc.text(splitText, this.margin, this.currentY);
        this.currentY += splitText.length * 6 + 8;
      }
      
      if (this.currentY > this.pageHeight - 50) {
        this.addNewPage();
      }
    });

    if (includeCharts) {
      this.currentY += 20;
      this.addKeyMetrics(report, uniqueIPs, uniqueCVEs);
    }

    this.addNewPage();
  }

  /**
   * Add key metrics section
   */
  private addKeyMetrics(report: ReportData, uniqueIPs: number, uniqueCVEs: number): void {
    this.doc.setFontSize(14);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(31, 41, 55);
    this.doc.text("KEY METRICS", this.margin, this.currentY);

    this.currentY += 20;

    // Create metrics boxes
    const metrics = [
      { label: "Total Vulnerabilities", value: report.total_vulnerabilities.toString(), color: [59, 130, 246] },
      { label: "Unique IP Addresses", value: uniqueIPs.toString(), color: [16, 185, 129] },
      { label: "Unique CVE Entries", value: uniqueCVEs.toString(), color: [245, 158, 11] },
      { label: "High Severity", value: report.high_count.toString(), color: [239, 68, 68] }
    ];

    const boxWidth = (this.pageWidth - 2 * this.margin - 30) / 4;
    let xPos = this.margin;

    metrics.forEach((metric) => {
      // Draw box
      this.doc.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
      this.doc.rect(xPos, this.currentY, boxWidth, 40, 'F');
      
      // Add white text
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFontSize(20);
      this.doc.setFont("helvetica", "bold");
      this.doc.text(metric.value, xPos + boxWidth/2, this.currentY + 20, { align: "center" });
      
      this.doc.setFontSize(8);
      this.doc.setFont("helvetica", "normal");
      const labelLines = this.doc.splitTextToSize(metric.label, boxWidth - 10);
      this.doc.text(labelLines, xPos + boxWidth/2, this.currentY + 30, { align: "center" });
      
      xPos += boxWidth + 10;
    });

    this.currentY += 50;
  }

  /**
   * Add severity distribution chart
   */
  private addSeverityChart(report: ReportData): void {
    this.addSectionHeader("SEVERITY DISTRIBUTION ANALYSIS");

    // Simple bar chart representation
    const maxCount = Math.max(report.high_count, report.medium_count, report.low_count, report.info_count);
    const chartWidth = this.pageWidth - 2 * this.margin - 60;
    const chartHeight = 100;
    
    const severities = [
      { name: "HIGH", count: report.high_count, color: [239, 68, 68] },
      { name: "MEDIUM", count: report.medium_count, color: [245, 158, 11] },
      { name: "LOW", count: report.low_count, color: [34, 197, 94] },
      { name: "INFO", count: report.info_count, color: [107, 114, 128] }
    ];

    this.currentY += 10;
    const chartStartY = this.currentY;

    severities.forEach((severity, index) => {
      const barHeight = maxCount > 0 ? (severity.count / maxCount) * chartHeight : 0;
      const barWidth = chartWidth / 4 - 10;
      const xPos = this.margin + 40 + index * (barWidth + 10);
      const yPos = chartStartY + chartHeight - barHeight;

      // Draw bar
      this.doc.setFillColor(severity.color[0], severity.color[1], severity.color[2]);
      this.doc.rect(xPos, yPos, barWidth, barHeight, 'F');

      // Add count label on top of bar
      this.doc.setTextColor(31, 41, 55);
      this.doc.setFontSize(10);
      this.doc.setFont("helvetica", "bold");
      this.doc.text(severity.count.toString(), xPos + barWidth/2, yPos - 5, { align: "center" });

      // Add severity label at bottom
      this.doc.setFontSize(8);
      this.doc.text(severity.name, xPos + barWidth/2, chartStartY + chartHeight + 15, { align: "center" });
    });

    this.currentY = chartStartY + chartHeight + 30;
    this.addNewPage();
  }

  private addComprehensiveIPAnalysis(vulnerabilities: Vulnerability[]): void {
    this.addSectionHeader("IP ADDRESS ANALYSIS");

    const ipSummary = this.groupByIPDetailed(vulnerabilities);
    
    this.doc.setFontSize(11);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(55, 65, 81);
    
    const introText = `This section provides detailed analysis of vulnerabilities by IP address. ${ipSummary.length} unique IP addresses were analyzed.`;
    const splitIntro = this.doc.splitTextToSize(introText, this.pageWidth - 2 * this.margin);
    this.doc.text(splitIntro, this.margin, this.currentY);
    this.currentY += splitIntro.length * 6 + 20;

    // Sort by total vulnerabilities (highest first)
    const sortedIPs = ipSummary.sort((a, b) => b.total - a.total);

    sortedIPs.forEach((ip, index) => {
      if (this.currentY > this.pageHeight - 100) {
        this.addNewPage();
      }

      // IP Header
      this.doc.setFontSize(12);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(31, 41, 55);
      this.doc.text(`${index + 1}. IP Address: ${ip.ip}`, this.margin, this.currentY);
      
      this.currentY += 15;

      // Vulnerability counts
      this.doc.setFontSize(10);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(75, 85, 99);
      this.doc.text(`Total: ${ip.total} | High: ${ip.high} | Medium: ${ip.medium} | Low: ${ip.low} | Info: ${ip.info}`, this.margin + 10, this.currentY);
      this.currentY += 20;
    });

    this.addNewPage();
  }

  private addComprehensiveCVEAnalysis(vulnerabilities: Vulnerability[]): void {
    this.addSectionHeader("CVE ANALYSIS");

    const cveSummary = this.groupByCVEDetailed(vulnerabilities);
    
    this.doc.setFontSize(11);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(55, 65, 81);
    
    const introText = `This section analyzes ${cveSummary.length} distinct CVE entries identified in the scan.`;
    const splitIntro = this.doc.splitTextToSize(introText, this.pageWidth - 2 * this.margin);
    this.doc.text(splitIntro, this.margin, this.currentY);
    this.currentY += splitIntro.length * 6 + 20;

    // Sort by severity and count
    const sortedCVEs = cveSummary.sort((a, b) => {
      const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, info: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      return severityDiff !== 0 ? severityDiff : b.total - a.total;
    });

    sortedCVEs.forEach((cve, index) => {
      if (this.currentY > this.pageHeight - 60) {
        this.addNewPage();
      }

      // CVE Header
      this.doc.setFontSize(12);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(31, 41, 55);
      this.doc.text(`${index + 1}. CVE: ${cve.cve}`, this.margin, this.currentY);
      
      this.currentY += 15;

      // CVE Details
      this.doc.setFontSize(10);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(75, 85, 99);
      this.doc.text(`Severity: ${cve.severity.toUpperCase()} | Occurrences: ${cve.total} | Affected IPs: ${cve.affectedIPs.length}`, this.margin + 10, this.currentY);
      this.currentY += 20;
    });

    this.addNewPage();
  }

  private addCompleteVulnerabilityDetails(vulnerabilities: Vulnerability[]): void {
    this.addSectionHeader("COMPLETE VULNERABILITY INVENTORY");

    this.doc.setFontSize(11);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(55, 65, 81);
    
    const introText = `This section contains all ${vulnerabilities.length} vulnerabilities identified during the scan.`;
    const splitIntro = this.doc.splitTextToSize(introText, this.pageWidth - 2 * this.margin);
    this.doc.text(splitIntro, this.margin, this.currentY);
    this.currentY += splitIntro.length * 6 + 20;

    // Sort by severity (high first), then by IP
    const sortedVulns = vulnerabilities.sort((a, b) => {
      const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, info: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      return severityDiff !== 0 ? severityDiff : a.ip_address.localeCompare(b.ip_address);
    });

    sortedVulns.forEach((vuln, index) => {
      if (this.currentY > this.pageHeight - 80) {
        this.addNewPage();
      }

      // Vulnerability header
      this.doc.setFontSize(10);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(31, 41, 55);
      this.doc.text(`${index + 1}. ${vuln.cve || 'N/A'} - ${vuln.ip_address}`, this.margin, this.currentY);
      
      this.currentY += 15;

      // Vulnerability details
      this.doc.setFontSize(9);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(75, 85, 99);
      
      this.doc.text(`Severity: ${vuln.severity.toUpperCase()}`, this.margin + 10, this.currentY);
      this.currentY += 10;

      this.doc.text(`Plugin: ${vuln.plugin_name || 'Unknown'}`, this.margin + 10, this.currentY);
      this.currentY += 10;

      // Full description
      if (vuln.description) {
        this.doc.setFont("helvetica", "bold");
        this.doc.text("Description:", this.margin + 10, this.currentY);
        this.currentY += 8;
        
        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(8);
        const description = this.doc.splitTextToSize(vuln.description, this.pageWidth - 2 * this.margin - 20);
        this.doc.text(description, this.margin + 10, this.currentY);
        this.currentY += description.length * 4 + 8;
      }

      this.currentY += 10;
    });

    this.addNewPage();
  }

  private addRecommendations(vulnerabilities: Vulnerability[]): void {
    this.addSectionHeader("SECURITY RECOMMENDATIONS");

    const highSeverityCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumSeverityCount = vulnerabilities.filter(v => v.severity === 'medium').length;

    const recommendations = [
      `Immediately address all ${highSeverityCount} high-severity vulnerabilities`,
      `Remediate ${mediumSeverityCount} medium-severity vulnerabilities within 30 days`,
      "Implement regular vulnerability scanning schedule",
      "Establish patch management process",
      "Review network segmentation for vulnerable systems"
    ];

    this.currentY += 10;

    recommendations.forEach((rec) => {
      this.doc.setFontSize(10);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(55, 65, 81);
      
      const bulletText = `• ${rec}`;
      const splitText = this.doc.splitTextToSize(bulletText, this.pageWidth - 2 * this.margin - 10);
      this.doc.text(splitText, this.margin + 10, this.currentY);
      this.currentY += splitText.length * 6 + 10;
    });

    this.addNewPage();
  }

  private addDetailedStatistics(report: ReportData, vulnerabilities: Vulnerability[]): void {
    this.addSectionHeader("DETAILED STATISTICS");

    const uniqueIPs = new Set(vulnerabilities.map(v => v.ip_address)).size;
    const uniqueCVEs = new Set(vulnerabilities.filter(v => v.cve && v.cve !== 'N/A').map(v => v.cve)).size;

    const stats = [
      `Total Vulnerabilities: ${vulnerabilities.length}`,
      `Unique IP Addresses: ${uniqueIPs}`,
      `Unique CVE Entries: ${uniqueCVEs}`,
      `High Severity: ${report.high_count} (${((report.high_count / report.total_vulnerabilities) * 100).toFixed(1)}%)`,
      `Medium Severity: ${report.medium_count} (${((report.medium_count / report.total_vulnerabilities) * 100).toFixed(1)}%)`,
      `Low Severity: ${report.low_count} (${((report.low_count / report.total_vulnerabilities) * 100).toFixed(1)}%)`,
      `Info Severity: ${report.info_count} (${((report.info_count / report.total_vulnerabilities) * 100).toFixed(1)}%)`
    ];

    this.currentY += 10;

    stats.forEach((stat) => {
      this.doc.setFontSize(10);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(55, 65, 81);
      this.doc.text(stat, this.margin, this.currentY);
      this.currentY += 15;
    });
  }

  private addFooters(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Add page number
      this.doc.setFontSize(9);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(107, 114, 128);
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin,
        this.pageHeight - 10,
        { align: "right" }
      );
      
      // Add generation info
      this.doc.text(
        `Generated: ${new Date().toLocaleDateString()} - Vulnerability Assessment Report`,
        this.margin,
        this.pageHeight - 10
      );
    }
  }

  private groupByIPDetailed(vulnerabilities: Vulnerability[]): IPSummary[] {
    const grouped = vulnerabilities.reduce((acc, vuln) => {
      if (!acc[vuln.ip_address]) {
        acc[vuln.ip_address] = { 
          ip: vuln.ip_address, 
          total: 0, 
          critical: 0,
          high: 0, 
          medium: 0, 
          low: 0, 
          info: 0,
          vulnerabilities: []
        };
      }
      acc[vuln.ip_address].total++;
      acc[vuln.ip_address][vuln.severity]++;
      acc[vuln.ip_address].vulnerabilities.push(vuln);
      return acc;
    }, {} as Record<string, IPSummary>);

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }

  private groupByCVEDetailed(vulnerabilities: Vulnerability[]): CVESummary[] {
    const grouped = vulnerabilities
      .filter(v => v.cve && v.cve !== 'N/A')
      .reduce((acc, vuln) => {
        if (!acc[vuln.cve]) {
          acc[vuln.cve] = {
            cve: vuln.cve,
            total: 0,
            severity: vuln.severity,
            affectedIPs: new Set<string>(),
            vulnerabilities: []
          };
        }
        acc[vuln.cve].total++;
        acc[vuln.cve].affectedIPs.add(vuln.ip_address);
        acc[vuln.cve].vulnerabilities.push(vuln);
        
        // Keep highest severity
        const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, info: 3 };
        if (severityOrder[vuln.severity] < severityOrder[acc[vuln.cve].severity]) {
          acc[vuln.cve].severity = vuln.severity;
        }
        return acc;
      }, {} as Record<string, { cve: string; total: number; severity: string; affectedIPs: Set<string>; vulnerabilities: Vulnerability[] }>);

    return Object.values(grouped)
      .map(item => ({
        ...item,
        affectedIPs: Array.from(item.affectedIPs),
      }))
      .sort((a, b) => {
        const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, info: 3 };
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        return severityDiff !== 0 ? severityDiff : b.total - a.total;
      });
  }
}
