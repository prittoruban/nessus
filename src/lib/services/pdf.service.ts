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
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface CVESummary {
  cve: string;
  total: number;
  severity: string;
  affectedIPs: string[];
}

export class PDFService {
  private doc: jsPDF;

  constructor() {
    this.doc = new jsPDF();
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
    } = {}
  ): void {
    const {
      includeIPSummary = true,
      includeCVESummary = true,
      includeVulnerabilityDetails = true,
    } = options;

    // Reset document
    this.doc = new jsPDF();

    // Add title page
    this.addTitlePage(report);

    // Add executive summary
    this.addExecutiveSummary(report, vulnerabilities);

    // Add IP-based summary
    if (includeIPSummary) {
      this.addIPSummary(vulnerabilities);
    }

    // Add CVE-based grouping
    if (includeCVESummary) {
      this.addCVESummary(vulnerabilities);
    }

    // Add detailed vulnerability list
    if (includeVulnerabilityDetails) {
      this.addVulnerabilityDetails(vulnerabilities);
    }

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
   * Add title page
   */
  private addTitlePage(report: ReportData): void {
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const pageHeight = this.doc.internal.pageSize.getHeight();

    // Title
    this.doc.setFontSize(24);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Vulnerability Assessment Report", pageWidth / 2, 50, { align: "center" });

    // Report name
    this.doc.setFontSize(18);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(report.name, pageWidth / 2, 80, { align: "center" });

    // Report details box
    this.doc.setFontSize(12);
    const details = [
      `Report ID: ${report.id}`,
      `File Name: ${report.file_name}`,
      `Upload Date: ${new Date(report.upload_date).toLocaleDateString()}`,
      `Processed Date: ${report.processed_date ? new Date(report.processed_date).toLocaleDateString() : 'N/A'}`,
      `Total Vulnerabilities: ${report.total_vulnerabilities}`,
    ];

    let yPos = 120;
    details.forEach((detail) => {
      this.doc.text(detail, 40, yPos);
      yPos += 15;
    });

    // Severity summary
    this.doc.setFontSize(14);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Severity Summary", 40, yPos + 20);

    const severityData = [
      ["Severity", "Count", "Percentage"],
      ["High", report.high_count.toString(), `${((report.high_count / report.total_vulnerabilities) * 100).toFixed(1)}%`],
      ["Medium", report.medium_count.toString(), `${((report.medium_count / report.total_vulnerabilities) * 100).toFixed(1)}%`],
      ["Low", report.low_count.toString(), `${((report.low_count / report.total_vulnerabilities) * 100).toFixed(1)}%`],
      ["Info", report.info_count.toString(), `${((report.info_count / report.total_vulnerabilities) * 100).toFixed(1)}%`],
    ];

    autoTable(this.doc, {
      startY: yPos + 30,
      head: [severityData[0]],
      body: severityData.slice(1),
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Description if available
    if (report.description) {
      this.doc.setFontSize(12);
      this.doc.setFont("helvetica", "normal");
      this.doc.text("Description:", 40, pageHeight - 80);
      const splitDescription = this.doc.splitTextToSize(report.description, pageWidth - 80);
      this.doc.text(splitDescription, 40, pageHeight - 65);
    }

    // Add new page for content
    this.doc.addPage();
  }

  /**
   * Add executive summary
   */
  private addExecutiveSummary(report: ReportData, vulnerabilities: Vulnerability[]): void {
    this.doc.setFontSize(16);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Executive Summary", 20, 30);

    this.doc.setFontSize(12);
    this.doc.setFont("helvetica", "normal");

    const summary = [
      `This vulnerability assessment report contains ${report.total_vulnerabilities} vulnerabilities identified across ${new Set(vulnerabilities.map(v => v.ip_address)).size} unique IP addresses.`,
      "",
      `The scan results show ${report.high_count} high-severity vulnerabilities that require immediate attention, ${report.medium_count} medium-severity issues, ${report.low_count} low-severity findings, and ${report.info_count} informational items.`,
      "",
      `Key findings include ${new Set(vulnerabilities.filter(v => v.cve && v.cve !== 'N/A').map(v => v.cve)).size} unique CVE identifiers, indicating specific security vulnerabilities that should be prioritized for remediation.`,
    ];

    let yPos = 50;
    summary.forEach((line) => {
      if (line === "") {
        yPos += 10;
      } else {
        const splitText = this.doc.splitTextToSize(line, 170);
        this.doc.text(splitText, 20, yPos);
        yPos += splitText.length * 7 + 5;
      }
    });

    this.doc.addPage();
  }

  /**
   * Add IP-based summary section
   */
  private addIPSummary(vulnerabilities: Vulnerability[]): void {
    this.doc.setFontSize(16);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("IP Address Summary", 20, 30);

    // Group vulnerabilities by IP
    const ipSummary = this.groupByIP(vulnerabilities);

    const tableData = ipSummary.map((ip) => [
      ip.ip,
      ip.total.toString(),
      ip.high.toString(),
      ip.medium.toString(),
      ip.low.toString(),
      ip.info.toString(),
    ]);

    autoTable(this.doc, {
      startY: 45,
      head: [["IP Address", "Total", "High", "Medium", "Low", "Info"]],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20 },
        2: { cellWidth: 20, fillColor: [254, 226, 226] },
        3: { cellWidth: 20, fillColor: [255, 237, 213] },
        4: { cellWidth: 20, fillColor: [220, 252, 231] },
        5: { cellWidth: 20, fillColor: [243, 244, 246] },
      },
    });

    this.doc.addPage();
  }

  /**
   * Add CVE-based summary section
   */
  private addCVESummary(vulnerabilities: Vulnerability[]): void {
    this.doc.setFontSize(16);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("CVE Analysis", 20, 30);

    // Group vulnerabilities by CVE
    const cveSummary = this.groupByCVE(vulnerabilities);

    const tableData = cveSummary.slice(0, 20).map((cve) => [
      cve.cve,
      cve.total.toString(),
      cve.severity,
      cve.affectedIPs.slice(0, 3).join(", ") + (cve.affectedIPs.length > 3 ? "..." : ""),
    ]);

    autoTable(this.doc, {
      startY: 45,
      head: [["CVE", "Count", "Severity", "Affected IPs"]],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20 },
        2: { cellWidth: 25 },
        3: { cellWidth: 75 },
      },
    });

    if (cveSummary.length > 20) {
      this.doc.setFontSize(10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = (this.doc as any).lastAutoTable?.finalY || 180;
      this.doc.text(`Note: Showing top 20 CVEs. Total unique CVEs: ${cveSummary.length}`, 20, finalY + 20);
    }

    this.doc.addPage();
  }

  /**
   * Add detailed vulnerability list
   */
  private addVulnerabilityDetails(vulnerabilities: Vulnerability[]): void {
    this.doc.setFontSize(16);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Detailed Vulnerability List", 20, 30);

    // Sort by severity (high first)
    const severityOrder = { high: 0, medium: 1, low: 2, info: 3 };
    const sortedVulns = vulnerabilities
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
      .slice(0, 50); // Limit to first 50 for PDF size

    const tableData = sortedVulns.map((vuln) => [
      vuln.ip_address,
      vuln.cve || "N/A",
      vuln.severity.toUpperCase(),
      vuln.plugin_name || "N/A",
      (vuln.description || "").substring(0, 100) + (vuln.description && vuln.description.length > 100 ? "..." : ""),
    ]);

    autoTable(this.doc, {
      startY: 45,
      head: [["IP Address", "CVE", "Severity", "Plugin", "Description"]],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20 },
        3: { cellWidth: 40 },
        4: { cellWidth: 70 },
      },
    });

    if (vulnerabilities.length > 50) {
      this.doc.setFontSize(10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = (this.doc as any).lastAutoTable?.finalY || 200;
      this.doc.text(`Note: Showing first 50 vulnerabilities. Total: ${vulnerabilities.length}`, 20, finalY + 20);
    }
  }

  /**
   * Add footers to all pages
   */
  private addFooters(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Add page number
      this.doc.setFontSize(10);
      this.doc.setFont("helvetica", "normal");
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.doc.internal.pageSize.getWidth() - 30,
        this.doc.internal.pageSize.getHeight() - 10,
        { align: "right" }
      );
      
      // Add generation date
      this.doc.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        20,
        this.doc.internal.pageSize.getHeight() - 10
      );
    }
  }

  /**
   * Group vulnerabilities by IP address
   */
  private groupByIP(vulnerabilities: Vulnerability[]): IPSummary[] {
    const grouped = vulnerabilities.reduce((acc, vuln) => {
      if (!acc[vuln.ip_address]) {
        acc[vuln.ip_address] = { ip: vuln.ip_address, total: 0, high: 0, medium: 0, low: 0, info: 0 };
      }
      acc[vuln.ip_address].total++;
      acc[vuln.ip_address][vuln.severity]++;
      return acc;
    }, {} as Record<string, IPSummary>);

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }

  /**
   * Group vulnerabilities by CVE
   */
  private groupByCVE(vulnerabilities: Vulnerability[]): CVESummary[] {
    const grouped = vulnerabilities
      .filter(v => v.cve && v.cve !== 'N/A')
      .reduce((acc, vuln) => {
        if (!acc[vuln.cve]) {
          acc[vuln.cve] = {
            cve: vuln.cve,
            total: 0,
            severity: vuln.severity,
            affectedIPs: new Set<string>(),
          };
        }
        acc[vuln.cve].total++;
        acc[vuln.cve].affectedIPs.add(vuln.ip_address);
        // Keep highest severity
        const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, info: 3 };
        if (severityOrder[vuln.severity] < severityOrder[acc[vuln.cve].severity]) {
          acc[vuln.cve].severity = vuln.severity;
        }
        return acc;
      }, {} as Record<string, { cve: string; total: number; severity: string; affectedIPs: Set<string> }>);

    return Object.values(grouped)
      .map(item => ({
        ...item,
        affectedIPs: Array.from(item.affectedIPs),
      }))
      .sort((a, b) => b.total - a.total);
  }
}
