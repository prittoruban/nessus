"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/AppLayout";
import SearchFilters from "@/components/SearchFilters";
import {
  DocumentArrowDownIcon,
  EyeIcon,
  FunnelIcon,
  CalendarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

interface Report {
  id: string;
  org_name: string;
  source_type: "internal" | "external";
  scan_start_date: string;
  scan_end_date: string;
  test_performed_at: string;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  status: string;
  created_at: string;
  iteration_number: number;
  assessee: string;
  assessor: string;
}

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
}

interface Filters {
  search: string;
  sourceType: "all" | "internal" | "external";
  status: "all" | "pending" | "completed" | "draft";
  sortBy: "date" | "name" | "vulnerabilities" | "iteration";
  sortOrder: "asc" | "desc";
  dateRange: "all" | "7days" | "30days" | "90days" | "custom";
  customStartDate: string;
  customEndDate: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedSourceType, setSelectedSourceType] = useState<
    "all" | "internal" | "external"
  >("all");
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    sourceType: "all",
    status: "all",
    sortBy: "date",
    sortOrder: "desc",
    dateRange: "all",
    customStartDate: "",
    customEndDate: "",
  });

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
          total_vulnerabilities,
          critical_count,
          high_count,
          medium_count,
          low_count,
          info_count,
          scan_end_date,
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

          return {
            id: org.id,
            name: org.name,
            source_type: org.source_type,
            report_count: completedReports.length,
            latest_scan: latestReport?.scan_end_date || "",
            total_ips: 0,
            total_vulnerabilities: latestReport?.total_vulnerabilities || 0,
            critical_count: latestReport?.critical_count || 0,
            high_count: latestReport?.high_count || 0,
            medium_count: latestReport?.medium_count || 0,
            low_count: latestReport?.low_count || 0,
            info_count: latestReport?.info_count || 0,
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

  const fetchReportsForOrg = useCallback(async (orgId: string) => {
    try {
      setReportsLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to fetch reports");
    } finally {
      setReportsLoading(false);
    }
  }, []);

  // Initial load and when source type changes
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    fetchOrganizations();
  }, [selectedSourceType, fetchOrganizations]);

  const applyFilters = useCallback(() => {
    let filtered = [...reports];

    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.org_name.toLowerCase().includes(searchTerm) ||
          report.assessee?.toLowerCase().includes(searchTerm) ||
          report.assessor?.toLowerCase().includes(searchTerm)
      );
    }

    // Source type filter
    if (filters.sourceType !== "all") {
      filtered = filtered.filter(
        (report) => report.source_type === filters.sourceType
      );
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((report) => report.status === filters.status);
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (filters.dateRange) {
        case "7days":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30days":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90days":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "custom":
          if (filters.customStartDate && filters.customEndDate) {
            startDate = new Date(filters.customStartDate);
            const endDate = new Date(filters.customEndDate);
            filtered = filtered.filter((report) => {
              const reportDate = new Date(report.created_at);
              return reportDate >= startDate && reportDate <= endDate;
            });
          }
          break;
        default:
          startDate = new Date(0);
      }

      if (filters.dateRange !== "custom") {
        filtered = filtered.filter(
          (report) => new Date(report.created_at) >= startDate
        );
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case "name":
          comparison = a.org_name.localeCompare(b.org_name);
          break;
        case "vulnerabilities":
          comparison = a.total_vulnerabilities - b.total_vulnerabilities;
          break;
        case "iteration":
          comparison = a.iteration_number - b.iteration_number;
          break;
        case "date":
        default:
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }

      return filters.sortOrder === "desc" ? -comparison : comparison;
    });

    setFilteredReports(filtered);
  }, [reports, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setFilters({
      search: "",
      sourceType: "all",
      status: "all",
      sortBy: "date",
      sortOrder: "desc",
      dateRange: "all",
      customStartDate: "",
      customEndDate: "",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "draft":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getSeverityColor = (count: number, severity: string) => {
    if (count === 0) return "text-slate-400";

    switch (severity) {
      case "critical":
        return "text-red-600 font-bold";
      case "high":
        return "text-orange-600 font-semibold";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-blue-600";
      default:
        return "text-slate-600";
    }
  };

  const handleViewReport = (reportId: string) => {
    router.push(`/reports/${reportId}`);
  };

  const handleExportReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    try {
      setExporting(reportId);

      // Create a link to download the PDF
      const response = await fetch(`/api/pdf/generate/${reportId}`);

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Get the blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vulnerability-report-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export report. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Page Header */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Vulnerability Assessment Reports
                </h1>
                <p className="text-gray-600">
                  Search for organizations to view their vulnerability
                  assessment reports
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
            onOrgSelect={(org) => {
              setSelectedOrg(org);
              fetchReportsForOrg(org.id);
            }}
            onSourceTypeChange={setSelectedSourceType}
          />

          {/* Content Area */}
          {!selectedOrg ? (
            /* Default Prompt */
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full mb-6">
                <DocumentTextIcon className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Select Organization for Reports
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Choose an assessment type and organization from the dropdowns
                above to view their vulnerability assessment reports.
              </p>
              <div className="text-sm text-gray-500">
                <p>You can view:</p>
                <ul className="mt-2 space-y-1 max-w-xs mx-auto">
                  <li>• All vulnerability reports</li>
                  <li>• Export reports as PDF</li>
                  <li>• Filter by status and date</li>
                </ul>
              </div>
            </div>
          ) : reportsLoading ? (
            /* Loading State */
            <div className="professional-card text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/25 animate-pulse">
                <DocumentTextIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Searching Reports...
              </h3>
              <p className="text-gray-600">
                Please wait while we find matching reports.
              </p>
            </div>
          ) : error ? (
            /* Error State */
            <div className="professional-card text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Error Loading Reports
              </h3>
              <p className="text-gray-600 mb-8">{error}</p>
              <button
                onClick={() =>
                  selectedOrg && fetchReportsForOrg(selectedOrg.id)
                }
                className="professional-btn-primary"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Results Summary - Only show when searching */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <p className="text-gray-600">
                    Showing{" "}
                    <span className="font-semibold text-gray-900">
                      {filteredReports.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-gray-900">
                      {reports.length}
                    </span>{" "}
                    reports
                  </p>
                  {filteredReports.length !== reports.length && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <FunnelIcon className="w-3 h-3 mr-1" />
                      Filtered
                    </span>
                  )}
                </div>
                {(filters.search ||
                  filters.sourceType !== "all" ||
                  filters.status !== "all" ||
                  filters.dateRange !== "all") && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 underline font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              {/* Reports Grid */}
              {filteredReports.length === 0 ? (
                <div className="professional-card text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
                    <ShieldCheckIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No reports found
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    No reports match your search criteria. Try adjusting your
                    search terms or filters.
                  </p>
                  <button
                    onClick={() => setSelectedOrg(null)}
                    className="professional-btn-secondary"
                  >
                    Clear Selection
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {filteredReports.map((report, index) => (
                    <div
                      key={report.id}
                      onClick={() => handleViewReport(report.id)}
                      className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl cursor-pointer hover:-translate-y-1 transition-all duration-300 p-6"
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1 min-w-0 pr-4">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate mb-3 group-hover:text-blue-600 transition-colors">
                            {report.org_name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                report.source_type === "internal"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {report.source_type === "internal"
                                ? "Internal"
                                : "External"}
                            </span>
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                report.status
                              )}`}
                            >
                              {report.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:from-blue-600 group-hover:to-blue-700 transition-all shadow-sm">
                          <ChartBarIcon className="w-6 h-6 text-white" />
                        </div>
                      </div>

                      {/* Iteration Info */}
                      <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between text-sm mb-3">
                          <span className="font-semibold text-gray-700">
                            Iteration #{report.iteration_number}
                          </span>
                          <div className="flex items-center text-gray-500">
                            <CalendarIcon className="w-4 h-4 mr-1.5" />
                            <span className="text-xs">
                              {new Date(
                                report.scan_start_date
                              ).toLocaleDateString()}{" "}
                              -{" "}
                              {new Date(
                                report.scan_end_date
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Test Location:</span>
                          <span className="ml-1">
                            {report.test_performed_at}
                          </span>
                        </div>
                      </div>

                      {/* Vulnerability Summary */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-semibold text-gray-700">
                            Total Vulnerabilities
                          </span>
                          <span className="text-xl sm:text-2xl font-bold text-gray-900">
                            {report.total_vulnerabilities}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                          <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                            <div
                              className={`text-base sm:text-lg font-bold mb-1 ${getSeverityColor(
                                report.critical_count,
                                "critical"
                              )}`}
                            >
                              {report.critical_count}
                            </div>
                            <div className="text-xs font-medium text-red-700">
                              Critical
                            </div>
                          </div>
                          <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                            <div
                              className={`text-base sm:text-lg font-bold mb-1 ${getSeverityColor(
                                report.high_count,
                                "high"
                              )}`}
                            >
                              {report.high_count}
                            </div>
                            <div className="text-xs font-medium text-orange-700">
                              High
                            </div>
                          </div>
                          <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
                            <div
                              className={`text-base sm:text-lg font-bold mb-1 ${getSeverityColor(
                                report.medium_count,
                                "medium"
                              )}`}
                            >
                              {report.medium_count}
                            </div>
                            <div className="text-xs font-medium text-yellow-700">
                              Medium
                            </div>
                          </div>
                          <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                            <div
                              className={`text-base sm:text-lg font-bold mb-1 ${getSeverityColor(
                                report.low_count,
                                "low"
                              )}`}
                            >
                              {report.low_count}
                            </div>
                            <div className="text-xs font-medium text-blue-700">
                              Low
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Team Info */}
                      {(report.assessee || report.assessor) && (
                        <div className="text-sm text-gray-600 space-y-2 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                          {report.assessee && (
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 w-20 flex-shrink-0">
                                Assessee:
                              </span>
                              <span className="ml-2 truncate">
                                {report.assessee}
                              </span>
                            </div>
                          )}
                          {report.assessor && (
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 w-20 flex-shrink-0">
                                Assessor:
                              </span>
                              <span className="ml-2 truncate">
                                {report.assessor}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <span className="text-xs text-gray-500">
                          Created{" "}
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewReport(report.id);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
                          >
                            <EyeIcon className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={(e) => handleExportReport(report.id, e)}
                            disabled={exporting === report.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
                          >
                            <DocumentArrowDownIcon className="w-4 h-4" />
                            {exporting === report.id
                              ? "Exporting..."
                              : "Export"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
