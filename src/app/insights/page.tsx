"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/AppLayout";
import SearchFilters from "@/components/SearchFilters";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  ChartPieIcon,
  PresentationChartLineIcon,
  TableCellsIcon,
  ArrowsRightLeftIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
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
}

interface IterationData {
  iteration_number: number;
  report_id: string;
  scan_date: string;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  total_vulnerabilities: number;
}

interface HostIterationData {
  ip_address: string;
  hostname?: string;
  iterations: IterationData[];
}

interface RiskInsightData {
  organization: Organization;
  hosts: HostIterationData[];
}

interface Vulnerability {
  id: string;
  vulnerability_name: string;
  severity: string;
  cvss_score?: number;
  description?: string;
  solution?: string;
  port?: number;
  protocol?: string;
  service?: string;
  cve_id?: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
    stack?: string;
  }[];
}

interface TrendAnalysis {
  totalHosts: number;
  totalIterations: number;
  averageVulnsPerHost: number;
  criticalTrend: "up" | "down" | "stable";
  highTrend: "up" | "down" | "stable";
  riskScore: number;
}

const severityConfig = {
  critical: {
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
    icon: ExclamationTriangleIcon,
  },
  high: {
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
    icon: ExclamationTriangleIcon,
  },
  medium: {
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 border-yellow-200",
    icon: ExclamationTriangleIcon,
  },
  low: {
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    icon: ShieldCheckIcon,
  },
  info: {
    color: "text-gray-600",
    bgColor: "bg-gray-50 border-gray-200",
    icon: InformationCircleIcon,
  },
};

export default function RiskInsightsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedSourceType, setSelectedSourceType] = useState<
    "all" | "internal" | "external"
  >("all");
  const [riskData, setRiskData] = useState<RiskInsightData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedHost, setSelectedHost] = useState<string | null>(null);
  const [hostVulnerabilities, setHostVulnerabilities] = useState<
    Vulnerability[]
  >([]);
  const [vulnLoading, setVulnLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "charts">("charts");
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(
    null
  );
  const [chartData, setChartData] = useState<{
    vulnerabilityTrend: ChartData | null;
    severityDistribution: ChartData | null;
    hostComparison: ChartData | null;
    riskProgression: ChartData | null;
  }>({
    vulnerabilityTrend: null,
    severityDistribution: null,
    hostComparison: null,
    riskProgression: null,
  });

  // Don't fetch organizations automatically - only when user searches
  // useEffect(() => {
  //   fetchOrganizations();
  // }, []);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

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
    } catch (err) {
      console.error("Error fetching organizations:", err);
      setError("Failed to fetch organizations");
    } finally {
      setLoading(false);
    }
  }, [selectedSourceType]);

  // Initial load and when source type changes
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    fetchOrganizations();
  }, [selectedSourceType, fetchOrganizations]);

  // Fetch risk data when organization or source type changes
  const fetchRiskInsights = useCallback(async () => {
    if (!selectedOrgId) return;

    try {
      setDataLoading(true);
      setError("");

      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", selectedOrgId)
        .single();

      if (orgError) throw orgError;

      // Build query for reports
      let reportsQuery = supabase
        .from("reports")
        .select(
          `
          id,
          iteration_number,
          scan_start_date,
          critical_count,
          high_count,
          medium_count,
          low_count,
          info_count,
          total_vulnerabilities
        `
        )
        .eq("org_id", selectedOrgId)
        .eq("status", "completed")
        .order("iteration_number", { ascending: true });

      // Apply source type filter if not 'all'
      if (selectedSourceType !== "all") {
        reportsQuery = reportsQuery.eq("source_type", selectedSourceType);
      }

      const { data: reportsData, error: reportsError } = await reportsQuery;

      if (reportsError) throw reportsError;

      if (!reportsData || reportsData.length === 0) {
        setRiskData({ organization: orgData, hosts: [] });
        generateChartData({ organization: orgData, hosts: [] });
        return;
      }

      // Get report hosts for all reports
      const reportIds = reportsData.map((r) => r.id);
      const { data: hostsData, error: hostsError } = await supabase
        .from("report_hosts")
        .select(
          `
          ip_address,
          hostname,
          report_id,
          critical_count,
          high_count,
          medium_count,
          low_count,
          info_count,
          total_vulnerabilities
        `
        )
        .in("report_id", reportIds)
        .order("ip_address");

      if (hostsError) throw hostsError;

      // Group data by IP address
      const hostMap = new Map<string, HostIterationData>();

      hostsData?.forEach((host) => {
        const report = reportsData.find((r) => r.id === host.report_id);
        if (!report) return;

        const ipKey = host.ip_address;
        if (!hostMap.has(ipKey)) {
          hostMap.set(ipKey, {
            ip_address: host.ip_address,
            hostname: host.hostname,
            iterations: [],
          });
        }

        const hostData = hostMap.get(ipKey)!;
        hostData.iterations.push({
          iteration_number: report.iteration_number,
          report_id: host.report_id,
          scan_date: report.scan_start_date,
          critical_count: host.critical_count || 0,
          high_count: host.high_count || 0,
          medium_count: host.medium_count || 0,
          low_count: host.low_count || 0,
          info_count: host.info_count || 0,
          total_vulnerabilities: host.total_vulnerabilities || 0,
        });
      });

      // Sort iterations within each host
      hostMap.forEach((hostData) => {
        hostData.iterations.sort(
          (a, b) => a.iteration_number - b.iteration_number
        );
      });

      const hosts = Array.from(hostMap.values());
      const riskInsightData = { organization: orgData, hosts };

      setRiskData(riskInsightData);
      generateChartData(riskInsightData);
      generateTrendAnalysis(riskInsightData);
    } catch (err) {
      console.error("Error fetching risk insights:", err);
      setError("Failed to fetch risk insights data");
    } finally {
      setDataLoading(false);
    }
  }, [selectedOrgId, selectedSourceType]);

  useEffect(() => {
    if (selectedOrgId) {
      fetchRiskInsights();
    }
  }, [selectedOrgId, selectedSourceType, fetchRiskInsights]);

  const generateChartData = (data: RiskInsightData) => {
    if (!data.hosts.length) {
      setChartData({
        vulnerabilityTrend: null,
        severityDistribution: null,
        hostComparison: null,
        riskProgression: null,
      });
      return;
    }

    // 1. Vulnerability Trend Chart (Line Chart)
    const iterationNumbers = [
      ...new Set(
        data.hosts.flatMap((host) =>
          host.iterations.map((iter) => iter.iteration_number)
        )
      ),
    ].sort((a, b) => a - b);

    const vulnerabilityTrendData = {
      labels: iterationNumbers.map((iter) => `Iteration ${iter}`),
      datasets: [
        {
          label: "Critical",
          data: iterationNumbers.map((iter) => {
            return data.hosts.reduce((sum, host) => {
              const iteration = host.iterations.find(
                (i) => i.iteration_number === iter
              );
              return sum + (iteration?.critical_count || 0);
            }, 0);
          }),
          borderColor: "#DC2626",
          backgroundColor: "rgba(220, 38, 38, 0.1)",
          fill: true,
          tension: 0.4,
        },
        {
          label: "High",
          data: iterationNumbers.map((iter) => {
            return data.hosts.reduce((sum, host) => {
              const iteration = host.iterations.find(
                (i) => i.iteration_number === iter
              );
              return sum + (iteration?.high_count || 0);
            }, 0);
          }),
          borderColor: "#EA580C",
          backgroundColor: "rgba(234, 88, 12, 0.1)",
          fill: true,
          tension: 0.4,
        },
        {
          label: "Medium",
          data: iterationNumbers.map((iter) => {
            return data.hosts.reduce((sum, host) => {
              const iteration = host.iterations.find(
                (i) => i.iteration_number === iter
              );
              return sum + (iteration?.medium_count || 0);
            }, 0);
          }),
          borderColor: "#D97706",
          backgroundColor: "rgba(217, 119, 6, 0.1)",
          fill: true,
          tension: 0.4,
        },
        {
          label: "Low",
          data: iterationNumbers.map((iter) => {
            return data.hosts.reduce((sum, host) => {
              const iteration = host.iterations.find(
                (i) => i.iteration_number === iter
              );
              return sum + (iteration?.low_count || 0);
            }, 0);
          }),
          borderColor: "#2563EB",
          backgroundColor: "rgba(37, 99, 235, 0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    };

    // 2. Severity Distribution (Doughnut Chart)
    const totalCounts = data.hosts.reduce(
      (acc, host) => {
        const latestIteration = host.iterations[host.iterations.length - 1];
        if (latestIteration) {
          acc.critical += latestIteration.critical_count;
          acc.high += latestIteration.high_count;
          acc.medium += latestIteration.medium_count;
          acc.low += latestIteration.low_count;
          acc.info += latestIteration.info_count;
        }
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
    );

    const severityDistributionData = {
      labels: ["Critical", "High", "Medium", "Low", "Informational"],
      datasets: [
        {
          data: [
            totalCounts.critical,
            totalCounts.high,
            totalCounts.medium,
            totalCounts.low,
            totalCounts.info,
          ],
          backgroundColor: [
            "#DC2626",
            "#EA580C",
            "#D97706",
            "#2563EB",
            "#6B7280",
          ],
          borderWidth: 2,
          borderColor: "#FFFFFF",
        },
      ],
    };

    // 3. Host Comparison (Bar Chart)
    const topHosts = data.hosts
      .map((host) => {
        const latestIteration = host.iterations[host.iterations.length - 1];
        return {
          ip: host.ip_address,
          total: latestIteration?.total_vulnerabilities || 0,
          critical: latestIteration?.critical_count || 0,
          high: latestIteration?.high_count || 0,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const hostComparisonData = {
      labels: topHosts.map((host) => host.ip),
      datasets: [
        {
          label: "Critical",
          data: topHosts.map((host) => host.critical),
          backgroundColor: "#DC2626",
          stack: "Stack 0",
        },
        {
          label: "High",
          data: topHosts.map((host) => host.high),
          backgroundColor: "#EA580C",
          stack: "Stack 0",
        },
        {
          label: "Medium",
          data: topHosts.map((host) => host.total - host.critical - host.high),
          backgroundColor: "#D97706",
          stack: "Stack 0",
        },
      ],
    };

    // 4. Risk Progression (Line Chart)
    const riskProgressionData = {
      labels: iterationNumbers.map((iter) => `Iteration ${iter}`),
      datasets: [
        {
          label: "Risk Score",
          data: iterationNumbers.map((iter) => {
            const iterationData = data.hosts.reduce(
              (acc, host) => {
                const iteration = host.iterations.find(
                  (i) => i.iteration_number === iter
                );
                if (iteration) {
                  acc.critical += iteration.critical_count;
                  acc.high += iteration.high_count;
                  acc.medium += iteration.medium_count;
                  acc.low += iteration.low_count;
                }
                return acc;
              },
              { critical: 0, high: 0, medium: 0, low: 0 }
            );

            // Calculate risk score (weighted sum)
            return (
              iterationData.critical * 10 +
              iterationData.high * 6 +
              iterationData.medium * 3 +
              iterationData.low * 1
            );
          }),
          borderColor: "#7C3AED",
          backgroundColor: "rgba(124, 58, 237, 0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    };

    setChartData({
      vulnerabilityTrend: vulnerabilityTrendData,
      severityDistribution: severityDistributionData,
      hostComparison: hostComparisonData,
      riskProgression: riskProgressionData,
    });
  };

  const generateTrendAnalysis = (data: RiskInsightData) => {
    if (!data.hosts.length) {
      setTrendAnalysis(null);
      return;
    }

    const totalHosts = data.hosts.length;
    const totalIterations = Math.max(
      ...data.hosts.flatMap((host) =>
        host.iterations.map((iter) => iter.iteration_number)
      )
    );

    // Calculate average vulnerabilities per host
    const avgVulns =
      data.hosts.reduce((sum, host) => {
        const latestIteration = host.iterations[host.iterations.length - 1];
        return sum + (latestIteration?.total_vulnerabilities || 0);
      }, 0) / totalHosts;

    // Calculate trends for critical and high vulnerabilities
    const firstIterationCritical = data.hosts.reduce(
      (sum, host) => sum + (host.iterations[0]?.critical_count || 0),
      0
    );
    const lastIterationCritical = data.hosts.reduce((sum, host) => {
      const latest = host.iterations[host.iterations.length - 1];
      return sum + (latest?.critical_count || 0);
    }, 0);

    const firstIterationHigh = data.hosts.reduce(
      (sum, host) => sum + (host.iterations[0]?.high_count || 0),
      0
    );
    const lastIterationHigh = data.hosts.reduce((sum, host) => {
      const latest = host.iterations[host.iterations.length - 1];
      return sum + (latest?.high_count || 0);
    }, 0);

    const criticalTrend =
      lastIterationCritical > firstIterationCritical
        ? "up"
        : lastIterationCritical < firstIterationCritical
        ? "down"
        : "stable";
    const highTrend =
      lastIterationHigh > firstIterationHigh
        ? "up"
        : lastIterationHigh < firstIterationHigh
        ? "down"
        : "stable";

    // Calculate overall risk score
    const riskScore =
      lastIterationCritical * 10 +
      lastIterationHigh * 6 +
      data.hosts.reduce((sum, host) => {
        const latest = host.iterations[host.iterations.length - 1];
        return (
          sum + (latest?.medium_count || 0) * 3 + (latest?.low_count || 0) * 1
        );
      }, 0);

    setTrendAnalysis({
      totalHosts,
      totalIterations,
      averageVulnsPerHost: Math.round(avgVulns * 10) / 10,
      criticalTrend,
      highTrend,
      riskScore,
    });
  };

  const fetchHostVulnerabilities = async (
    reportId: string,
    ipAddress: string
  ) => {
    try {
      setVulnLoading(true);
      const { data, error } = await supabase
        .from("vulnerabilities")
        .select(
          `
          id,
          vulnerability_name,
          severity,
          cvss_score,
          description,
          solution,
          port,
          protocol,
          service,
          cve_id
        `
        )
        .eq("report_id", reportId)
        .eq("host_ip", ipAddress)
        .order("severity", { ascending: false });

      if (error) throw error;
      setHostVulnerabilities(data || []);
    } catch (err) {
      console.error("Error fetching vulnerabilities:", err);
      setHostVulnerabilities([]);
    } finally {
      setVulnLoading(false);
    }
  };

  const handleHostClick = (ipAddress: string, reportId: string) => {
    setSelectedHost(ipAddress);
    fetchHostVulnerabilities(reportId, ipAddress);
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0 && current === 0)
      return { direction: "stable", percentage: 0 };
    if (previous === 0) return { direction: "up", percentage: 100 };
    if (current === 0) return { direction: "down", percentage: 100 };

    const change = ((current - previous) / previous) * 100;
    return {
      direction: change > 0 ? "up" : change < 0 ? "down" : "stable",
      percentage: Math.abs(change),
    };
  };

  const renderTrendIcon = (trend: {
    direction: string;
    percentage: number;
  }) => {
    switch (trend.direction) {
      case "up":
        return <ArrowTrendingUpIcon className="h-4 w-4 text-red-500" />;
      case "down":
        return <ArrowTrendingDownIcon className="h-4 w-4 text-green-500" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSeverityOrder = (severity: string) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, informational: 4 };
    return order[severity as keyof typeof order] ?? 5;
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
                <h1 className="text-2xl font-bold text-gray-900">
                  Risk Insights
                </h1>
                <p className="text-gray-600">
                  Search for organizations to view vulnerability analysis and
                  trends
                </p>
              </div>
            </div>
          </div>

          {/* Search Filters */}
          <SearchFilters
            organizations={organizations}
            selectedOrg={
              selectedOrgId
                ? organizations.find((org) => org.id === selectedOrgId) || null
                : null
            }
            selectedSourceType={selectedSourceType}
            loading={loading}
            onOrgSelect={(org) => setSelectedOrgId(org.id)}
            onSourceTypeChange={setSelectedSourceType}
          />

          {/* Content Area */}
          {!selectedOrgId ? (
            /* Default Prompt */
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full mb-6">
                <ChartBarIcon className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Select Organization for Risk Insights
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Choose an assessment type and organization from the dropdowns
                above to view detailed vulnerability analysis, trends, and risk
                insights.
              </p>
              <div className="text-sm text-gray-500">
                <p>Available features:</p>
                <ul className="mt-2 space-y-1 max-w-xs mx-auto">
                  <li>• Vulnerability trend analysis</li>
                  <li>• Risk progression tracking</li>
                  <li>• Host-by-host comparisons</li>
                  <li>• Interactive charts and tables</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-700">{error}</span>
                  </div>
                </div>
              )}

              {/* Data Loading */}
              {dataLoading && (
                <div className="flex items-center justify-center h-32">
                  <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">
                    Loading risk insights...
                  </span>
                </div>
              )}

              {/* Risk Insights Data */}
              {riskData && !dataLoading && (
                <div className="space-y-6">
                  {riskData.hosts.length === 0 ? (
                    <div className="text-center py-12">
                      <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No data available
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        No completed reports found for the selected organization
                        and source type.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Organization Header */}
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                              {riskData.organization.name}
                            </h2>
                            <p className="text-gray-600">
                              Source Type:{" "}
                              <span className="font-medium capitalize">
                                {riskData.organization.source_type}
                              </span>
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {riskData.hosts.length} hosts analyzed across
                              multiple iterations
                            </p>
                          </div>

                          {/* View Mode Toggle */}
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">
                              View Mode:
                            </span>
                            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                              <button
                                onClick={() => setViewMode("charts")}
                                className={`px-3 py-1 text-sm font-medium ${
                                  viewMode === "charts"
                                    ? "bg-blue-500 text-white"
                                    : "bg-white text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <ChartPieIcon className="h-4 w-4 inline mr-1" />
                                Charts
                              </button>
                              <button
                                onClick={() => setViewMode("table")}
                                className={`px-3 py-1 text-sm font-medium ${
                                  viewMode === "table"
                                    ? "bg-blue-500 text-white"
                                    : "bg-white text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <TableCellsIcon className="h-4 w-4 inline mr-1" />
                                Table
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Charts View */}
                      {viewMode === "charts" &&
                        chartData.vulnerabilityTrend && (
                          <div className="space-y-6">
                            {/* Chart Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Vulnerability Trend Chart */}
                              <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <div className="flex items-center space-x-2 mb-4">
                                  <PresentationChartLineIcon className="h-5 w-5 text-blue-600" />
                                  <h3 className="text-lg font-medium text-gray-900">
                                    Vulnerability Trends
                                  </h3>
                                </div>
                                <div className="h-80">
                                  <Line
                                    data={chartData.vulnerabilityTrend}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: {
                                          position: "top" as const,
                                        },
                                        tooltip: {
                                          mode: "index" as const,
                                          intersect: false,
                                        },
                                      },
                                      scales: {
                                        x: {
                                          display: true,
                                          title: {
                                            display: true,
                                            text: "Iterations",
                                          },
                                        },
                                        y: {
                                          display: true,
                                          title: {
                                            display: true,
                                            text: "Number of Vulnerabilities",
                                          },
                                          beginAtZero: true,
                                        },
                                      },
                                      interaction: {
                                        mode: "nearest" as const,
                                        axis: "x" as const,
                                        intersect: false,
                                      },
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Severity Distribution Chart */}
                              <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <div className="flex items-center space-x-2 mb-4">
                                  <ChartPieIcon className="h-5 w-5 text-blue-600" />
                                  <h3 className="text-lg font-medium text-gray-900">
                                    Current Severity Distribution
                                  </h3>
                                </div>
                                <div className="h-80">
                                  <Doughnut
                                    data={chartData.severityDistribution!}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: {
                                          position: "bottom" as const,
                                        },
                                        tooltip: {
                                          callbacks: {
                                            label: (context) => {
                                              const total =
                                                context.dataset.data.reduce(
                                                  (a: number, b: number) =>
                                                    a + b,
                                                  0
                                                );
                                              const percentage = (
                                                ((context.raw as number) /
                                                  total) *
                                                100
                                              ).toFixed(1);
                                              return `${context.label}: ${context.raw} (${percentage}%)`;
                                            },
                                          },
                                        },
                                      },
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Host Comparison Chart */}
                              <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <div className="flex items-center space-x-2 mb-4">
                                  <DocumentChartBarIcon className="h-5 w-5 text-blue-600" />
                                  <h3 className="text-lg font-medium text-gray-900">
                                    Top 10 Hosts by Vulnerabilities
                                  </h3>
                                </div>
                                <div className="h-80">
                                  <Bar
                                    data={chartData.hostComparison!}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: {
                                          position: "top" as const,
                                        },
                                        tooltip: {
                                          mode: "index" as const,
                                          intersect: false,
                                        },
                                      },
                                      scales: {
                                        x: {
                                          stacked: true,
                                          title: {
                                            display: true,
                                            text: "Host IP Address",
                                          },
                                        },
                                        y: {
                                          stacked: true,
                                          title: {
                                            display: true,
                                            text: "Number of Vulnerabilities",
                                          },
                                          beginAtZero: true,
                                        },
                                      },
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Risk Progression Chart */}
                              <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <div className="flex items-center space-x-2 mb-4">
                                  <ArrowsRightLeftIcon className="h-5 w-5 text-blue-600" />
                                  <h3 className="text-lg font-medium text-gray-900">
                                    Risk Score Progression
                                  </h3>
                                </div>
                                <div className="h-80">
                                  <Line
                                    data={chartData.riskProgression!}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: {
                                          position: "top" as const,
                                        },
                                        tooltip: {
                                          callbacks: {
                                            label: (context) => {
                                              return `Risk Score: ${context.raw}`;
                                            },
                                          },
                                        },
                                      },
                                      scales: {
                                        x: {
                                          title: {
                                            display: true,
                                            text: "Iterations",
                                          },
                                        },
                                        y: {
                                          title: {
                                            display: true,
                                            text: "Risk Score (Weighted)",
                                          },
                                          beginAtZero: true,
                                        },
                                      },
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Additional Analytics */}
                            {trendAnalysis && (
                              <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">
                                  Risk Analytics Summary
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                      {trendAnalysis.totalHosts}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Total Hosts
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                      {trendAnalysis.totalIterations}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Iterations
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                      {trendAnalysis.averageVulnsPerHost}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Avg Vulns/Host
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div
                                      className={`text-2xl font-bold ${
                                        trendAnalysis.riskScore > 100
                                          ? "text-red-600"
                                          : trendAnalysis.riskScore > 50
                                          ? "text-yellow-600"
                                          : "text-green-600"
                                      }`}
                                    >
                                      {trendAnalysis.riskScore}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Risk Score
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                      {/* Table View */}
                      {viewMode === "table" && (
                        <div className="space-y-4">
                          {riskData.hosts.map((host) => (
                            <div
                              key={host.ip_address}
                              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                            >
                              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="text-lg font-medium text-gray-900">
                                      {host.ip_address}
                                    </h3>
                                    {host.hostname && (
                                      <p className="text-sm text-gray-600">
                                        {host.hostname}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {host.iterations.length} iteration
                                    {host.iterations.length !== 1 ? "s" : ""}
                                  </div>
                                </div>
                              </div>

                              <div className="p-6">
                                <div className="grid gap-4">
                                  {host.iterations.map((iteration, index) => {
                                    const previousIteration =
                                      index > 0
                                        ? host.iterations[index - 1]
                                        : null;

                                    return (
                                      <div
                                        key={iteration.iteration_number}
                                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                                        onClick={() =>
                                          handleHostClick(
                                            host.ip_address,
                                            iteration.report_id
                                          )
                                        }
                                      >
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center space-x-2">
                                            <span className="font-medium text-gray-900">
                                              Iteration{" "}
                                              {iteration.iteration_number}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                              {new Date(
                                                iteration.scan_date
                                              ).toLocaleDateString()}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <EyeIcon className="h-4 w-4 text-gray-400" />
                                            <span className="text-sm text-gray-500">
                                              Click to view details
                                            </span>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                          {(
                                            [
                                              "critical",
                                              "high",
                                              "medium",
                                              "low",
                                              "info",
                                            ] as const
                                          ).map((severity) => {
                                            const currentCount = iteration[
                                              `${severity}_count` as keyof IterationData
                                            ] as number;
                                            const previousCount =
                                              previousIteration
                                                ? (previousIteration[
                                                    `${severity}_count` as keyof IterationData
                                                  ] as number)
                                                : null;
                                            const trend =
                                              previousCount !== null
                                                ? calculateTrend(
                                                    currentCount,
                                                    previousCount
                                                  )
                                                : null;

                                            const config =
                                              severityConfig[severity];

                                            return (
                                              <div
                                                key={severity}
                                                className={`${config.bgColor} border rounded-lg p-3`}
                                              >
                                                <div className="flex items-center justify-between mb-1">
                                                  <config.icon
                                                    className={`h-4 w-4 ${config.color}`}
                                                  />
                                                  {trend &&
                                                    renderTrendIcon(trend)}
                                                </div>
                                                <div
                                                  className={`text-2xl font-bold ${config.color}`}
                                                >
                                                  {currentCount}
                                                </div>
                                                <div className="text-xs font-medium text-gray-600 capitalize">
                                                  {severity === "info"
                                                    ? "Informational"
                                                    : severity}
                                                </div>
                                                {trend &&
                                                  trend.percentage > 0 && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                      {trend.direction === "up"
                                                        ? "+"
                                                        : "-"}
                                                      {trend.percentage.toFixed(
                                                        0
                                                      )}
                                                      %
                                                    </div>
                                                  )}
                                              </div>
                                            );
                                          })}
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                          <div className="text-sm text-gray-600">
                                            Total Vulnerabilities:{" "}
                                            <span className="font-medium">
                                              {iteration.total_vulnerabilities}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Vulnerability Details Modal */}
              {selectedHost && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        Vulnerabilities for {selectedHost}
                      </h3>
                      <button
                        onClick={() => setSelectedHost(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <span className="sr-only">Close</span>
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-96">
                      {vulnLoading ? (
                        <div className="flex items-center justify-center h-32">
                          <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-600" />
                          <span className="ml-2 text-gray-600">
                            Loading vulnerabilities...
                          </span>
                        </div>
                      ) : hostVulnerabilities.length === 0 ? (
                        <div className="text-center py-8">
                          <ShieldCheckIcon className="mx-auto h-12 w-12 text-green-500" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">
                            No vulnerabilities found
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            This host has no recorded vulnerabilities.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {hostVulnerabilities
                            .sort(
                              (a, b) =>
                                getSeverityOrder(a.severity) -
                                getSeverityOrder(b.severity)
                            )
                            .map((vuln) => {
                              const config =
                                severityConfig[
                                  vuln.severity as keyof typeof severityConfig
                                ] || severityConfig.info;

                              return (
                                <div
                                  key={vuln.id}
                                  className={`${config.bgColor} border rounded-lg p-4`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-900">
                                        {vuln.vulnerability_name}
                                      </h4>
                                      {vuln.cve_id && (
                                        <p className="text-sm text-gray-600 mt-1">
                                          {vuln.cve_id}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                      <config.icon
                                        className={`h-4 w-4 ${config.color}`}
                                      />
                                      <span
                                        className={`text-sm font-medium ${config.color} capitalize`}
                                      >
                                        {vuln.severity}
                                      </span>
                                      {vuln.cvss_score && (
                                        <span className="text-sm text-gray-600">
                                          ({vuln.cvss_score})
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {vuln.description && (
                                    <p className="text-sm text-gray-700 mb-2 line-clamp-3">
                                      {vuln.description}
                                    </p>
                                  )}

                                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                                    {vuln.port && (
                                      <span>Port: {vuln.port}</span>
                                    )}
                                    {vuln.protocol && (
                                      <span>Protocol: {vuln.protocol}</span>
                                    )}
                                    {vuln.service && (
                                      <span>Service: {vuln.service}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Vulnerability Details Modal */}
          {selectedHost && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Vulnerabilities for {selectedHost}
                  </h3>
                  <button
                    onClick={() => setSelectedHost(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-96">
                  {vulnLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">
                        Loading vulnerabilities...
                      </span>
                    </div>
                  ) : hostVulnerabilities.length === 0 ? (
                    <div className="text-center py-8">
                      <ShieldCheckIcon className="mx-auto h-12 w-12 text-green-500" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No vulnerabilities found
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        This host has no recorded vulnerabilities.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {hostVulnerabilities
                        .sort(
                          (a, b) =>
                            getSeverityOrder(a.severity) -
                            getSeverityOrder(b.severity)
                        )
                        .map((vuln) => {
                          const config =
                            severityConfig[
                              vuln.severity as keyof typeof severityConfig
                            ] || severityConfig.info;

                          return (
                            <div
                              key={vuln.id}
                              className={`${config.bgColor} border rounded-lg p-4`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">
                                    {vuln.vulnerability_name}
                                  </h4>
                                  {vuln.cve_id && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      {vuln.cve_id}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                  <config.icon
                                    className={`h-4 w-4 ${config.color}`}
                                  />
                                  <span
                                    className={`text-sm font-medium ${config.color} capitalize`}
                                  >
                                    {vuln.severity}
                                  </span>
                                  {vuln.cvss_score && (
                                    <span className="text-sm text-gray-600">
                                      ({vuln.cvss_score})
                                    </span>
                                  )}
                                </div>
                              </div>

                              {vuln.description && (
                                <p className="text-sm text-gray-700 mb-2 line-clamp-3">
                                  {vuln.description}
                                </p>
                              )}

                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                {vuln.port && <span>Port: {vuln.port}</span>}
                                {vuln.protocol && (
                                  <span>Protocol: {vuln.protocol}</span>
                                )}
                                {vuln.service && (
                                  <span>Service: {vuln.service}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
