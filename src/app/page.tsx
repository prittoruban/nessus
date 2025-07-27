"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";
import {
  BuildingOfficeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  ArrowPathIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  RadialLinearScale,
  Filler,
} from "chart.js";
import { Pie, Line, Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

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
  last_assessment_date?: string;
  next_assessment_due?: string;
}

interface OverviewStats {
  selectedOrg: Organization | null;
  previousIteration: {
    total_vulnerabilities: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    info_count: number;
    risk_score?: number;
  } | null;
  ipBreakdown: {
    ip_address: string;
    hostname: string;
    total_vulnerabilities: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    info_count: number;
    previous_total?: number;
    change?: number;
    risk_score?: number;
    compliance_score?: number;
    services?: string[];
    last_scan_date?: string;
  }[];
  trendData: {
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
    risk_score?: number;
  }[];
  complianceData: {
    framework: string;
    score: number;
    passed: number;
    failed: number;
    total: number;
    description?: string;
  }[];
  topVulnerabilities: {
    name: string;
    count: number;
    severity: string;
    cvss_score?: number;
    affected_hosts: number;
  }[];
  executiveSummary: {
    overall_risk_level: "low" | "medium" | "high" | "critical";
    improvement_percentage: number;
    critical_issues_resolved: number;
    new_critical_issues: number;
    time_to_remediation: number;
    patch_compliance: number;
  };
}

export default function DashboardPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedSourceType, setSelectedSourceType] = useState<
    "all" | "internal" | "external"
  >("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({
    selectedOrg: null,
    previousIteration: null,
    ipBreakdown: [],
    trendData: [],
    complianceData: [],
    topVulnerabilities: [],
    executiveSummary: {
      overall_risk_level: "low",
      improvement_percentage: 0,
      critical_issues_resolved: 0,
      new_critical_issues: 0,
      time_to_remediation: 0,
      patch_compliance: 0,
    },
  });
  const [viewMode, setViewMode] = useState<
    "charts" | "detailed" | "compliance" | "executive"
  >("charts");

  const fetchOrganizations = useCallback(
    async (searchQuery: string = "") => {
      if (!searchQuery.trim()) {
        setOrganizations([]);
        // Clear selection when search is empty
        setSelectedOrg(null);
        setOverviewStats({
          selectedOrg: null,
          previousIteration: null,
          ipBreakdown: [],
          trendData: [],
          complianceData: [],
          topVulnerabilities: [],
          executiveSummary: {
            overall_risk_level: "low",
            improvement_percentage: 0,
            critical_issues_resolved: 0,
            new_critical_issues: 0,
            time_to_remediation: 0,
            patch_compliance: 0,
          },
        });
        return;
      }

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

        // Add search filter
        if (searchQuery.trim()) {
          query = query.ilike("name", `%${searchQuery}%`);
        }

        // Add source type filter if not 'all'
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

            // Calculate risk score based on vulnerability distribution
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

        // Check if currently selected org is still in the results
        if (
          selectedOrg &&
          !processedOrgs.find((org) => org.id === selectedOrg.id)
        ) {
          // Selected org is no longer in results, clear selection
          setSelectedOrg(null);
          setOverviewStats({
            selectedOrg: null,
            previousIteration: null,
            ipBreakdown: [],
            trendData: [],
            complianceData: [],
            topVulnerabilities: [],
            executiveSummary: {
              overall_risk_level: "low",
              improvement_percentage: 0,
              critical_issues_resolved: 0,
              new_critical_issues: 0,
              time_to_remediation: 0,
              patch_compliance: 0,
            },
          });
        }
      } catch (err) {
        console.error("Error fetching organizations:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedSourceType, selectedOrg]
  );

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchOrganizations(searchTerm);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchOrganizations]);

  // Re-fetch organizations when source type changes
  useEffect(() => {
    if (searchTerm.trim()) {
      // Only clear selected organization if it's not in the new results
      // This will be handled after the fetch completes

      const timeoutId = setTimeout(() => {
        fetchOrganizations(searchTerm);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedSourceType, searchTerm, fetchOrganizations]);

  // Fetch detailed stats for selected organization with comprehensive analytics
  const fetchOrgDetails = async (org: Organization) => {
    setDetailsLoading(true);
    try {
      // Get latest reports for this organization (current and previous)
      const { data: reports, error: reportsError } = await supabase
        .from("reports")
        .select("*")
        .eq("org_id", org.id)
        .eq("status", "completed")
        .order("scan_end_date", { ascending: false })
        .limit(10); // Get more reports for trend analysis

      if (reportsError) throw reportsError;

      if (!reports || reports.length === 0) {
        setOverviewStats((prev) => ({
          ...prev,
          selectedOrg: org,
          previousIteration: null,
          ipBreakdown: [],
          trendData: [],
          complianceData: [],
          topVulnerabilities: [],
          executiveSummary: {
            overall_risk_level: "low",
            improvement_percentage: 0,
            critical_issues_resolved: 0,
            new_critical_issues: 0,
            time_to_remediation: 0,
            patch_compliance: 0,
          },
        }));
        return;
      }

      const currentReport = reports[0];
      const previousReport = reports[1];

      // Get IP breakdown for current report with enhanced data
      const { data: ipBreakdown, error: ipError } = await supabase
        .from("report_hosts")
        .select(
          `
          *,
          vulnerabilities (
            severity,
            cvss_score,
            service,
            port,
            protocol
          )
        `
        )
        .eq("report_id", currentReport.id)
        .order("total_vulnerabilities", { ascending: false });

      if (ipError) throw ipError;

      // Get top vulnerabilities across all hosts
      const { data: topVulns, error: vulnError } = await supabase
        .from("vulnerabilities")
        .select("vulnerability_name, severity, cvss_score, host_ip")
        .eq("report_id", currentReport.id)
        .order("cvss_score", { ascending: false });

      if (vulnError)
        console.error("Error fetching vulnerabilities:", vulnError);

      // Process top vulnerabilities
      const vulnCounts = (topVulns || []).reduce(
        (acc, vuln) => {
          const key = vuln.vulnerability_name;
          if (!acc[key]) {
            acc[key] = {
              name: vuln.vulnerability_name,
              count: 0,
              severity: vuln.severity,
              cvss_score: vuln.cvss_score,
              affected_hosts: new Set(),
            };
          }
          acc[key].count++;
          acc[key].affected_hosts.add(vuln.host_ip);
          return acc;
        },
        {} as Record<
          string,
          {
            name: string;
            count: number;
            severity: string;
            cvss_score: number;
            affected_hosts: Set<string>;
          }
        >
      );

      const topVulnerabilities = Object.values(vulnCounts)
        .map((v) => ({
          ...v,
          affected_hosts: v.affected_hosts.size,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get previous iteration data for comparison
      let ipBreakdownWithChanges =
        ipBreakdown?.map((currentIp) => {
          const services =
            currentIp.vulnerabilities
              ?.map((v: { service?: string }) => v.service)
              .filter((s: string | undefined): s is string => !!s)
              .filter(
                (value: string, index: number, self: string[]) =>
                  self.indexOf(value) === index
              ) || [];

          return {
            ...currentIp,
            services,
            last_scan_date: currentReport.scan_end_date,
            risk_score: Math.round(
              ((currentIp.critical_count * 10 +
                currentIp.high_count * 7 +
                currentIp.medium_count * 4 +
                currentIp.low_count * 1) /
                Math.max(currentIp.total_vulnerabilities, 1)) *
                10
            ),
            compliance_score: Math.max(
              0,
              100 - (currentIp.critical_count * 25 + currentIp.high_count * 15)
            ),
          };
        }) || [];

      if (previousReport) {
        const { data: previousIps } = await supabase
          .from("report_hosts")
          .select("*")
          .eq("report_id", previousReport.id);

        if (previousIps) {
          ipBreakdownWithChanges = ipBreakdownWithChanges.map((currentIp) => {
            const previousIp = previousIps.find(
              (prev) => prev.ip_address === currentIp.ip_address
            );
            return {
              ...currentIp,
              previous_total: previousIp?.total_vulnerabilities || 0,
              change:
                currentIp.total_vulnerabilities -
                (previousIp?.total_vulnerabilities || 0),
            };
          });
        }
      }

      // Get trend data (last 6-10 iterations)
      const trendData = reports
        .reverse()
        .slice(-6)
        .map((report) => ({
          date: new Date(report.scan_end_date).toLocaleDateString(),
          critical: report.critical_count,
          high: report.high_count,
          medium: report.medium_count,
          low: report.low_count,
          info: report.info_count,
          total: report.total_vulnerabilities,
          risk_score: org.risk_score,
        }));

      // Calculate realistic compliance data based on vulnerability analysis
      // This maps common vulnerabilities to compliance framework controls
      const calculateComplianceScore = (report: {
        total_vulnerabilities: number;
        critical_count: number;
        high_count: number;
        medium_count: number;
      }) => {
        const criticalVulns = report.critical_count;
        const highVulns = report.high_count;
        const mediumVulns = report.medium_count;

        // CIS Controls v8 - Focus on basic cyber hygiene
        const cisScore = Math.max(
          10,
          Math.min(
            100,
            100 - criticalVulns * 8 - highVulns * 4 - mediumVulns * 1.5
          )
        );
        const cisPassed = Math.floor((cisScore / 100) * 20);
        const cisFailed = 20 - cisPassed;

        // NIST Cybersecurity Framework - More comprehensive
        const nistScore = Math.max(
          15,
          Math.min(
            100,
            100 - criticalVulns * 6 - highVulns * 3.5 - mediumVulns * 1.2
          )
        );
        const nistPassed = Math.floor((nistScore / 100) * 23);
        const nistFailed = 23 - nistPassed;

        // ISO 27001 - Information security management
        const isoScore = Math.max(
          20,
          Math.min(
            100,
            100 - criticalVulns * 4 - highVulns * 2.5 - mediumVulns * 1
          )
        );
        const isoPassed = Math.floor((isoScore / 100) * 114);
        const isoFailed = 114 - isoPassed;

        return [
          {
            framework: "CIS Controls v8",
            score: Math.round(cisScore),
            passed: cisPassed,
            failed: cisFailed,
            total: 20,
            description: "Essential cyber security controls",
          },
          {
            framework: "NIST Cybersecurity Framework",
            score: Math.round(nistScore),
            passed: nistPassed,
            failed: nistFailed,
            total: 23,
            description: "Comprehensive cybersecurity framework",
          },
          {
            framework: "ISO 27001:2022",
            score: Math.round(isoScore),
            passed: isoPassed,
            failed: isoFailed,
            total: 114,
            description: "Information security management standard",
          },
        ];
      };

      const complianceData = calculateComplianceScore(currentReport);

      // Calculate executive summary
      const improvement = previousReport
        ? ((previousReport.total_vulnerabilities -
            currentReport.total_vulnerabilities) /
            previousReport.total_vulnerabilities) *
          100
        : 0;

      const criticalResolved = previousReport
        ? Math.max(
            0,
            previousReport.critical_count - currentReport.critical_count
          )
        : 0;

      const newCritical = previousReport
        ? Math.max(
            0,
            currentReport.critical_count - previousReport.critical_count
          )
        : currentReport.critical_count;

      const executiveSummary = {
        overall_risk_level:
          currentReport.critical_count > 10
            ? "critical"
            : currentReport.critical_count > 5
            ? "high"
            : currentReport.critical_count > 0
            ? "medium"
            : ("low" as "low" | "medium" | "high" | "critical"),
        improvement_percentage: Math.round(improvement),
        critical_issues_resolved: criticalResolved,
        new_critical_issues: newCritical,
        time_to_remediation: Math.round(30 - improvement * 0.3), // Mock calculation
        patch_compliance: Math.max(
          0,
          100 -
            (currentReport.critical_count * 10 + currentReport.high_count * 5)
        ),
      };

      setOverviewStats({
        selectedOrg: org,
        previousIteration: previousReport
          ? {
              total_vulnerabilities: previousReport.total_vulnerabilities,
              critical_count: previousReport.critical_count,
              high_count: previousReport.high_count,
              medium_count: previousReport.medium_count,
              low_count: previousReport.low_count,
              info_count: previousReport.info_count,
              risk_score: org.risk_score,
            }
          : null,
        ipBreakdown: ipBreakdownWithChanges,
        trendData,
        complianceData,
        topVulnerabilities,
        executiveSummary,
      });
    } catch (error) {
      console.error("Error fetching organization details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "text-red-700 bg-red-100 border-red-200";
      case "high":
        return "text-orange-700 bg-orange-100 border-orange-200";
      case "medium":
        return "text-yellow-700 bg-yellow-100 border-yellow-200";
      case "low":
        return "text-green-700 bg-green-100 border-green-200";
      default:
        return "text-gray-700 bg-gray-100 border-gray-200";
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 80) return "text-green-700 bg-green-100";
    if (score >= 60) return "text-yellow-700 bg-yellow-100";
    if (score >= 40) return "text-orange-700 bg-orange-100";
    return "text-red-700 bg-red-100";
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatChange = (change: number) => {
    if (change === 0) return "No change";
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  // Enhanced Chart configurations
  const severityChartData = selectedOrg
    ? {
        labels: ["Critical", "High", "Medium", "Low", "Info"],
        datasets: [
          {
            label: "Vulnerabilities",
            data: [
              selectedOrg.critical_count,
              selectedOrg.high_count,
              selectedOrg.medium_count,
              selectedOrg.low_count,
              selectedOrg.info_count,
            ],
            backgroundColor: [
              "#DC2626", // red-600
              "#EA580C", // orange-600
              "#D97706", // amber-600
              "#2563EB", // blue-600
              "#6B7280", // gray-500
            ],
            borderWidth: 2,
            borderColor: "#FFFFFF",
          },
        ],
      }
    : null;

  const trendChartData =
    overviewStats.trendData.length > 0
      ? {
          labels: overviewStats.trendData.map((d) => d.date),
          datasets: [
            {
              label: "Critical",
              data: overviewStats.trendData.map((d) => d.critical),
              borderColor: "#DC2626",
              backgroundColor: "#DC262620",
              tension: 0.4,
              fill: false,
            },
            {
              label: "High",
              data: overviewStats.trendData.map((d) => d.high),
              borderColor: "#EA580C",
              backgroundColor: "#EA580C20",
              tension: 0.4,
              fill: false,
            },
            {
              label: "Medium",
              data: overviewStats.trendData.map((d) => d.medium),
              borderColor: "#D97706",
              backgroundColor: "#D9770620",
              tension: 0.4,
              fill: false,
            },
            {
              label: "Total",
              data: overviewStats.trendData.map((d) => d.total),
              borderColor: "#374151",
              backgroundColor: "#37415120",
              tension: 0.4,
              fill: true,
              borderDash: [5, 5],
            },
          ],
        }
      : null;

  const complianceChartData =
    overviewStats.complianceData.length > 0
      ? {
          labels: overviewStats.complianceData.map((c) => c.framework),
          datasets: [
            {
              label: "Compliance Score",
              data: overviewStats.complianceData.map((c) => c.score),
              backgroundColor: overviewStats.complianceData.map((c) =>
                c.score >= 80
                  ? "#10B981"
                  : c.score >= 60
                  ? "#F59E0B"
                  : "#EF4444"
              ),
              borderRadius: 4,
              borderSkipped: false,
            },
          ],
        }
      : null;

  const topVulnChartData =
    overviewStats.topVulnerabilities.length > 0
      ? {
          labels: overviewStats.topVulnerabilities
            .slice(0, 5)
            .map((v) => v.name.substring(0, 30) + "..."),
          datasets: [
            {
              label: "Occurrences",
              data: overviewStats.topVulnerabilities
                .slice(0, 5)
                .map((v) => v.count),
              backgroundColor: overviewStats.topVulnerabilities
                .slice(0, 5)
                .map((v) =>
                  v.severity === "critical"
                    ? "#DC2626"
                    : v.severity === "high"
                    ? "#EA580C"
                    : v.severity === "medium"
                    ? "#D97706"
                    : "#2563EB"
                ),
              borderRadius: 4,
            },
          ],
        }
      : null;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center space-x-3">
              <PresentationChartLineIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">
                  Search for organizations to view comprehensive security
                  analysis and executive insights
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Organizations
                  </label>
                  <input
                    type="text"
                    placeholder="Enter organization name to search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Assessment Type Filter - Only show when searching */}
              {searchTerm.trim() && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Assessment Type
                  </label>
                  <select
                    value={selectedSourceType}
                    onChange={(e) =>
                      setSelectedSourceType(
                        e.target.value as "all" | "internal" | "external"
                      )
                    }
                    className="w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="all">All Assessments</option>
                    <option value="internal">Internal Only</option>
                    <option value="external">External Only</option>
                  </select>
                </div>
              )}

              {loading && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Searching organizations...</span>
                </div>
              )}

              {organizations.length > 0 && searchTerm && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Organization
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          setSelectedOrg(org);
                          fetchOrgDetails(org);
                        }}
                        className={`p-3 text-left rounded-lg border transition-colors ${
                          selectedOrg?.id === org.id
                            ? "border-blue-500 bg-blue-50 text-blue-900"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="font-medium">{org.name}</div>
                        <div className="text-sm text-gray-500 capitalize">
                          {org.source_type} Assessment •{" "}
                          {org.total_vulnerabilities} vulnerabilities
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {searchTerm && organizations.length === 0 && !loading && (
                <div className="text-center py-4 text-gray-500">
                  No organizations found matching &quot;{searchTerm}&quot;
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          {!searchTerm ? (
            /* Search Prompt */
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full mb-6">
                <PresentationChartLineIcon className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Search for Dashboard Overview
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Enter an organization name in the search box above to view
                comprehensive security posture analysis and executive insights.
              </p>
              <div className="text-sm text-gray-500">
                <p>Available features:</p>
                <ul className="mt-2 space-y-1 max-w-xs mx-auto">
                  <li>• Executive risk summary</li>
                  <li>• Compliance framework analysis</li>
                  <li>• Vulnerability trend tracking</li>
                  <li>• Interactive charts and metrics</li>
                </ul>
              </div>
            </div>
          ) : !selectedOrg ? (
            /* Selection Prompt */
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <PresentationChartLineIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select an Organization
              </h3>
              <p className="text-gray-600">
                Choose an organization from the search results above to view its
                dashboard overview.
              </p>
            </div>
          ) : (
            <Fragment>
              {/* View Mode Controls */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 sm:flex-none">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      View Mode
                    </label>
                    <select
                      value={viewMode}
                      onChange={(e) =>
                        setViewMode(
                          e.target.value as
                            | "charts"
                            | "detailed"
                            | "compliance"
                            | "executive"
                        )
                      }
                      className="w-full sm:w-auto border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="executive">Executive Summary</option>
                      <option value="charts">Charts View</option>
                      <option value="detailed">Detailed Analysis</option>
                      <option value="compliance">Compliance View</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Executive Overview Content */}
              <div className="space-y-6">
                {/* Organization Summary */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {selectedOrg.name} - Security Overview
                      </h2>
                      <p className="text-gray-600 mt-1">
                        {selectedOrg.source_type === "internal"
                          ? "Internal"
                          : "External"}{" "}
                        organization
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        Last scan:{" "}
                        {new Date(selectedOrg.latest_scan).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {detailsLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <>
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg sm:text-2xl font-bold text-gray-900">
                            {selectedOrg.total_ips}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            IPs Scanned
                          </div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg sm:text-2xl font-bold text-gray-900">
                            {selectedOrg.total_vulnerabilities}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            Total Vulnerabilities
                          </div>
                          {overviewStats.previousIteration && (
                            <div className="flex items-center justify-center mt-1">
                              {selectedOrg.total_vulnerabilities >
                              overviewStats.previousIteration
                                .total_vulnerabilities ? (
                                <ArrowTrendingUpIcon className="h-3 w-3 text-red-500 mr-1" />
                              ) : selectedOrg.total_vulnerabilities <
                                overviewStats.previousIteration
                                  .total_vulnerabilities ? (
                                <ArrowTrendingDownIcon className="h-3 w-3 text-green-500 mr-1" />
                              ) : null}
                              <span
                                className={`text-xs ${
                                  selectedOrg.total_vulnerabilities >
                                  overviewStats.previousIteration
                                    .total_vulnerabilities
                                    ? "text-red-500"
                                    : selectedOrg.total_vulnerabilities <
                                      overviewStats.previousIteration
                                        .total_vulnerabilities
                                    ? "text-green-500"
                                    : "text-gray-500"
                                }`}
                              >
                                {formatChange(
                                  calculateChange(
                                    selectedOrg.total_vulnerabilities,
                                    overviewStats.previousIteration
                                      .total_vulnerabilities
                                  )
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <div className="text-lg sm:text-2xl font-bold text-red-600">
                            {selectedOrg.critical_count}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            Critical
                          </div>
                          {overviewStats.previousIteration && (
                            <div className="flex items-center justify-center mt-1">
                              {selectedOrg.critical_count >
                              overviewStats.previousIteration.critical_count ? (
                                <ArrowTrendingUpIcon className="h-3 w-3 text-red-500 mr-1" />
                              ) : selectedOrg.critical_count <
                                overviewStats.previousIteration
                                  .critical_count ? (
                                <ArrowTrendingDownIcon className="h-3 w-3 text-green-500 mr-1" />
                              ) : null}
                              <span
                                className={`text-xs ${
                                  selectedOrg.critical_count >
                                  overviewStats.previousIteration.critical_count
                                    ? "text-red-500"
                                    : selectedOrg.critical_count <
                                      overviewStats.previousIteration
                                        .critical_count
                                    ? "text-green-500"
                                    : "text-gray-500"
                                }`}
                              >
                                {formatChange(
                                  calculateChange(
                                    selectedOrg.critical_count,
                                    overviewStats.previousIteration
                                      .critical_count
                                  )
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-lg sm:text-2xl font-bold text-orange-600">
                            {selectedOrg.high_count}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            High
                          </div>
                          {overviewStats.previousIteration && (
                            <div className="flex items-center justify-center mt-1">
                              {selectedOrg.high_count >
                              overviewStats.previousIteration.high_count ? (
                                <ArrowTrendingUpIcon className="h-3 w-3 text-red-500 mr-1" />
                              ) : selectedOrg.high_count <
                                overviewStats.previousIteration.high_count ? (
                                <ArrowTrendingDownIcon className="h-3 w-3 text-green-500 mr-1" />
                              ) : null}
                              <span
                                className={`text-xs ${
                                  selectedOrg.high_count >
                                  overviewStats.previousIteration.high_count
                                    ? "text-red-500"
                                    : selectedOrg.high_count <
                                      overviewStats.previousIteration.high_count
                                    ? "text-green-500"
                                    : "text-gray-500"
                                }`}
                              >
                                {formatChange(
                                  calculateChange(
                                    selectedOrg.high_count,
                                    overviewStats.previousIteration.high_count
                                  )
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Enhanced view mode content */}
                      {viewMode === "executive" ? (
                        /* Executive Summary Dashboard */
                        <div className="space-y-6">
                          {/* Executive KPIs */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div
                              className={`p-4 rounded-lg border-2 ${getRiskLevelColor(
                                overviewStats.executiveSummary
                                  .overall_risk_level
                              )}`}
                            >
                              <div className="text-center">
                                <div className="text-2xl font-bold capitalize">
                                  {
                                    overviewStats.executiveSummary
                                      .overall_risk_level
                                  }
                                </div>
                                <div className="text-sm font-medium">
                                  Overall Risk Level
                                </div>
                              </div>
                            </div>

                            <div className="p-4 rounded-lg border bg-white">
                              <div className="text-center">
                                <div
                                  className={`text-2xl font-bold ${
                                    overviewStats.executiveSummary
                                      .improvement_percentage >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {overviewStats.executiveSummary
                                    .improvement_percentage >= 0
                                    ? "+"
                                    : ""}
                                  {
                                    overviewStats.executiveSummary
                                      .improvement_percentage
                                  }
                                  %
                                </div>
                                <div className="text-sm text-gray-600">
                                  Security Improvement
                                </div>
                              </div>
                            </div>

                            <div className="p-4 rounded-lg border bg-white">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                  {
                                    overviewStats.executiveSummary
                                      .patch_compliance
                                  }
                                  %
                                </div>
                                <div className="text-sm text-gray-600">
                                  Patch Compliance
                                </div>
                              </div>
                            </div>

                            <div className="p-4 rounded-lg border bg-white">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                  {
                                    overviewStats.executiveSummary
                                      .time_to_remediation
                                  }{" "}
                                  days
                                </div>
                                <div className="text-sm text-gray-600">
                                  Avg. Remediation Time
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Critical Issues Summary */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-lg border p-6">
                              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                Critical Issues Status
                              </h4>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">
                                    Issues Resolved
                                  </span>
                                  <span className="text-sm font-medium text-green-600">
                                    +
                                    {
                                      overviewStats.executiveSummary
                                        .critical_issues_resolved
                                    }
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">
                                    New Critical Issues
                                  </span>
                                  <span className="text-sm font-medium text-red-600">
                                    +
                                    {
                                      overviewStats.executiveSummary
                                        .new_critical_issues
                                    }
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">
                                    Current Critical
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {selectedOrg.critical_count}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white rounded-lg border p-6">
                              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                Top Risk Areas
                              </h4>
                              <div className="space-y-3">
                                {overviewStats.topVulnerabilities
                                  .slice(0, 3)
                                  .map((vuln, index) => (
                                    <div
                                      key={index}
                                      className="flex justify-between items-center"
                                    >
                                      <span className="text-sm text-gray-600 truncate mr-2">
                                        {vuln.name.substring(0, 30)}...
                                      </span>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                          {vuln.affected_hosts} hosts
                                        </span>
                                        <span
                                          className={`text-xs px-2 py-1 rounded font-medium ${
                                            vuln.severity === "critical"
                                              ? "bg-red-100 text-red-800"
                                              : vuln.severity === "high"
                                              ? "bg-orange-100 text-orange-800"
                                              : "bg-yellow-100 text-yellow-800"
                                          }`}
                                        >
                                          {vuln.severity}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>

                          {/* Compliance Overview */}
                          <div className="bg-white rounded-lg border p-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">
                              Compliance Framework Status
                            </h4>
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                              <p className="text-sm text-amber-800">
                                <strong>Note:</strong> Compliance scores are
                                estimated based on vulnerability risk analysis.
                                Formal compliance certification requires
                                official audits.
                              </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {overviewStats.complianceData.map(
                                (framework, index) => (
                                  <div
                                    key={index}
                                    className="p-4 border rounded-lg"
                                  >
                                    <div className="text-center">
                                      <div
                                        className={`text-xl font-bold ${getComplianceColor(
                                          framework.score
                                        )}`}
                                      >
                                        {framework.score}%
                                      </div>
                                      <div className="text-sm font-medium text-gray-900 mt-1">
                                        {framework.framework}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-2">
                                        {framework.passed}/{framework.total}{" "}
                                        controls passed
                                      </div>
                                      {framework.description && (
                                        <div className="text-xs text-gray-400 mt-1">
                                          {framework.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      ) : viewMode === "compliance" ? (
                        /* Compliance Analysis View */
                        <div className="space-y-4 lg:space-y-6">
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
                            {/* Compliance Scores Chart */}
                            {complianceChartData && (
                              <div className="bg-white rounded-lg border p-4 lg:p-6">
                                <h4 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">
                                  Compliance Scores
                                </h4>
                                <div className="h-48 sm:h-64">
                                  <Bar
                                    data={complianceChartData}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      scales: {
                                        y: {
                                          beginAtZero: true,
                                          max: 100,
                                        },
                                      },
                                      plugins: {
                                        legend: {
                                          display: false,
                                        },
                                      },
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Top Vulnerabilities */}
                            {topVulnChartData && (
                              <div className="bg-white rounded-lg border p-4 lg:p-6">
                                <h4 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">
                                  Most Common Vulnerabilities
                                </h4>
                                <div className="h-48 sm:h-64">
                                  <Bar
                                    data={topVulnChartData}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      indexAxis: "y" as const,
                                      plugins: {
                                        legend: {
                                          display: false,
                                        },
                                      },
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Detailed Compliance Table */}
                          <div className="bg-white rounded-lg border p-4 lg:p-6">
                            <h4 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">
                              Detailed Compliance Analysis
                            </h4>
                            <div className="overflow-x-auto -mx-4 lg:mx-0">
                              <div className="min-w-full inline-block align-middle">
                                <div className="overflow-hidden border border-gray-200 md:rounded-lg">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Framework
                                        </th>
                                        <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Score
                                        </th>
                                        <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                                          Passed
                                        </th>
                                        <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                                          Failed
                                        </th>
                                        <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Status
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {overviewStats.complianceData.map(
                                        (framework, index) => (
                                          <tr key={index}>
                                            <td className="px-3 lg:px-6 py-4 text-sm font-medium text-gray-900">
                                              <div className="truncate max-w-[120px] sm:max-w-none">
                                                {framework.framework}
                                              </div>
                                            </td>
                                            <td className="px-3 lg:px-6 py-4 text-sm text-gray-900">
                                              <div className="flex items-center">
                                                <div className="w-12 sm:w-16 bg-gray-200 rounded-full h-2 mr-2 sm:mr-3">
                                                  <div
                                                    className={`h-2 rounded-full ${
                                                      framework.score >= 80
                                                        ? "bg-green-500"
                                                        : framework.score >= 60
                                                        ? "bg-yellow-500"
                                                        : "bg-red-500"
                                                    }`}
                                                    style={{
                                                      width: `${framework.score}%`,
                                                    }}
                                                  ></div>
                                                </div>
                                                <span className="font-medium text-xs sm:text-sm">
                                                  {framework.score}%
                                                </span>
                                              </div>
                                            </td>
                                            <td className="px-3 lg:px-6 py-4 text-sm text-green-600 hidden sm:table-cell">
                                              {framework.passed}
                                            </td>
                                            <td className="px-3 lg:px-6 py-4 text-sm text-red-600 hidden sm:table-cell">
                                              {framework.failed}
                                            </td>
                                            <td className="px-3 lg:px-6 py-4">
                                              <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                  framework.score >= 80
                                                    ? "bg-green-100 text-green-800"
                                                    : framework.score >= 60
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : "bg-red-100 text-red-800"
                                                }`}
                                              >
                                                {framework.score >= 80
                                                  ? "Compliant"
                                                  : framework.score >= 60
                                                  ? "Partial"
                                                  : "Non-compliant"}
                                              </span>
                                            </td>
                                          </tr>
                                        )
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>

                            {/* Compliance Assessment Disclaimer */}
                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-start">
                                <div className="flex-shrink-0">
                                  <svg
                                    className="h-5 w-5 text-blue-400"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                                <div className="ml-3">
                                  <h3 className="text-sm font-medium text-blue-800">
                                    Compliance Assessment Notice
                                  </h3>
                                  <div className="mt-2 text-sm text-blue-700">
                                    <p className="mb-2">
                                      <strong>
                                        These scores are risk-based estimates
                                      </strong>{" "}
                                      derived from vulnerability analysis, not
                                      formal compliance audits.
                                    </p>
                                    <ul className="list-disc list-inside space-y-1">
                                      <li>
                                        Calculations map vulnerability severity
                                        to framework control areas
                                      </li>
                                      <li>
                                        Actual compliance requires formal audits
                                        by certified assessors
                                      </li>
                                      <li>
                                        Use these metrics as security posture
                                        indicators, not compliance certification
                                      </li>
                                      <li>
                                        Critical and high vulnerabilities
                                        significantly impact compliance scores
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : viewMode === "charts" ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
                          {/* Severity Distribution Chart */}
                          {severityChartData && (
                            <div className="bg-white rounded-lg border p-4 lg:p-6">
                              <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-4">
                                Vulnerability Distribution
                              </h3>
                              <div className="h-48 sm:h-64">
                                <Pie
                                  data={severityChartData}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                      legend: {
                                        position: "bottom",
                                        labels: {
                                          boxWidth: 12,
                                          font: {
                                            size: 11,
                                          },
                                        },
                                      },
                                    },
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Trend Chart */}
                          {trendChartData && (
                            <div className="bg-white rounded-lg border p-4 lg:p-6">
                              <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-4">
                                Vulnerability Trends
                              </h3>
                              <div className="h-48 sm:h-64">
                                <Line
                                  data={trendChartData}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: {
                                      y: {
                                        beginAtZero: true,
                                      },
                                    },
                                    plugins: {
                                      legend: {
                                        position: "bottom",
                                      },
                                    },
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Detailed IP Breakdown */
                        <div className="bg-white rounded-lg border p-4 lg:p-6">
                          <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-4">
                            IP Address Breakdown
                          </h3>
                          <div className="overflow-x-auto -mx-4 lg:mx-0">
                            <div className="min-w-full inline-block align-middle">
                              <div className="overflow-hidden border border-gray-200 md:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        IP Address
                                      </th>
                                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                                        Hostname
                                      </th>
                                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total
                                      </th>
                                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                                        Critical
                                      </th>
                                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                                        High
                                      </th>
                                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                                        Medium
                                      </th>
                                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                                        Low
                                      </th>
                                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Change
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {overviewStats.ipBreakdown.map(
                                      (ip, index) => (
                                        <tr
                                          key={index}
                                          className="hover:bg-gray-50"
                                        >
                                          <td className="px-3 lg:px-6 py-4 text-sm font-medium text-gray-900">
                                            <div className="truncate max-w-[100px] sm:max-w-none">
                                              {ip.ip_address}
                                            </div>
                                          </td>
                                          <td className="px-3 lg:px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                                            <div className="truncate max-w-[120px] lg:max-w-none">
                                              {ip.hostname || "-"}
                                            </div>
                                          </td>
                                          <td className="px-3 lg:px-6 py-4 text-sm text-gray-900">
                                            {ip.total_vulnerabilities}
                                          </td>
                                          <td className="px-3 lg:px-6 py-4 text-sm text-red-600 hidden md:table-cell">
                                            {ip.critical_count}
                                          </td>
                                          <td className="px-3 lg:px-6 py-4 text-sm text-orange-600 hidden md:table-cell">
                                            {ip.high_count}
                                          </td>
                                          <td className="px-3 lg:px-6 py-4 text-sm text-yellow-600 hidden lg:table-cell">
                                            {ip.medium_count}
                                          </td>
                                          <td className="px-3 lg:px-6 py-4 text-sm text-blue-600 hidden lg:table-cell">
                                            {ip.low_count}
                                          </td>
                                          <td className="px-3 lg:px-6 py-4 text-sm">
                                            {ip.change !== undefined ? (
                                              <div className="flex items-center">
                                                {ip.change > 0 ? (
                                                  <ArrowTrendingUpIcon className="h-4 w-4 text-red-500 mr-1" />
                                                ) : ip.change < 0 ? (
                                                  <ArrowTrendingDownIcon className="h-4 w-4 text-green-500 mr-1" />
                                                ) : null}
                                                <span
                                                  className={`${
                                                    ip.change > 0
                                                      ? "text-red-500"
                                                      : ip.change < 0
                                                      ? "text-green-500"
                                                      : "text-gray-500"
                                                  }`}
                                                >
                                                  {ip.change > 0 ? "+" : ""}
                                                  {ip.change}
                                                </span>
                                              </div>
                                            ) : (
                                              <span className="text-gray-400">
                                                New
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Fragment>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
