"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/AppLayout";
import {
  ChartBarIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  BuildingOfficeIcon,
  ServerIcon,
  BugAntIcon,
  ArrowRightIcon,
  EyeIcon,
  ArrowUpTrayIcon,
  PresentationChartBarIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

interface DashboardStats {
  totalReports: number;
  totalVulnerabilities: number;
  criticalVulns: number;
  highVulns: number;
  mediumVulns: number;
  lowVulns: number;
  recentReports: number;
  organizationsCount: number;
  avgVulnsPerReport: number;
  riskScore: number;
  completedReports: number;
  pendingReports: number;
}

interface RecentReport {
  id: string;
  org_name: string;
  source_type: string;
  total_vulnerabilities: number;
  critical_count: number;
  created_at: string;
  status: string;
}

interface TrendData {
  date: string;
  vulnerabilities: number;
  critical: number;
  high: number;
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    totalVulnerabilities: 0,
    criticalVulns: 0,
    highVulns: 0,
    mediumVulns: 0,
    lowVulns: 0,
    recentReports: 0,
    organizationsCount: 0,
    avgVulnsPerReport: 0,
    riskScore: 0,
    completedReports: 0,
    pendingReports: 0,
  });
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch all necessary data
        const [reportsResult, orgsResult, recentReportsResult] =
          await Promise.all([
            supabase
              .from("reports")
              .select("*")
              .order("created_at", { ascending: false }),
            supabase.from("organizations").select("*"),
            supabase
              .from("reports")
              .select(
                `
            id,
            org_name,
            source_type,
            total_vulnerabilities,
            critical_count,
            created_at,
            status
          `
              )
              .order("created_at", { ascending: false })
              .limit(5),
          ]);

        if (reportsResult.data && orgsResult.data) {
          const reports = reportsResult.data;
          const organizations = orgsResult.data;

          // Calculate time-based metrics
          const now = new Date();
          const sevenDaysAgo = new Date(
            now.getTime() - 7 * 24 * 60 * 60 * 1000
          );

          const recentReports = reports.filter(
            (report) => new Date(report.created_at) >= sevenDaysAgo
          ).length;

          // Calculate comprehensive stats
          const totalVulns = reports.reduce(
            (sum, report) => sum + (report.total_vulnerabilities || 0),
            0
          );
          const criticalVulns = reports.reduce(
            (sum, report) => sum + (report.critical_count || 0),
            0
          );
          const highVulns = reports.reduce(
            (sum, report) => sum + (report.high_count || 0),
            0
          );
          const mediumVulns = reports.reduce(
            (sum, report) => sum + (report.medium_count || 0),
            0
          );
          const lowVulns = reports.reduce(
            (sum, report) => sum + (report.low_count || 0),
            0
          );

          const completedReports = reports.filter(
            (r) => r.status === "completed"
          ).length;
          const pendingReports = reports.filter(
            (r) => r.status === "processing"
          ).length;

          const avgVulns = reports.length > 0 ? totalVulns / reports.length : 0;

          // Calculate risk score (weighted average)
          const riskScore =
            criticalVulns * 10 + highVulns * 6 + mediumVulns * 3 + lowVulns * 1;

          setStats({
            totalReports: reports.length,
            totalVulnerabilities: totalVulns,
            criticalVulns,
            highVulns,
            mediumVulns,
            lowVulns,
            recentReports,
            organizationsCount: organizations.length,
            avgVulnsPerReport: Math.round(avgVulns * 10) / 10,
            riskScore,
            completedReports,
            pendingReports,
          });

          // Set recent reports
          if (recentReportsResult.data) {
            setRecentReports(recentReportsResult.data);
          }

          // Generate trend data for the last 30 days
          const thirtyDaysAgo = new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000
          );
          const trendReports = reports.filter(
            (report) => new Date(report.created_at) >= thirtyDaysAgo
          );

          // Group by week for trend analysis
          const weeklyData: { [key: string]: TrendData } = {};
          trendReports.forEach((report) => {
            const date = new Date(report.created_at);
            const weekStart = new Date(
              date.setDate(date.getDate() - date.getDay())
            );
            const weekKey = weekStart.toISOString().split("T")[0];

            if (!weeklyData[weekKey]) {
              weeklyData[weekKey] = {
                date: weekKey,
                vulnerabilities: 0,
                critical: 0,
                high: 0,
              };
            }

            weeklyData[weekKey].vulnerabilities +=
              report.total_vulnerabilities || 0;
            weeklyData[weekKey].critical += report.critical_count || 0;
            weeklyData[weekKey].high += report.high_count || 0;
          });

          setTrendData(
            Object.values(weeklyData).sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            )
          );
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Chart data
  const severityChartData = {
    labels: ["Critical", "High", "Medium", "Low"],
    datasets: [
      {
        data: [
          stats.criticalVulns,
          stats.highVulns,
          stats.mediumVulns,
          stats.lowVulns,
        ],
        backgroundColor: ["#DC2626", "#EA580C", "#D97706", "#2563EB"],
        borderColor: "#FFFFFF",
        borderWidth: 2,
      },
    ],
  };

  const trendChartData = {
    labels: trendData.map((d) =>
      new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    ),
    datasets: [
      {
        label: "Total Vulnerabilities",
        data: trendData.map((d) => d.vulnerabilities),
        borderColor: "#3B82F6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Critical",
        data: trendData.map((d) => d.critical),
        borderColor: "#DC2626",
        backgroundColor: "rgba(220, 38, 38, 0.1)",
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case "processing":
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 100) return "text-red-600";
    if (score >= 50) return "text-yellow-600";
    return "text-green-600";
  };

  const getRiskScoreLabel = (score: number) => {
    if (score >= 100) return "High Risk";
    if (score >= 50) return "Medium Risk";
    return "Low Risk";
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Vulnerability Assessment Dashboard
                    </h1>
                    <p className="text-gray-600">
                      Real-time security posture overview and analytics
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Last updated</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Reports */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Reports
                  </p>
                  <div className="text-3xl font-bold text-gray-900">
                    {loading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : (
                      stats.totalReports.toLocaleString()
                    )}
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-gray-500">
                      {stats.completedReports} completed, {stats.pendingReports}{" "}
                      pending
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Total Vulnerabilities */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Vulnerabilities
                  </p>
                  <div className="text-3xl font-bold text-gray-900">
                    {loading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : (
                      stats.totalVulnerabilities.toLocaleString()
                    )}
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-gray-500">
                      Avg: {stats.avgVulnsPerReport} per report
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <BugAntIcon className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Critical Vulnerabilities */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Critical Vulnerabilities
                  </p>
                  <div className="text-3xl font-bold text-red-600">
                    {loading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : (
                      stats.criticalVulns.toLocaleString()
                    )}
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-gray-500">
                      Require immediate attention
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            {/* Risk Score */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Overall Risk Score
                  </p>
                  <div
                    className={`text-3xl font-bold ${getRiskScoreColor(
                      stats.riskScore
                    )}`}
                  >
                    {loading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : (
                      stats.riskScore
                    )}
                  </div>
                  <div className="flex items-center mt-2">
                    <span
                      className={`text-sm font-medium ${getRiskScoreColor(
                        stats.riskScore
                      )}`}
                    >
                      {getRiskScoreLabel(stats.riskScore)}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Severity Distribution Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Vulnerability Distribution
                </h3>
                <PresentationChartBarIcon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="h-64">
                {loading || stats.totalVulnerabilities === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-pulse bg-gray-200 h-32 w-32 rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-500">Loading chart data...</p>
                    </div>
                  </div>
                ) : (
                  <Doughnut
                    data={severityChartData}
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
                              const total = context.dataset.data.reduce(
                                (a: number, b: number) => a + b,
                                0
                              );
                              const percentage = (
                                ((context.raw as number) / total) *
                                100
                              ).toFixed(1);
                              return `${context.label}: ${context.raw} (${percentage}%)`;
                            },
                          },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </div>

            {/* Trend Analysis Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Vulnerability Trends
                </h3>
                <ArrowTrendingUpIcon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="h-64">
                {loading || trendData.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-pulse bg-gray-200 h-32 w-full rounded mb-4"></div>
                      <p className="text-gray-500">Loading trend data...</p>
                    </div>
                  </div>
                ) : (
                  <Line
                    data={trendChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "top" as const,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: "Number of Vulnerabilities",
                          },
                        },
                        x: {
                          title: {
                            display: true,
                            text: "Time Period",
                          },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Detailed Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Critical</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.criticalVulns}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">High</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.highVulns}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Medium</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.mediumVulns}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Low</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.lowVulns}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Reports and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Reports */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Reports
                </h3>
                <Link
                  href="/reports"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  View all <ArrowRightIcon className="ml-1 h-4 w-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="animate-pulse flex items-center space-x-3 p-3 border border-gray-100 rounded-lg"
                    >
                      <div className="bg-gray-200 h-10 w-10 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="bg-gray-200 h-4 w-32 rounded mb-2"></div>
                        <div className="bg-gray-200 h-3 w-24 rounded"></div>
                      </div>
                    </div>
                  ))
                ) : recentReports.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      No recent reports found
                    </p>
                  </div>
                ) : (
                  recentReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center space-x-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {getStatusIcon(report.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {report.org_name}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span className="capitalize">
                            {report.source_type}
                          </span>
                          <span>•</span>
                          <span>{report.total_vulnerabilities} vulns</span>
                          <span>•</span>
                          <span>{report.critical_count} critical</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(report.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-4">
                <Link
                  href="/upload"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                >
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <ArrowUpTrayIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      Upload New Scan
                    </h4>
                    <p className="text-sm text-gray-500">
                      Import vulnerability data from Nessus
                    </p>
                  </div>
                  <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                </Link>

                <Link
                  href="/reports"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-200 transition-colors group"
                >
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <EyeIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      View Reports
                    </h4>
                    <p className="text-sm text-gray-500">
                      Browse existing assessment reports
                    </p>
                  </div>
                  <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-400 group-hover:text-green-600" />
                </Link>

                <Link
                  href="/insights"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-colors group"
                >
                  <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <ChartBarIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      Risk Insights
                    </h4>
                    <p className="text-sm text-gray-500">
                      Advanced analytics and trends
                    </p>
                  </div>
                  <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-400 group-hover:text-purple-600" />
                </Link>
              </div>
            </div>
          </div>

          {/* System Health and Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Organizations
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.organizationsCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Recent Activity
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.recentReports}
                  </p>
                  <p className="text-xs text-gray-500">Last 7 days</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <ServerIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    System Status
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-600">
                      Operational
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
