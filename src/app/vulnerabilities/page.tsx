"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Vulnerability } from "@/types/vulnerability";
import Link from "next/link";

export default function VulnerabilitiesPage() {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchVulnerabilities = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from("vulnerabilities")
          .select("*", { count: "exact" });

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
  }, [currentPage, severityFilter]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/" className="text-gray-500 hover:text-gray-700 mr-4">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Vulnerabilities</h1>
            </div>
            <Link
              href="/upload"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Upload New Scan
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filters */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
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
          </div>

          {/* Results */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading vulnerabilities...</p>
              </div>
            ) : filteredVulnerabilities.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No vulnerabilities found.</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm text-gray-700">
                    Showing {filteredVulnerabilities.length} of {vulnerabilities.length} vulnerabilities
                  </p>
                </div>
                <ul className="divide-y divide-gray-200">
                  {filteredVulnerabilities.map((vuln, index) => (
                    <li key={vuln.id || index} className="px-4 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(vuln.severity)}`}>
                                {vuln.severity}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {vuln.cve}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {vuln.plugin_name}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">IP:</span> {vuln.ip_address}
                            </p>
                            {vuln.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {vuln.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-sm text-gray-500">
                          {vuln.created_at && new Date(vuln.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
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
        </div>
      </main>
    </div>
  );
} 