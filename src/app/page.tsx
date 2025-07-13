"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface DashboardStats {
  totalReports: number;
  totalVulnerabilities: number;
  highSeverity: number;
  uniqueIPs: number;
  recentReports: Array<{
    id: string;
    name: string;
    status: string;
    created_at: string;
    total_vulnerabilities: number;
  }>;
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    totalVulnerabilities: 0,
    highSeverity: 0,
    uniqueIPs: 0,
    recentReports: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Fetch reports with vulnerability counts
        const { data: reportsData, error: reportsError } = await supabase
          .from("reports")
          .select(`
            id,
            name,
            status,
            created_at,
            total_vulnerabilities
          `)
          .order("created_at", { ascending: false })
          .limit(5);

        if (reportsError) {
          console.error("Error fetching reports:", reportsError);
        }

        // Fetch total counts
        const { count: totalReports } = await supabase
          .from("reports")
          .select("*", { count: "exact", head: true });

        const { count: totalVulnerabilities } = await supabase
          .from("vulnerabilities")
          .select("*", { count: "exact", head: true });

        const { count: highSeverity } = await supabase
          .from("vulnerabilities")
          .select("*", { count: "exact", head: true })
          .eq("severity", "high");

        // Fetch unique IPs count
        const { data: uniqueIPsData } = await supabase
          .from("vulnerabilities")
          .select("ip_address");

        const uniqueIPs = uniqueIPsData 
          ? new Set(uniqueIPsData.map(v => v.ip_address)).size 
          : 0;

        setStats({
          totalReports: totalReports || 0,
          totalVulnerabilities: totalVulnerabilities || 0,
          highSeverity: highSeverity || 0,
          uniqueIPs,
          recentReports: reportsData || []
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          {/* Welcome Section */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Nessus Vulnerability Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Comprehensive vulnerability management and analysis platform
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3 md:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">Total Reports</dt>
                      <dd className="text-lg md:text-xl font-medium text-gray-900">
                        {loading ? "..." : stats.totalReports}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3 md:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">Total Vulnerabilities</dt>
                      <dd className="text-lg md:text-xl font-medium text-gray-900">
                        {loading ? "..." : stats.totalVulnerabilities}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3 md:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">High Severity</dt>
                      <dd className="text-lg md:text-xl font-medium text-gray-900">
                        {loading ? "..." : stats.highSeverity}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3 md:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs md:text-sm font-medium text-gray-500 truncate">Unique IPs</dt>
                      <dd className="text-lg md:text-xl font-medium text-gray-900">
                        {loading ? "..." : stats.uniqueIPs}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload New Scan</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload and process Nessus CSV files with automatic vulnerability detection and classification.
                    </p>
                    <Link
                      href="/upload"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Upload Scan
                    </Link>
                  </div>
                  <div className="flex-shrink-0 mt-4 sm:mt-0 sm:ml-4">
                    <svg className="w-10 h-10 md:w-12 md:h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Reports</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      View, filter, and manage all vulnerability scan reports with detailed analysis and insights.
                    </p>
                    <Link
                      href="/reports"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700"
                    >
                      View Reports
                    </Link>
                  </div>
                  <div className="flex-shrink-0 mt-4 sm:mt-0 sm:ml-4">
                    <svg className="w-10 h-10 md:w-12 md:h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyze Vulnerabilities</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Browse all vulnerabilities with IP-based summaries and CVE-based analysis for comprehensive insights.
                    </p>
                    <Link
                      href="/vulnerabilities"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                    >
                      View Vulnerabilities
                    </Link>
                  </div>
                  <div className="flex-shrink-0 mt-4 sm:mt-0 sm:ml-4">
                    <svg className="w-10 h-10 md:w-12 md:h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Reports */}
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
                <Link
                  href="/reports"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all reports →
                </Link>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading recent reports...</p>
                </div>
              ) : stats.recentReports.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No reports yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by uploading your first Nessus scan.</p>
                  <div className="mt-6">
                    <Link
                      href="/upload"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Upload Scan
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentReports.map((report) => (
                    <div key={report.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 space-y-3 sm:space-y-0">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                          <Link
                            href={`/reports/${report.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 break-words"
                          >
                            {report.name}
                          </Link>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)} w-fit`}>
                            {report.status}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-500">
                          <span>{report.total_vulnerabilities || 0} vulnerabilities</span>
                          <span>{new Date(report.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Link
                          href={`/reports/${report.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View details →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
