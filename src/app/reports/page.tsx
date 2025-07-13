"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";

interface Report {
  id: string;
  name: string;
  description?: string;
  file_name: string;
  file_size: number;
  total_vulnerabilities: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  status: 'processing' | 'completed' | 'failed';
  upload_date: string;
  processed_date?: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "20",
          status: statusFilter,
          search: searchTerm,
        });

        const response = await fetch(`/api/reports?${params}`);
        const result = await response.json();

        if (result.success) {
          setReports(result.data);
          setTotalPages(result.totalPages);
        } else {
          setError("Failed to fetch reports");
        }
      } catch (err) {
        setError("Failed to fetch reports");
        console.error("Error fetching reports:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [currentPage, statusFilter, searchTerm]);

  const refreshReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        status: statusFilter,
        search: searchTerm,
      });

      const response = await fetch(`/api/reports?${params}`);
      const result = await response.json();

      if (result.success) {
        setReports(result.data);
        setTotalPages(result.totalPages);
      } else {
        setError("Failed to fetch reports");
      }
    } catch (err) {
      setError("Failed to fetch reports");
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report? This will also delete all associated vulnerabilities.")) {
      return;
    }

    try {
      const response = await fetch(`/api/report/${reportId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh the reports list
        refreshReports();
      } else {
        alert("Failed to delete report");
      }
    } catch (err) {
      console.error("Error deleting report:", err);
      alert("Failed to delete report");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  const filteredReports = reports.filter(report =>
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (report.description && report.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <Link href="/" className="text-gray-500 hover:text-gray-700 mr-4">
                    ← Back to Dashboard
                  </Link>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Scan Reports</h1>
                <p className="mt-2 text-sm sm:text-base text-gray-600">
                  Manage and analyze your Nessus vulnerability scan reports.
                </p>
              </div>
              <Link
                href="/upload"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 text-center"
              >
                Upload New Scan
              </Link>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                    Search Reports
                  </label>
                  <input
                    type="text"
                    id="search"
                    placeholder="Search by name, file, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="processing">Processing</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setCurrentPage(1);
                    }}
                    className="w-full bg-gray-600 !text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reports List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading reports...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-700">{error}</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No reports found.</p>
                <Link 
                  href="/upload"
                  className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Upload Your First Scan
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:gap-6">
                {filteredReports.map((report) => (
                  <Card key={report.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between space-y-4 lg:space-y-0">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 break-words">
                              {report.name}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)} w-fit`}>
                              {report.status}
                            </span>
                          </div>
                          
                          {report.description && (
                            <p className="text-gray-600 mb-3 break-words">{report.description}</p>
                          )}
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-500">File</p>
                              <p className="text-sm font-medium break-words">{report.file_name}</p>
                              <p className="text-xs text-gray-400">{formatFileSize(report.file_size)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Total Vulnerabilities</p>
                              <p className="text-lg font-bold text-gray-900">{report.total_vulnerabilities}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Uploaded</p>
                              <p className="text-sm">{new Date(report.upload_date).toLocaleDateString()}</p>
                              <p className="text-xs text-gray-400">{new Date(report.upload_date).toLocaleTimeString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Processed</p>
                              <p className="text-sm">
                                {report.processed_date 
                                  ? new Date(report.processed_date).toLocaleDateString()
                                  : "Pending"
                                }
                              </p>
                            </div>
                          </div>

                          {/* Severity Breakdown */}
                          {report.status === "completed" && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                              <div className="bg-red-50 p-2 rounded text-center">
                                <p className="text-xs text-red-600">High</p>
                                <p className="text-sm font-bold text-red-800">{report.high_count}</p>
                              </div>
                              <div className="bg-yellow-50 p-2 rounded text-center">
                                <p className="text-xs text-yellow-600">Medium</p>
                                <p className="text-sm font-bold text-yellow-800">{report.medium_count}</p>
                              </div>
                              <div className="bg-green-50 p-2 rounded text-center">
                                <p className="text-xs text-green-600">Low</p>
                                <p className="text-sm font-bold text-green-800">{report.low_count}</p>
                              </div>
                              <div className="bg-gray-50 p-2 rounded text-center">
                                <p className="text-xs text-gray-600">Info</p>
                                <p className="text-sm font-bold text-gray-800">{report.info_count}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-4 pt-4 border-t">
                        <Link
                          href={`/reports/${report.id}`}
                          className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 text-center"
                        >
                          View Details
                        </Link>
                        <Link
                          href={`/vulnerabilities?report=${report.id}`}
                          className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 text-center"
                        >
                          View Vulnerabilities
                        </Link>
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Page <span className="font-medium">{currentPage}</span> of{" "}
                        <span className="font-medium">{totalPages}</span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
