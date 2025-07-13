"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { Vulnerability } from "@/types/vulnerability";
import Link from "next/link";
import { PDFService } from "@/lib/services/pdf.service";

function VulnerabilitiesContent() {
  const searchParams = useSearchParams();
  const reportFilter = searchParams.get('report');
  
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reportName, setReportName] = useState("");
  const [exportingPDF, setExportingPDF] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchVulnerabilities = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from("vulnerabilities")
          .select("*", { count: "exact" });

        // Apply report filter if provided
        if (reportFilter) {
          query = query.eq("report_id", reportFilter);
          // Fetch report name for display
          const { data: reportData } = await supabase
            .from("reports")
            .select("name")
            .eq("id", reportFilter)
            .single();
          if (reportData) {
            setReportName(reportData.name);
          }
        }

        // Apply severity filter
        if (severityFilter !== "all") {
          query = query.eq("severity", severityFilter);
        }

        // Apply pagination
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        query = query.range(from, to).order("created_at", { ascending: false });

        const { data, error, count } = await query;

        if (error) {
          console.error("Error fetching vulnerabilities:", error);
          return;
        }

        setVulnerabilities(data || []);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVulnerabilities();
  }, [currentPage, severityFilter, reportFilter]);

  const filteredVulnerabilities = vulnerabilities.filter((vuln) =>
    vuln.ip_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vuln.cve?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vuln.plugin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vuln.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Group vulnerabilities by IP for summary
  const ipSummary = filteredVulnerabilities.reduce((acc, vuln) => {
    if (!acc[vuln.ip_address]) {
      acc[vuln.ip_address] = { total: 0, high: 0, medium: 0, low: 0, info: 0 };
    }
    acc[vuln.ip_address].total++;
    acc[vuln.ip_address][vuln.severity as keyof typeof acc[string]]++;
    return acc;
  }, {} as Record<string, { total: number; high: number; medium: number; low: number; info: number }>);

  // Group vulnerabilities by CVE
  const cveSummary = filteredVulnerabilities.reduce((acc, vuln) => {
    if (!acc[vuln.cve]) {
      acc[vuln.cve] = {
        severity: vuln.severity,
        plugin_name: vuln.plugin_name,
        count: 0,
        ips: new Set<string>()
      };
    }
    acc[vuln.cve].count++;
    acc[vuln.cve].ips.add(vuln.ip_address);
    return acc;
  }, {} as Record<string, { severity: string; plugin_name?: string; count: number; ips: Set<string> }>);

  const handleExportPDF = async () => {
    if (!vulnerabilities.length) return;
    
    try {
      setExportingPDF(true);
      
      const pdfService = new PDFService();
      
      // Create a mock report data for vulnerabilities export
      const reportData = {
        id: reportFilter || "all-vulnerabilities",
        name: reportName || "All Vulnerabilities Report",
        description: reportFilter ? `Vulnerabilities from ${reportName}` : "Complete vulnerability analysis",
        file_name: "vulnerabilities_export.csv",
        total_vulnerabilities: vulnerabilities.length,
        high_count: vulnerabilities.filter(v => v.severity === 'high').length,
        medium_count: vulnerabilities.filter(v => v.severity === 'medium').length,
        low_count: vulnerabilities.filter(v => v.severity === 'low').length,
        info_count: vulnerabilities.filter(v => v.severity === 'info').length,
        upload_date: new Date().toISOString(),
        processed_date: new Date().toISOString(),
      };

      pdfService.generateVulnerabilityReport(reportData, vulnerabilities, {
        includeIPSummary: true,
        includeCVESummary: true,
        includeVulnerabilityDetails: true,
      });

      const filename = reportFilter 
        ? `${reportName.replace(/[^a-zA-Z0-9]/g, '_')}_vulnerabilities.pdf`
        : 'all_vulnerabilities_report.pdf';
      pdfService.download(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF report. Please try again.");
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-4">
                  <Link href={reportFilter ? `/reports/${reportFilter}` : "/"} className="text-gray-500 hover:text-gray-700 mr-4">
                    ← Back to {reportFilter ? "Report" : "Dashboard"}
                  </Link>
                </div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Vulnerabilities
                  {reportName && (
                    <span className="text-lg font-normal text-gray-600 ml-2">
                      - {reportName}
                    </span>
                  )}
                </h1>
                <p className="mt-2 text-gray-600">
                  {reportFilter 
                    ? "Vulnerabilities from this specific report"
                    : "Browse and analyze vulnerability data from all scans"
                  }
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleExportPDF}
                  disabled={exportingPDF || vulnerabilities.length === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {exportingPDF ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export PDF
                    </>
                  )}
                </button>
                {!reportFilter && (
                  <Link
                    href="/reports"
                    className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
                  >
                    View Reports
                  </Link>
                )}
                <Link
                  href="/upload"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Upload New Scan
                </Link>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button className="border-b-2 border-blue-500 py-2 px-1 text-sm font-medium text-blue-600">
                All Vulnerabilities
              </button>
              <button 
                onClick={() => document.getElementById('ip-summary')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                IP Summary ({Object.keys(ipSummary).length})
              </button>
              <button 
                onClick={() => document.getElementById('cve-summary')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                CVE Analysis ({Object.keys(cveSummary).length})
              </button>
            </nav>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                    Search
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
                      setCurrentPage(1);
                    }}
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card className="mb-8">
            <CardContent className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading vulnerabilities...</p>
                </div>
              ) : filteredVulnerabilities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No vulnerabilities found.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">
                      Vulnerabilities ({filteredVulnerabilities.length})
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    {filteredVulnerabilities.map((vuln, index) => (
                      <div key={vuln.id || index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
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
                                  {vuln.created_at && new Date(vuln.created_at).toLocaleDateString()}
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
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* IP-based Summary */}
          <Card id="ip-summary" className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">IP-based Summary</h3>
              {Object.keys(ipSummary).length === 0 ? (
                <p className="text-gray-500">No IP data available.</p>
              ) : (
                <div className="grid gap-4">
                  {Object.entries(ipSummary)
                    .sort(([,a], [,b]) => b.total - a.total)
                    .map(([ip, stats]) => (
                      <div key={ip} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{ip}</h4>
                          <span className="text-sm text-gray-500">
                            {stats.total} vulnerabilities
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="bg-red-50 p-2 rounded text-center">
                            <p className="text-xs text-red-600">High</p>
                            <p className="text-sm font-bold text-red-800">{stats.high}</p>
                          </div>
                          <div className="bg-yellow-50 p-2 rounded text-center">
                            <p className="text-xs text-yellow-600">Medium</p>
                            <p className="text-sm font-bold text-yellow-800">{stats.medium}</p>
                          </div>
                          <div className="bg-green-50 p-2 rounded text-center">
                            <p className="text-xs text-green-600">Low</p>
                            <p className="text-sm font-bold text-green-800">{stats.low}</p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded text-center">
                            <p className="text-xs text-gray-600">Info</p>
                            <p className="text-sm font-bold text-gray-800">{stats.info}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CVE-based Analysis */}
          <Card id="cve-summary" className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">CVE-based Analysis</h3>
              {Object.keys(cveSummary).length === 0 ? (
                <p className="text-gray-500">No CVE data available.</p>
              ) : (
                <div className="grid gap-4">
                  {Object.entries(cveSummary)
                    .sort(([,a], [,b]) => b.count - a.count)
                    .map(([cve, data]) => (
                      <div key={cve} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(data.severity)}`}>
                                {data.severity}
                              </span>
                              <h4 className="font-medium text-gray-900">{cve}</h4>
                            </div>
                            {data.plugin_name && (
                              <p className="text-sm text-gray-600 mb-2">{data.plugin_name}</p>
                            )}
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>{data.count} occurrences</span>
                              <span>{data.ips.size} affected IPs</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
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
                    Showing page <span className="font-medium">{currentPage}</span> of{" "}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
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
        </div>
      </main>
    </div>
  );
}

export default function VulnerabilitiesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <VulnerabilitiesContent />
    </Suspense>
  );
}
