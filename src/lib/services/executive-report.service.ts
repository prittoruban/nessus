import { supabase } from '@/lib/supabase';
import { 
  Report, 
  ReportHost, 
  Vulnerability, 
  ExecutiveReportData,
  HostVulnerabilitySummary,
  VulnerabilityStats,
  ZeroDayVulnerability,
  VulnerabilityWithRemediation
} from '@/types/vulnerability';

export class ExecutiveReportService {
  
  /**
   * Fetch all data needed for the executive report
   */
  async getExecutiveReportData(reportId: string): Promise<ExecutiveReportData | null> {
    try {
      // Fetch report details
      const report = await this.getReportDetails(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      // Fetch all related data in parallel
      const [
        hosts,
        vulnerabilities,
        hostSummaries,
        vulnerabilityStats
      ] = await Promise.all([
        this.getReportHosts(reportId),
        this.getVulnerabilities(reportId),
        this.getHostVulnerabilitySummaries(reportId),
        this.getVulnerabilityStats(reportId)
      ]);

      // Process zero-day vulnerabilities
      const zeroDayVulnerabilities = vulnerabilities
        .filter((vuln): vuln is ZeroDayVulnerability => vuln.is_zero_day)
        .sort((a, b) => this.getSeverityOrder(b.severity) - this.getSeverityOrder(a.severity));

      // Process all vulnerabilities with remediation
      const allVulnerabilitiesWithRemediation = vulnerabilities
        .map(vuln => ({
          ...vuln,
          recommended_fix: this.generateRecommendedFix(vuln)
        }))
        .sort((a, b) => this.getSeverityOrder(b.severity) - this.getSeverityOrder(a.severity));

      return {
        report,
        hosts,
        vulnerabilities,
        hostSummaries,
        vulnerabilityStats,
        zeroDayVulnerabilities,
        allVulnerabilitiesWithRemediation
      };

    } catch (error) {
      console.error('Error fetching executive report data:', error);
      return null;
    }
  }

  /**
   * Get report details
   */
  private async getReportDetails(reportId: string): Promise<Report | null> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) {
      console.error('Error fetching report:', error);
      return null;
    }

    return data;
  }

  /**
   * Get report hosts
   */
  private async getReportHosts(reportId: string): Promise<ReportHost[]> {
    const { data, error } = await supabase
      .from('report_hosts')
      .select('*')
      .eq('report_id', reportId)
      .order('ip_address');

    if (error) {
      console.error('Error fetching report hosts:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get vulnerabilities for the report
   */
  private async getVulnerabilities(reportId: string): Promise<Vulnerability[]> {
    const { data, error } = await supabase
      .from('vulnerabilities')
      .select('*')
      .eq('report_id', reportId)
      .order('severity', { ascending: false })
      .order('cvss_score', { ascending: false });

    if (error) {
      console.error('Error fetching vulnerabilities:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get host vulnerability summaries
   */
  private async getHostVulnerabilitySummaries(reportId: string): Promise<HostVulnerabilitySummary[]> {
    const { data, error } = await supabase
      .from('report_hosts')
      .select(`
        ip_address,
        hostname,
        critical_count,
        high_count,
        medium_count,
        low_count,
        total_count
      `)
      .eq('report_id', reportId)
      .order('total_count', { ascending: false });

    if (error) {
      console.error('Error fetching host summaries:', error);
      return [];
    }

    return (data || []).map(host => ({
      ip_address: host.ip_address,
      hostname: host.hostname,
      critical: host.critical_count,
      high: host.high_count,
      medium: host.medium_count,
      low: host.low_count,
      total: host.total_count
    }));
  }

  /**
   * Get vulnerability statistics
   */
  private async getVulnerabilityStats(reportId: string): Promise<VulnerabilityStats> {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        total_vulnerabilities,
        critical_count,
        high_count,
        medium_count,
        low_count,
        info_count
      `)
      .eq('id', reportId)
      .single();

    if (error) {
      console.error('Error fetching vulnerability stats:', error);
      return {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      };
    }

    return {
      total: data.total_vulnerabilities || 0,
      critical: data.critical_count || 0,
      high: data.high_count || 0,
      medium: data.medium_count || 0,
      low: data.low_count || 0,
      info: data.info_count || 0
    };
  }

  /**
   * Generate recommended fix for a vulnerability
   */
  generateRecommendedFix(vulnerability: Vulnerability): string {
    // Use existing solution if available
    if (vulnerability.solution) {
      return vulnerability.solution;
    }

    // Generate generic recommendations based on vulnerability type
    const pluginName = vulnerability.plugin_name?.toLowerCase() || '';
    const vulnName = vulnerability.vuln_name?.toLowerCase() || '';
    
    if (pluginName.includes('ssl') || vulnName.includes('ssl')) {
      return 'Update SSL/TLS configuration and certificates to use secure protocols and cipher suites.';
    }
    
    if (pluginName.includes('smb') || vulnName.includes('smb')) {
      return 'Configure SMB signing, disable unnecessary SMB versions, and apply latest security patches.';
    }
    
    if (pluginName.includes('rdp') || vulnName.includes('rdp')) {
      return 'Implement network-level authentication, use strong encryption, and restrict RDP access.';
    }
    
    if (pluginName.includes('patch') || vulnName.includes('update')) {
      return 'Apply the latest security patches and updates from the vendor.';
    }
    
    if (vulnerability.cve && vulnerability.cve !== 'N/A') {
      return `Apply security patch for ${vulnerability.cve}. Consult vendor advisories for specific remediation steps.`;
    }
    
    // Default recommendation
    return 'Review configuration settings and apply security best practices according to vendor guidelines.';
  }

  /**
   * Get severity order for sorting
   */
  private getSeverityOrder(severity: string): number {
    const order = {
      'critical': 5,
      'high': 4,
      'medium': 3,
      'low': 2,
      'info': 1
    };
    return order[severity as keyof typeof order] || 0;
  }

  /**
   * Generate PDF filename for the report
   */
  generatePDFFilename(report: Report): string {
    const orgName = report.org_name.replace(/[^A-Za-z0-9]/g, '_');
    const date = report.scan_end_date || report.scan_start_date || report.created_at;
    const month = new Date(date).toLocaleString('default', { month: '2-digit' });
    const year = new Date(date).getFullYear();
    
    return `${orgName}_VA_Report_${month}_${year}.pdf`;
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format date range for display
   */
  formatDateRange(startDate?: string, endDate?: string): string {
    if (!startDate && !endDate) return 'N/A';
    if (!endDate) return this.formatDate(startDate!);
    if (!startDate) return this.formatDate(endDate);
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return this.formatDate(startDate);
    }
    
    return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
  }
}
