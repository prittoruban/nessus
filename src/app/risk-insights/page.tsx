"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function RiskInsightsPage() {
  const [selectedSourceType, setSelectedSourceType] = useState<"internal" | "external">("internal");
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");
  const [selectedIteration, setSelectedIteration] = useState<number>(1);

  // Mock data - will be replaced with real API calls
  const organizations = {
    internal: ["ABC Corporation", "XYZ Company", "TechCorp Ltd"],
    external: ["Client A", "Client B", "Partner Corp"]
  };

  const iterations = [
    { number: 1, date: "2025-01-15", critical: 15, high: 40, medium: 30, low: 50 },
    { number: 2, date: "2025-02-15", critical: 0, high: 2, medium: 5, low: 10 },
  ];

  const topIPs = [
    { ip: "192.168.1.100", critical: 8, high: 12, medium: 5, low: 2 },
    { ip: "192.168.1.101", critical: 5, high: 15, medium: 8, low: 3 },
    { ip: "192.168.1.102", critical: 2, high: 13, medium: 12, low: 5 },
  ];

  const topCVEs = [
    { cve: "CVE-2025-22224", severity: "Critical", affectedIPs: 5, description: "VMware ESXi Multiple Vulnerabilities" },
    { cve: "CVE-2025-22225", severity: "Critical", affectedIPs: 3, description: "VMware ESXi Authentication Bypass" },
    { cve: "CVE-2013-3900", severity: "Medium", affectedIPs: 8, description: "WinVerifyTrust Signature Validation" },
  ];

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Risk Insights</h1>
          <p className="text-gray-600">Deep-dive analysis of vulnerability trends and risk patterns</p>
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
                Internal Scans
              </Button>
              <Button
                variant={selectedSourceType === "external" ? "active" : "secondary"}
                onClick={() => setSelectedSourceType("external")}
              >
                External Scans
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

        {/* Content shown only when organization is selected */}
        {selectedOrganization && (
          <>
            {/* Iteration Comparison */}
            <Card className="mb-6">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan Iterations Comparison</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Iteration</th>
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Critical</th>
                        <th className="text-left py-2">High</th>
                        <th className="text-left py-2">Medium</th>
                        <th className="text-left py-2">Low</th>
                        <th className="text-left py-2">Total</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {iterations.map((iteration) => (
                        <tr key={iteration.number} className="border-b hover:bg-gray-50">
                          <td className="py-3">#{iteration.number}</td>
                          <td className="py-3">{iteration.date}</td>
                          <td className="py-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {iteration.critical}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              {iteration.high}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {iteration.medium}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {iteration.low}
                            </span>
                          </td>
                          <td className="py-3 font-semibold">
                            {iteration.critical + iteration.high + iteration.medium + iteration.low}
                          </td>
                          <td className="py-3">
                            <Button
                              variant={selectedIteration === iteration.number ? "primary" : "secondary"}
                              size="sm"
                              onClick={() => setSelectedIteration(iteration.number)}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            {/* Detailed Analysis for Selected Iteration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Top Affected IPs */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Top Affected IPs (Iteration #{selectedIteration})
                  </h3>
                  <div className="space-y-3">
                    {topIPs.map((ip) => (
                      <div key={ip.ip} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-mono text-sm font-medium">{ip.ip}</div>
                          <div className="text-xs text-gray-500">
                            Total: {ip.critical + ip.high + ip.medium + ip.low} vulnerabilities
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            C: {ip.critical}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            H: {ip.high}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            M: {ip.medium}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            L: {ip.low}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Top CVEs */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Top CVEs (Iteration #{selectedIteration})
                  </h3>
                  <div className="space-y-3">
                    {topCVEs.map((cve) => (
                      <div key={cve.cve} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-mono text-sm font-medium">{cve.cve}</div>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            cve.severity === "Critical" 
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {cve.severity}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mb-1">{cve.description}</div>
                        <div className="text-xs text-gray-500">
                          Affects {cve.affectedIPs} IP{cve.affectedIPs !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Detailed CVE Table */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  All CVEs with Solutions (Iteration #{selectedIteration})
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">CVE</th>
                        <th className="text-left py-2">Severity</th>
                        <th className="text-left py-2">Affected IPs</th>
                        <th className="text-left py-2">Description</th>
                        <th className="text-left py-2">Solution</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="py-3 font-mono text-sm">CVE-2025-22224</td>
                        <td className="py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Critical
                          </span>
                        </td>
                        <td className="py-3">5 IPs</td>
                        <td className="py-3 max-w-xs truncate">VMware ESXi 7.0 / 8.0 Multiple Vulnerabilities</td>
                        <td className="py-3 max-w-xs truncate">Upgrade to VMware ESXi 7.0 Update 3s, 8.0 Update 2d, or later</td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="py-3 font-mono text-sm">CVE-2013-3900</td>
                        <td className="py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Medium
                          </span>
                        </td>
                        <td className="py-3">8 IPs</td>
                        <td className="py-3 max-w-xs truncate">WinVerifyTrust Signature Validation</td>
                        <td className="py-3 max-w-xs truncate">Add and enable registry value EnableCertPaddingCheck</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
