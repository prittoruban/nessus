"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface DashboardStats {
  totalReports: number;
  totalOrganizations: number;
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  processedThisMonth: number;
  averageScore: number;
}

interface RecentReport {
  id: string;
  orgName: string;
  reportName: string;
  iteration: number;
  createdAt: string;
  status: "completed" | "processing" | "failed";
  vulnerabilityCount: number;
  criticalCount: number;
}

interface TrendData {
  month: string;
  vulnerabilities: number;
  reports: number;
}

export default function Home() {
  // Mock data - will be replaced with actual API calls
  const mockStats: DashboardStats = {
    totalReports: 24,
    totalOrganizations: 8,
    totalVulnerabilities: 1847,
    criticalVulnerabilities: 156,
    highVulnerabilities: 423,
    processedThisMonth: 6,
    averageScore: 7.2
  };

  const mockRecentReports: RecentReport[] = [
    {
      id: "rpt-001",
      orgName: "ABC Corporation",
      reportName: "Q4 Network Security Assessment",
      iteration: 3,
      createdAt: "2025-01-15",
      status: "completed",
      vulnerabilityCount: 112,
      criticalCount: 8
    },
    {
      id: "rpt-002",
      orgName: "XYZ Company",
      reportName: "Initial Security Baseline",
      iteration: 1,
      createdAt: "2025-01-14",
      status: "completed",
      vulnerabilityCount: 89,
      criticalCount: 5
    },
    {
      id: "rpt-003",
      orgName: "TechCorp Ltd",
      reportName: "Infrastructure Assessment",
      iteration: 1,
      createdAt: "2025-01-13",
      status: "processing",
      vulnerabilityCount: 0,
      criticalCount: 0
    }
  ];

  const mockTrendData: TrendData[] = [
    { month: "Oct", vulnerabilities: 1245, reports: 18 },
    { month: "Nov", vulnerabilities: 1567, reports: 20 },
    { month: "Dec", vulnerabilities: 1734, reports: 22 },
    { month: "Jan", vulnerabilities: 1847, reports: 24 }
  ];

  const [selectedPeriod, setSelectedPeriod] = useState("monthly");

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

  const getRiskLevel = (criticalCount: number) => {
    if (criticalCount >= 10) return { level: "High", color: "text-red-600 bg-red-100" };
    if (criticalCount >= 5) return { level: "Medium", color: "text-orange-600 bg-orange-100" };
    if (criticalCount >= 1) return { level: "Low", color: "text-yellow-600 bg-yellow-100" };
    return { level: "Minimal", color: "text-green-600 bg-green-100" };
  };

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vulnerability Assessment Dashboard</h1>
          <p className="text-gray-600">Monitor security posture across all organizations</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            <Link href="/upload">
              <Button variant="primary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Quick Upload
              </Button>
            </Link>
            <Link href="/risk-insights">
              <Button variant="secondary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Risk Insights
              </Button>
            </Link>
            <Link href="/overview-of-results">
              <Button variant="secondary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Overview
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                  <p className="text-2xl font-bold text-gray-900">{mockStats.totalReports}</p>
                  <p className="text-xs text-green-600">+{mockStats.processedThisMonth} this month</p>
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
                  <p className="text-2xl font-bold text-gray-900">{mockStats.totalOrganizations}</p>
                  <p className="text-xs text-gray-500">Active clients</p>
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
                  <p className="text-sm font-medium text-gray-600">Critical Issues</p>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.criticalVulnerabilities}</p>
                  <p className="text-xs text-red-600">Requires immediate attention</p>
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
                  <p className="text-2xl font-bold text-gray-900">{mockStats.totalVulnerabilities.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{mockStats.highVulnerabilities} high severity</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Reports */}
          <div className="lg:col-span-2">
            <Card>
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
                  <Link href="/reports">
                    <Button variant="secondary" size="sm">View All</Button>
                  </Link>
                </div>

                <div className="space-y-4">
                  {mockRecentReports.map(report => {
                    const risk = getRiskLevel(report.criticalCount);
                    return (
                      <div key={report.id} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold text-gray-900">{report.reportName}</h3>
                              {getStatusBadge(report.status)}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                {report.orgName}
                              </span>
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Iteration #{report.iteration}
                              </span>
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(report.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {report.status === "completed" && (
                              <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-600">
                                  {report.vulnerabilityCount} vulnerabilities
                                </span>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${risk.color}`}>
                                  {risk.level} Risk
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            {report.status === "completed" && (
                              <Link href={`/reports/${report.id}`}>
                                <Button variant="primary" size="sm">View</Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>

          {/* Trend Chart & Quick Stats */}
          <div className="space-y-6">
            {/* Security Trend */}
            <Card>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Security Trend</h2>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                
                <div className="space-y-3">
                  {mockTrendData.map((data, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{data.month}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(data.vulnerabilities / 2000) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{data.vulnerabilities}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Risk Summary */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Critical</span>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                      {mockStats.criticalVulnerabilities}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">High</span>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      {mockStats.highVulnerabilities}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Security Score</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {mockStats.averageScore}/10
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <Link href="/risk-insights">
                    <Button variant="secondary" size="sm" className="w-full">
                      View Detailed Analysis
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <Link href="/vulnerabilities" className="block">
                    <button className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-sm text-gray-700">View All Vulnerabilities</span>
                      </div>
                    </button>
                  </Link>
                  <Link href="/reports" className="block">
                    <button className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm text-gray-700">Generate Report</span>
                      </div>
                    </button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
