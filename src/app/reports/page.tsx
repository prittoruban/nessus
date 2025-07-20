"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Report {
  id: string;
  orgName: string;
  reportName: string;
  sourceType: "internal" | "external";
  iteration: number;
  scanDate: string;
  createdAt: string;
  vulnerabilityCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
  status: "completed" | "processing" | "failed";
  progress?: number;
}

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedSourceType, setSelectedSourceType] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // Mock data - will be replaced with actual API calls
  const mockReports: Report[] = [
    {
      id: "rpt-001",
      orgName: "ABC Corporation",
      reportName: "Q4 Network Security Assessment",
      sourceType: "external",
      iteration: 3,
      scanDate: "2025-01-15",
      createdAt: "2025-01-15",
      vulnerabilityCount: {
        critical: 8,
        high: 15,
        medium: 32,
        low: 45,
        info: 12,
        total: 112
      },
      status: "completed"
    },
    {
      id: "rpt-002",
      orgName: "ABC Corporation",
      reportName: "Q3 Network Security Assessment",
      sourceType: "external",
      iteration: 2,
      scanDate: "2024-12-10",
      createdAt: "2024-12-10",
      vulnerabilityCount: {
        critical: 12,
        high: 25,
        medium: 56,
        low: 89,
        info: 18,
        total: 200
      },
      status: "completed"
    },
    {
      id: "rpt-003",
      orgName: "XYZ Company",
      reportName: "Initial Security Baseline",
      sourceType: "internal",
      iteration: 1,
      scanDate: "2024-11-20",
      createdAt: "2024-11-20",
      vulnerabilityCount: {
        critical: 5,
        high: 18,
        medium: 34,
        low: 67,
        info: 23,
        total: 147
      },
      status: "completed"
    },
    {
      id: "rpt-004",
      orgName: "TechCorp Ltd",
      reportName: "Infrastructure Assessment",
      sourceType: "external",
      iteration: 1,
      scanDate: "2025-01-20",
      createdAt: "2025-01-20",
      vulnerabilityCount: {
        critical: 3,
        high: 8,
        medium: 15,
        low: 24,
        info: 8,
        total: 58
      },
      status: "processing",
      progress: 75
    }
  ];

  const organizations = Array.from(new Set(mockReports.map(r => r.orgName)));

  // Filter and sort reports
  const filteredReports = mockReports
    .filter(report => {
      const matchesSearch = !searchTerm || 
        report.reportName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.orgName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOrg = !selectedOrg || report.orgName === selectedOrg;
      const matchesSource = !selectedSourceType || report.sourceType === selectedSourceType;
      return matchesSearch && matchesOrg && matchesSource;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name":
          return a.reportName.localeCompare(b.reportName);
        case "org":
          return a.orgName.localeCompare(b.orgName);
        case "vulnerabilities":
          return b.vulnerabilityCount.total - a.vulnerabilityCount.total;
        default:
          return 0;
      }
    });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-purple-600 bg-purple-100";
      case "high": return "text-red-600 bg-red-100";
      case "medium": return "text-orange-600 bg-orange-100";
      case "low": return "text-yellow-600 bg-yellow-100";
      case "info": return "text-blue-600 bg-blue-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Completed</span>;
      case "processing":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Processing</span>;
      case "failed":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Vulnerability Assessment Reports</h1>
              <p className="text-gray-600">Manage and review security assessment reports across organizations</p>
            </div>
            <Link href="/upload">
              <Button variant="primary">
                + New Report
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <Input
                  type="text"
                  placeholder="Search reports or organizations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Organizations</option>
                  {organizations.map(org => (
                    <option key={org} value={org}>{org}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source Type</label>
                <select
                  value={selectedSourceType}
                  onChange={(e) => setSelectedSourceType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Sources</option>
                  <option value="internal">Internal</option>
                  <option value="external">External</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Report Name</option>
                  <option value="org">Organization</option>
                  <option value="vulnerabilities">Most Vulnerabilities</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredReports.length}</p>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Organizations</p>
                  <p className="text-2xl font-bold text-gray-900">{organizations.length}</p>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Critical Vulnerabilities</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredReports.reduce((sum, r) => sum + r.vulnerabilityCount.critical, 0)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Vulnerabilities</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredReports.reduce((sum, r) => sum + r.vulnerabilityCount.total, 0)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <Card>
              <div className="p-12 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                <p className="text-gray-600 mb-4">No reports match your current filters.</p>
                <Link href="/upload">
                  <Button variant="primary">Upload First Report</Button>
                </Link>
              </div>
            </Card>
          ) : (
            filteredReports.map(report => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{report.reportName}</h3>
                        {getStatusBadge(report.status)}
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          report.sourceType === "external" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {report.sourceType}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {report.orgName}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(report.scanDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Iteration #{report.iteration}
                        </span>
                      </div>

                      {/* Processing Progress */}
                      {report.status === "processing" && report.progress && (
                        <div className="mb-3">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Processing...</span>
                            <span>{report.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${report.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Vulnerability Counts */}
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(report.vulnerabilityCount)
                          .filter(([key]) => key !== "total")
                          .map(([severity, count]) => (
                            <span
                              key={severity}
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(severity)}`}
                            >
                              {severity.charAt(0).toUpperCase() + severity.slice(1)}: {count}
                            </span>
                          ))}
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Total: {report.vulnerabilityCount.total}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      {report.status === "completed" && (
                        <>
                          <Link href={`/reports/${report.id}`}>
                            <Button variant="primary" size="sm">View Report</Button>
                          </Link>
                          <Button variant="secondary" size="sm">Export PDF</Button>
                        </>
                      )}
                      {report.status === "processing" && (
                        <Button variant="secondary" size="sm" disabled>Processing...</Button>
                      )}
                      {report.status === "failed" && (
                        <Button variant="primary" size="sm">Retry</Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
