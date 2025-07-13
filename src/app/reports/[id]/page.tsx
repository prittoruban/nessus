"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";
import { useParams } from "next/navigation";

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

interface Vulnerability {
  id: string;
  ip_address: string;
  cve: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  plugin_name?: string;
  description?: string;
  created_at: string;
}

interface ReportStats {
  total: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export default function ReportDetailsPage() {
  const params = useParams();
  const reportId = params.id as string;
  
  const [report, setReport] = useState<Report | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchReportDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/report/${reportId}`);
        const result = await response.json();

        if (response.ok) {
          setReport(result.report);
          setVulnerabilities(result.vulnerabilities);
          setStats(result.stats);
        } else {
          setError(result.error || "Failed to fetch report details");
        }
      } catch (err) {
        setError("Failed to fetch report details");
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (reportId) {
      fetchReportDetails();
    }
  }, [reportId]);

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

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      case "info":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  // Filter vulnerabilities
  const filteredVulnerabilities = vulnerabilities.filter(vuln => {
    const matchesSeverity = severityFilter === "all" || vuln.severity === severityFilter;
    const matchesSearch = searchTerm === "" || 
      vuln.ip_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vuln.cve.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vuln.plugin_name && vuln.plugin_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vuln.description && vuln.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSeverity && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading report details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">{error}</p>
            <Link href="/reports" className="mt-2 inline-block text-blue-600 hover:text-blue-800">
              ← Back to Reports
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <p className="text-gray-500">Report not found</p>
            <Link href="/reports" className="mt-2 inline-block text-blue-600 hover:text-blue-800">
              ← Back to Reports
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Link href="/reports" className="text-gray-500 hover:text-gray-700 mr-4">
                ← Back to Reports
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{report.name}</h1>
                <p className="mt-2 text-gray-600">{report.description}</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
                {report.status}
              </span>
            </div>
          </div>

          {/* Report Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Report Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Report Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-500">File Name</dt>
                    <dd className="text-sm font-medium">{report.file_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">File Size</dt>
                    <dd className="text-sm font-medium">{formatFileSize(report.file_size)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Upload Date</dt>
                    <dd className="text-sm font-medium">
                      {new Date(report.upload_date).toLocaleString()}
                    </dd>
                  </div>
                  {report.processed_date && (
                    <div>
                      <dt className="text-sm text-gray-500">Processed Date</dt>
                      <dd className="text-sm font-medium">
                        {new Date(report.processed_date).toLocaleString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Vulnerability Stats */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Vulnerability Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="text-lg font-bold">{stats?.total || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-red-600">High</span>
                    <span className="text-lg font-bold text-red-700">{stats?.high || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-yellow-600">Medium</span>
                    <span className="text-lg font-bold text-yellow-700">{stats?.medium || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-600">Low</span>
                    <span className="text-lg font-bold text-green-700">{stats?.low || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Info</span>
                    <span className="text-lg font-bold text-gray-700">{stats?.info || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    href={`/vulnerabilities?report=${reportId}`}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 block text-center"
                  >
                    View All Vulnerabilities
                  </Link>
                  <Link
                    href="/upload"
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 block text-center"
                  >
                    Upload New Scan
                  </Link>
                  <Link
                    href="/reports"
                    className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm hover:bg-gray-300 block text-center"
                  >
                    Compare with Other Reports
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button className="border-b-2 border-blue-500 py-2 px-1 text-sm font-medium text-blue-600">
                Vulnerabilities
              </button>
              <button className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700">
                IP Summary
              </button>
              <button className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700">
                CVE Analysis
              </button>
            </nav>
          </div>

          {/* Vulnerability Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                    Search Vulnerabilities
                  </label>
                  <input
                    type="text"
                    id="search"
                    placeholder="Search by IP, CVE, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
                    Severity
                  </label>
                  <select
                    id="severity"
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Severities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="info">Info</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSeverityFilter("all");
                    }}
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vulnerabilities List */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Vulnerabilities ({filteredVulnerabilities.length})
                </h3>
              </div>
              
              {filteredVulnerabilities.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No vulnerabilities found.</p>
              ) : (
                <div className="space-y-4">
                  {filteredVulnerabilities.slice(0, 20).map((vuln) => (
                    <div key={vuln.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(vuln.severity)}`}>
                              {vuln.severity}
                            </span>
                            <h4 className="text-sm font-medium text-gray-900">{vuln.cve}</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">IP Address:</span> {vuln.ip_address}
                              </p>
                              {vuln.plugin_name && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Plugin:</span> {vuln.plugin_name}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Detected:</span>{" "}
                                {new Date(vuln.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          {vuln.description && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                              {vuln.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredVulnerabilities.length > 20 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">
                        Showing first 20 of {filteredVulnerabilities.length} vulnerabilities.
                      </p>
                      <Link
                        href={`/vulnerabilities?report=${reportId}`}
                        className="mt-2 inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                      >
                        View All Vulnerabilities
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
