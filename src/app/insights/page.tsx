"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import AppLayout from "@/components/AppLayout";
import SearchFilters from "@/components/SearchFilters";
import { supabase } from "@/lib/supabase";
import {
  ChartBarIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";

interface Organization {
  id: string;
  name: string;
  source_type: "internal" | "external";
  report_count: number;
  latest_scan: string;
  total_ips: number;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  risk_score?: number;
  compliance_status?: "compliant" | "non-compliant" | "partial";
}

interface Report {
  id: string;
  org_id: string;
  scan_start_date: string;
  scan_end_date: string;
  total_ips_tested: number;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  iteration_number: number;
  status: string;
}

interface Host {
  id: string;
  report_id: string;
  ip_address: string;
  hostname: string;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
}

interface Vulnerability {
  id: string;
  report_id: string;
  host_ip: string;
  vulnerability_name: string;
  severity: string;
  cvss_score: number;
  description: string;
  solution: string;
  cve_id: string;
  plugin_id: string;
  service: string;
  port: number;
  protocol: string;
  risk_factor: string;
  synopsis: string;
  see_also: string;
}

export default function InsightsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedSourceType, setSelectedSourceType] = useState<
    "all" | "internal" | "external"
  >("all");
  const [loading, setLoading] = useState(false);
  
  // New state for the multi-step workflow
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null);
  
  const [reportsLoading, setReportsLoading] = useState(false);
  const [hostsLoading, setHostsLoading] = useState(false);
  const [vulnerabilitiesLoading, setVulnerabilitiesLoading] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("organizations")
        .select(
          `
        id,
        name,
        source_type,
        reports (
          id,
          total_ips_tested,
          total_vulnerabilities,
          critical_count,
          high_count,
          medium_count,
          low_count,
          info_count,
          scan_end_date,
          iteration_number,
          status
        )
      `
        )
        .order("name");

      if (selectedSourceType !== "all") {
        query = query.eq("source_type", selectedSourceType);
      }

      const { data, error } = await query;

      if (error) throw error;

      const processedOrgs =
        data?.map((org) => {
          const completedReports = org.reports.filter(
            (r) => r.status === "completed"
          );
          const latestReport = completedReports.sort(
            (a, b) =>
              new Date(b.scan_end_date).getTime() -
              new Date(a.scan_end_date).getTime()
          )[0];

          const calculateRiskScore = (
            critical: number,
            high: number,
            medium: number,
            low: number,
            total: number
          ) => {
            if (total === 0) return 0;
            const criticalWeight = 10;
            const highWeight = 7;
            const mediumWeight = 4;
            const lowWeight = 1;

            const weightedScore =
              critical * criticalWeight +
              high * highWeight +
              medium * mediumWeight +
              low * lowWeight;
            const maxPossibleScore = total * criticalWeight;
            return Math.round((weightedScore / maxPossibleScore) * 100);
          };

          const riskScore = latestReport
            ? calculateRiskScore(
                latestReport.critical_count,
                latestReport.high_count,
                latestReport.medium_count,
                latestReport.low_count,
                latestReport.total_vulnerabilities
              )
            : 0;

          return {
            id: org.id,
            name: org.name,
            source_type: org.source_type,
            report_count: completedReports.length,
            latest_scan: latestReport?.scan_end_date || "",
            total_ips: latestReport?.total_ips_tested || 0,
            total_vulnerabilities: latestReport?.total_vulnerabilities || 0,
            critical_count: latestReport?.critical_count || 0,
            high_count: latestReport?.high_count || 0,
            medium_count: latestReport?.medium_count || 0,
            low_count: latestReport?.low_count || 0,
            info_count: latestReport?.info_count || 0,
            risk_score: riskScore,
            compliance_status:
              riskScore > 70
                ? "non-compliant"
                : riskScore > 40
                ? "partial"
                : ("compliant" as "compliant" | "non-compliant" | "partial"),
          };
        }) || [];

      setOrganizations(processedOrgs);
    } catch (err) {
      console.error("Error fetching organizations:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedSourceType]);

  const fetchReports = async (orgId: string) => {
    try {
      setReportsLoading(true);
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("org_id", orgId)
        .eq("status", "completed")
        .order("scan_end_date", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchHosts = async (reportId: string) => {
    try {
      setHostsLoading(true);
      const { data, error } = await supabase
        .from("report_hosts")
        .select("*")
        .eq("report_id", reportId)
        .order("total_vulnerabilities", { ascending: false });

      if (error) throw error;
      setHosts(data || []);
    } catch (err) {
      console.error("Error fetching hosts:", err);
    } finally {
      setHostsLoading(false);
    }
  };

  const fetchVulnerabilities = async (reportId: string, hostIp: string) => {
    try {
      setVulnerabilitiesLoading(true);
      const { data, error } = await supabase
        .from("vulnerabilities")
        .select("*")
        .eq("report_id", reportId)
        .eq("host_ip", hostIp)
        .order("cvss_score", { ascending: false });

      if (error) throw error;
      setVulnerabilities(data || []);
    } catch (err) {
      console.error("Error fetching vulnerabilities:", err);
    } finally {
      setVulnerabilitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleOrgSelect = (org: Organization) => {
    setSelectedOrg(org);
    setSelectedReport(null);
    setSelectedHost(null);
    setSelectedVulnerability(null);
    setReports([]);
    setHosts([]);
    setVulnerabilities([]);
    fetchReports(org.id);
  };

  const handleReportSelect = (report: Report) => {
    setSelectedReport(report);
    setSelectedHost(null);
    setSelectedVulnerability(null);
    setHosts([]);
    setVulnerabilities([]);
    fetchHosts(report.id);
  };

  const handleHostSelect = (host: Host) => {
    setSelectedHost(host);
    setSelectedVulnerability(null);
    setVulnerabilities([]);
    if (selectedReport) {
      fetchVulnerabilities(selectedReport.id, host.ip_address);
    }
  };

  const handleVulnerabilitySelect = (vulnerability: Vulnerability) => {
    setSelectedVulnerability(vulnerability);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "text-red-700 bg-red-100 border-red-200";
      case "high":
        return "text-orange-700 bg-orange-100 border-orange-200";
      case "medium":
        return "text-yellow-700 bg-yellow-100 border-yellow-200";
      case "low":
        return "text-blue-700 bg-blue-100 border-blue-200";
      case "info":
        return "text-gray-700 bg-gray-100 border-gray-200";
      default:
        return "text-gray-700 bg-gray-100 border-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return <ShieldExclamationIcon className="h-4 w-4 text-red-600" />;
      case "high":
        return <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />;
      case "medium":
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />;
      case "low":
        return <ExclamationTriangleIcon className="h-4 w-4 text-blue-600" />;
      default:
        return <DocumentTextIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center space-x-3">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Risk Insights</h1>
                <p className="text-gray-600">
                  Drill down into vulnerability details by organization, iteration, host, and specific vulnerabilities
                </p>
              </div>
            </div>
          </div>

          {/* Search Filters */}
          <SearchFilters
            organizations={organizations}
            selectedOrg={selectedOrg}
            selectedSourceType={selectedSourceType}
            loading={loading}
            onOrgSelect={handleOrgSelect}
            onSourceTypeChange={setSelectedSourceType}
          />

          {/* Content Area */}
          {!selectedOrg ? (
            /* Default Prompt */
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full mb-6">
                <ChartBarIcon className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Select Organization to Begin Risk Analysis
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Choose an assessment type and organization from the dropdowns above to start drilling down into vulnerability insights.
              </p>
              <div className="text-sm text-gray-500">
                <p>Analysis workflow:</p>
                <ul className="mt-2 space-y-1 max-w-xs mx-auto">
                  <li>• Select organization and iteration</li>
                  <li>• View scanned IP addresses</li>
                  <li>• Explore vulnerabilities per host</li>
                  <li>• Review detailed vulnerability information</li>
                </ul>
              </div>
            </div>
          ) : (
            <Fragment>
              {/* Iterations List */}
              {!selectedReport && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {selectedOrg.name} - Scan Iterations
                      </h2>
                      <p className="text-gray-600 mt-1">
                        Select an iteration to view detailed vulnerability analysis
                      </p>
                    </div>
                  </div>

                  {reportsLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : reports.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No scan iterations found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        No completed scans are available for this organization.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {reports.map((report) => (
                        <div
                          key={report.id}
                          onClick={() => handleReportSelect(report)}
                          className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md cursor-pointer transition-all duration-200"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-medium text-gray-900">
                              Iteration #{report.iteration_number}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(report.scan_end_date).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <div className="text-lg font-bold text-gray-900">{report.total_ips_tested}</div>
                              <div className="text-xs text-gray-600">IPs</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <div className="text-lg font-bold text-gray-900">{report.total_vulnerabilities}</div>
                              <div className="text-xs text-gray-600">Total</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-1">
                            <div className="text-center p-1 bg-red-50 rounded">
                              <div className="text-sm font-bold text-red-600">{report.critical_count}</div>
                              <div className="text-xs text-gray-600">Critical</div>
                            </div>
                            <div className="text-center p-1 bg-orange-50 rounded">
                              <div className="text-sm font-bold text-orange-600">{report.high_count}</div>
                              <div className="text-xs text-gray-600">High</div>
                            </div>
                            <div className="text-center p-1 bg-yellow-50 rounded">
                              <div className="text-sm font-bold text-yellow-600">{report.medium_count}</div>
                              <div className="text-xs text-gray-600">Medium</div>
                            </div>
                            <div className="text-center p-1 bg-blue-50 rounded">
                              <div className="text-sm font-bold text-blue-600">{report.low_count}</div>
                              <div className="text-xs text-gray-600">Low</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Three Column Layout */}
              {selectedReport && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedOrg.name} - Iteration #{selectedReport.iteration_number}
                        </h2>
                        <p className="text-gray-600 mt-1">
                          Scanned on {new Date(selectedReport.scan_end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedReport(null);
                          setSelectedHost(null);
                          setSelectedVulnerability(null);
                          setHosts([]);
                          setVulnerabilities([]);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        ← Back to Iterations
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Column 1: Hosts - Reduced space */}
                    <div className="space-y-4 lg:col-span-1">
                      <div className="flex items-center space-x-2">
                        <ComputerDesktopIcon className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-medium text-gray-900">IP Addresses</h3>
                        <span className="text-sm text-gray-500">({hosts.length})</span>
                      </div>

                      {hostsLoading ? (
                        <div className="flex items-center justify-center h-32">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {hosts.map((host) => (
                            <div
                              key={host.id}
                              onClick={() => handleHostSelect(host)}
                              className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                                selectedHost?.id === host.id
                                  ? "border-blue-300 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-medium text-gray-900 text-sm">
                                  {host.ip_address}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {host.total_vulnerabilities} vulns
                                </div>
                              </div>
                              {host.hostname && (
                                <div className="text-xs text-gray-600 mb-2 truncate">
                                  {host.hostname}
                                </div>
                              )}
                              <div className="flex space-x-1">
                                {host.critical_count > 0 && (
                                  <span className="text-xs px-1 py-0.5 bg-red-100 text-red-700 rounded">
                                    C:{host.critical_count}
                                  </span>
                                )}
                                {host.high_count > 0 && (
                                  <span className="text-xs px-1 py-0.5 bg-orange-100 text-orange-700 rounded">
                                    H:{host.high_count}
                                  </span>
                                )}
                                {host.medium_count > 0 && (
                                  <span className="text-xs px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                    M:{host.medium_count}
                                  </span>
                                )}
                                {host.low_count > 0 && (
                                  <span className="text-xs px-1 py-0.5 bg-blue-100 text-blue-700 rounded">
                                    L:{host.low_count}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Column 2: Vulnerabilities - Increased space */}
                    <div className={`space-y-4 lg:col-span-2 ${!selectedHost ? 'opacity-50' : ''}`}>
                      <div className="flex items-center space-x-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
                        <h3 className="text-lg font-medium text-gray-900">Vulnerabilities</h3>
                        {selectedHost && <span className="text-sm text-gray-500">({vulnerabilities.length})</span>}
                      </div>

                      {!selectedHost ? (
                        <div className="text-center py-8">
                          <ComputerDesktopIcon className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">Select an IP address to view vulnerabilities</p>
                        </div>
                      ) : vulnerabilitiesLoading ? (
                        <div className="flex items-center justify-center h-32">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {vulnerabilities.map((vuln) => (
                            <div
                              key={vuln.id}
                              onClick={() => handleVulnerabilitySelect(vuln)}
                              className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                                selectedVulnerability?.id === vuln.id
                                  ? "border-blue-300 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-start space-x-2 mb-2">
                                {getSeverityIcon(vuln.severity)}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 break-words">
                                    {vuln.vulnerability_name}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(vuln.severity)}`}>
                                  {vuln.severity}
                                </span>
                                <span className="text-xs text-gray-500">
                                  CVSS: {vuln.cvss_score}
                                </span>
                              </div>
                              {vuln.service && (
                                <div className="mt-2 text-xs text-gray-600">
                                  {vuln.service} ({vuln.port}/{vuln.protocol})
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Column 3: Vulnerability Details - Increased space */}
                    <div className={`space-y-4 lg:col-span-2 ${!selectedVulnerability ? 'opacity-50' : ''}`}>
                      <div className="flex items-center space-x-2">
                        <DocumentTextIcon className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-medium text-gray-900">Vulnerability Details</h3>
                      </div>

                      {!selectedVulnerability ? (
                        <div className="text-center py-8">
                          <ExclamationTriangleIcon className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">Select a vulnerability to view details</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Vulnerability Name</h4>
                            <p className="text-sm text-gray-700 break-words">{selectedVulnerability.vulnerability_name}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-1">Severity</h4>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(selectedVulnerability.severity)}`}>
                                {selectedVulnerability.severity}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-1">CVSS Score</h4>
                              <span className="text-sm text-gray-700">{selectedVulnerability.cvss_score}</span>
                            </div>
                          </div>

                          {selectedVulnerability.cve_id && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-1">CVE ID</h4>
                              <span className="text-sm text-gray-700">{selectedVulnerability.cve_id}</span>
                            </div>
                          )}

                          {selectedVulnerability.service && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-1">Service</h4>
                              <span className="text-sm text-gray-700">
                                {selectedVulnerability.service} (Port: {selectedVulnerability.port}/{selectedVulnerability.protocol})
                              </span>
                            </div>
                          )}

                          {selectedVulnerability.synopsis && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Synopsis</h4>
                              <p className="text-sm text-gray-700 break-words leading-relaxed">{selectedVulnerability.synopsis}</p>
                            </div>
                          )}

                          {selectedVulnerability.description && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                              <p className="text-sm text-gray-700 break-words leading-relaxed">{selectedVulnerability.description}</p>
                            </div>
                          )}

                          {selectedVulnerability.solution && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Solution</h4>
                              <p className="text-sm text-gray-700 break-words leading-relaxed">{selectedVulnerability.solution}</p>
                            </div>
                          )}

                          {selectedVulnerability.see_also && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">See Also</h4>
                              <p className="text-sm text-gray-700 break-words leading-relaxed">{selectedVulnerability.see_also}</p>
                            </div>
                          )}

                          {selectedVulnerability.plugin_id && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-1">Plugin ID</h4>
                              <span className="text-sm text-gray-700">{selectedVulnerability.plugin_id}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Fragment>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
