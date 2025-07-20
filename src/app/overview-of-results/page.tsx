"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function OverviewOfResultsPage() {
  const [selectedSourceType, setSelectedSourceType] = useState<"internal" | "external">("internal");
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");

  // Mock data - will be replaced with real API calls
  const organizations = {
    internal: ["ABC Corporation", "XYZ Company", "TechCorp Ltd"],
    external: ["Client A", "Client B", "Partner Corp"]
  };

  const summaryData = {
    totalVulnerabilities: 314,
    hostCount: 12,
    iterations: [
      { iteration: 1, critical: 25, high: 53, medium: 217, low: 19, info: 0, total: 314 },
      { iteration: 2, critical: 0, high: 2, medium: 5, low: 10, info: 0, total: 17 },
    ]
  };

  const severityDistribution = [
    { severity: "Critical", count: 25, percentage: 8, color: "bg-red-500" },
    { severity: "High", count: 53, percentage: 17, color: "bg-orange-500" },
    { severity: "Medium", count: 217, percentage: 69, color: "bg-yellow-500" },
    { severity: "Low", count: 19, percentage: 6, color: "bg-green-500" },
  ];

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Overview of Results</h1>
          <p className="text-gray-600">Executive-level summary of vulnerability assessment results</p>
        </div>

        {/* Source Type Selector */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Source Type</h2>
            <div className="flex space-x-4">
              <Button
                variant={selectedSourceType === "internal" ? "active" : "secondary"}
                onClick={() => setSelectedSourceType("internal")}
              >
                Internal Assessments
              </Button>
              <Button
                variant={selectedSourceType === "external" ? "active" : "secondary"}
                onClick={() => setSelectedSourceType("external")}
              >
                External Assessments
              </Button>
            </div>
          </div>
        </Card>

        {/* Organization Selector */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Organization</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {organizations[selectedSourceType].map((org) => (
                <Button
                  key={org}
                  variant={selectedOrganization === org ? "active" : "secondary"}
                  onClick={() => setSelectedOrganization(org)}
                  className="text-left justify-start"
                >
                  {org}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Executive Summary shown only when organization is selected */}
        {selectedOrganization && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <div className="p-6 text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">{summaryData.totalVulnerabilities}</div>
                  <div className="text-sm text-gray-600">Total Vulnerabilities</div>
                </div>
              </Card>
              <Card>
                <div className="p-6 text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">{summaryData.hostCount}</div>
                  <div className="text-sm text-gray-600">Hosts Scanned</div>
                </div>
              </Card>
              <Card>
                <div className="p-6 text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {summaryData.iterations[0].critical}
                  </div>
                  <div className="text-sm text-gray-600">Critical Issues</div>
                </div>
              </Card>
              <Card>
                <div className="p-6 text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">
                    {summaryData.iterations[0].high}
                  </div>
                  <div className="text-sm text-gray-600">High Priority</div>
                </div>
              </Card>
            </div>

            {/* Vulnerability Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Pie Chart Placeholder */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Vulnerability Distribution</h3>
                  <div className="space-y-4">
                    {severityDistribution.map((item) => (
                      <div key={item.severity} className="flex items-center">
                        <div className={`w-4 h-4 rounded ${item.color} mr-3`}></div>
                        <div className="flex-1 flex justify-between items-center">
                          <span className="text-sm font-medium">{item.severity}</span>
                          <div className="text-right">
                            <span className="text-sm font-bold">{item.count}</span>
                            <span className="text-xs text-gray-500 ml-1">({item.percentage}%)</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Simple Progress Bars */}
                  <div className="mt-6 space-y-3">
                    {severityDistribution.map((item) => (
                      <div key={item.severity}>
                        <div className="flex justify-between text-xs mb-1">
                          <span>{item.severity}</span>
                          <span>{item.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${item.color}`}
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Progress Tracking */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Tracking</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-green-800">Improvement Rate</div>
                        <div className="text-xs text-green-600">From 1st to 2nd iteration</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-800">94.6%</div>
                        <div className="text-xs text-green-600">Reduction</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-blue-800">Critical Issues Resolved</div>
                        <div className="text-xs text-blue-600">Zero critical issues remaining</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-800">25/25</div>
                        <div className="text-xs text-blue-600">100%</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-yellow-800">High Priority Progress</div>
                        <div className="text-xs text-yellow-600">Significant improvement shown</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-yellow-800">51/53</div>
                        <div className="text-xs text-yellow-600">96.2%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Iteration Comparison Table */}
            <Card className="mb-6">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Iteration Summary</h3>
                  <Button variant="primary" size="sm">
                    Download Executive Summary
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Iteration</th>
                        <th className="text-center py-3 px-4">Critical</th>
                        <th className="text-center py-3 px-4">High</th>
                        <th className="text-center py-3 px-4">Medium</th>
                        <th className="text-center py-3 px-4">Low</th>
                        <th className="text-center py-3 px-4">Info</th>
                        <th className="text-center py-3 px-4">Total</th>
                        <th className="text-center py-3 px-4">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.iterations.map((iteration, index) => (
                        <tr key={iteration.iteration} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">Iteration #{iteration.iteration}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {iteration.critical}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              {iteration.high}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {iteration.medium}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {iteration.low}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {iteration.info}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold">{iteration.total}</td>
                          <td className="py-3 px-4 text-center">
                            {index > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                -94.6%
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            {/* Export Options */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">
                    Download Executive PDF
                  </Button>
                  <Button variant="secondary">
                    Export Data (CSV)
                  </Button>
                  <Button variant="secondary">
                    Generate Presentation
                  </Button>
                  <Button variant="secondary">
                    Schedule Report
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
