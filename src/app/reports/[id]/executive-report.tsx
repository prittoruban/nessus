"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  ExecutiveReportView, 
  HostSummaryView, 
  VulnerabilityDetailView,
  RISK_MODEL_DATA,
  METHODOLOGY_CONTENT
} from "@/lib/validators/executive-report.schema";

// Define severity levels locally
const SEVERITY_LEVELS = {
  critical: { label: "Critical", color: "bg-red-500", textColor: "text-red-700", priority: 1 },
  high: { label: "High", color: "bg-orange-500", textColor: "text-orange-700", priority: 2 },
  medium: { label: "Medium", color: "bg-yellow-500", textColor: "text-yellow-700", priority: 3 },
  low: { label: "Low", color: "bg-blue-500", textColor: "text-blue-700", priority: 4 },
  info: { label: "Info", color: "bg-gray-500", textColor: "text-gray-700", priority: 5 },
} as const;

interface ExecutiveReportData {
  reportData: ExecutiveReportView;
  hostSummary: HostSummaryView[];
  vulnerabilities: VulnerabilityDetailView[];
  zeroDayVulnerabilities: VulnerabilityDetailView[];
  nonZeroDayVulnerabilities: VulnerabilityDetailView[];
  riskSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
  zeroDayRiskSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
}

export default function ExecutiveReportPage() {
  const params = useParams();
  const reportId = params.id as string;
  
  const [reportData, setReportData] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    const fetchExecutiveReport = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/reports/${reportId}/executive`);
        const result = await response.json();

        if (response.ok) {
          setReportData(result.data);
        } else {
          setError(result.error || "Failed to fetch executive report data");
        }
      } catch (err) {
        setError("Failed to fetch executive report data");
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (reportId) {
      fetchExecutiveReport();
    }
  }, [reportId]);

  const handleDownloadPDF = async () => {
    if (!reportData) return;
    
    try {
      setDownloadingPDF(true);
      const response = await fetch(`/api/reports/${reportId}/pdf`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${reportData.reportData.org_name}_VA_Report.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF report. Please try again.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 print:bg-white">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading executive report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
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

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <p className="text-gray-500">Executive report not found</p>
            <Link href="/reports" className="mt-2 inline-block text-blue-600 hover:text-blue-800">
              ← Back to Reports
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { 
    reportData: report, 
    hostSummary, 
    zeroDayVulnerabilities, 
    nonZeroDayVulnerabilities, 
    riskSummary, 
    zeroDayRiskSummary 
  } = reportData;

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 print:px-0 print:py-0">
        
        {/* Header with Actions */}
        <div className="mb-6 print:hidden">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/reports" className="text-blue-600 hover:text-blue-800">
                ← Back to Reports
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">
                Executive Report
              </h1>
              <p className="text-gray-600">{report.org_name}</p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {downloadingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating PDF...
                  </>
                ) : (
                  "Download Executive Summary"
                )}
              </Button>
              <Button
                onClick={() => window.print()}
                variant="secondary"
              >
                Print Report
              </Button>
            </div>
          </div>
        </div>

        {/* Executive Report Content */}
        <div className="space-y-8 print:space-y-6">

          {/* Section 1: Cover Page */}
          <Card className="print:shadow-none print:border-none">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl lg:text-3xl font-bold mb-8 print:text-2xl">
                Internal Vulnerability Assessment Report
              </h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
                <div className="space-y-4">
                  <div>
                    <span className="font-semibold">Organization Name:</span>
                    <div className="mt-1">{report.org_name}</div>
                  </div>
                  <div>
                    <span className="font-semibold">Version:</span>
                    <div className="mt-1">{report.version}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="font-semibold">Date Range:</span>
                    <div className="mt-1">
                      {report.formatted_start_date && report.formatted_end_date
                        ? `${report.formatted_start_date} to ${report.formatted_end_date}`
                        : "Not specified"}
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold">Document Type:</span>
                    <div className="mt-1">{report.document_type}</div>
                  </div>
                </div>
              </div>

              <div className="mt-12 space-y-6 max-w-2xl mx-auto text-left">
                {[
                  { label: "Assessee", name: report.assessee },
                  { label: "Assessor", name: report.assessor },
                  { label: "Reviewer", name: report.reviewer },
                  { label: "Approved by", name: report.approver }
                ].map((sig, index) => (
                  <div key={index} className="flex flex-col">
                    <span className="font-semibold">{sig.label}</span>
                    <div className="border-b border-gray-300 w-full mt-1 pb-1">
                      {sig.name || ""}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 text-sm text-gray-600 space-y-2">
                <div>{report.legal_disclaimer}</div>
                <div>Confidentiality Level: {report.confidentiality_level}</div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Scan Manifest */}
          <Card className="print:shadow-none print:border-none print:break-before-page">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">2. SCAN MANIFEST</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Label
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[
                      ["Description", report.scan_description],
                      ["Test Started On", report.formatted_start_date || "Not specified"],
                      ["Test Completed On", report.formatted_end_date || "Not specified"],
                      ["No. of IPs Tested", report.number_of_ips.toString()],
                      ["Test Performed At", report.test_location],
                      ["Tool Used", report.tool_used]
                    ].map(([label, value], index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {label}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Executive Summary */}
          <Card className="print:shadow-none print:border-none print:break-before-page">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">3. EXECUTIVE SUMMARY</h2>
              
              <p className="mb-6 leading-6">
                This internal assessment was conducted to understand the vulnerabilities affecting the environment. 
                The assessment provides insights into the security posture and recommends remediation measures to 
                strengthen the overall security framework.
              </p>

              <h3 className="text-lg font-bold mb-4">Risk Model:</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        CVSS Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {RISK_MODEL_DATA.map((risk, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {risk.priority}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {risk.severity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {risk.cvss_range}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {risk.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Methodology */}
          <Card className="print:shadow-none print:border-none print:break-before-page">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">4. METHODOLOGY</h2>
              
              <div className="space-y-4">
                {METHODOLOGY_CONTENT.map((step) => (
                  <div key={step.step} className="mb-4">
                    <h4 className="font-bold mb-2">{step.step}. {step.title}</h4>
                    <p className="leading-6">{step.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Project Scope */}
          <Card className="print:shadow-none print:border-none print:break-before-page">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">5. PROJECT SCOPE</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        S.No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {hostSummary.map((host, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {host.ip_address}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {host.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <p className="text-sm text-gray-600 mt-4 italic">
                {report.project_scope_notes || 
                "This assessment did not include brute-force, denial-of-service, phishing, or physical security testing methods."}
              </p>
            </CardContent>
          </Card>

          {/* Section 6: Summary of Vulnerable Hosts */}
          <Card className="print:shadow-none print:border-none print:break-before-page">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">6. SUMMARY OF VULNERABLE HOSTS</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Host IP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Critical
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        High
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Medium
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Low
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {hostSummary.map((host, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {host.ip_address}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {host.critical_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {host.high_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {host.medium_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {host.low_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {host.total_count}
                        </td>
                      </tr>
                    ))}
                    {/* Grand Total Row */}
                    <tr className="bg-gray-100 font-bold">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Grand Total
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hostSummary.reduce((sum, host) => sum + host.critical_count, 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hostSummary.reduce((sum, host) => sum + host.high_count, 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hostSummary.reduce((sum, host) => sum + host.medium_count, 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hostSummary.reduce((sum, host) => sum + host.low_count, 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hostSummary.reduce((sum, host) => sum + host.total_count, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Section 7: Risk-Level Summary */}
          <Card className="print:shadow-none print:border-none print:break-before-page">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">7. RISK-LEVEL SUMMARY</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-600 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Risk
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Count
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {[
                        ["Critical", riskSummary.critical],
                        ["High", riskSummary.high],
                        ["Medium", riskSummary.medium],
                        ["Low", riskSummary.low],
                        ["Info", riskSummary.info],
                        ["Total", riskSummary.total]
                      ].map(([risk, count], index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            risk === "Total" ? "text-gray-900 bg-gray-100" : "text-gray-900"
                          }`}>
                            {risk}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            risk === "Total" ? "text-gray-900 bg-gray-100 font-bold" : "text-gray-500"
                          }`}>
                            {count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Optional: Add chart visualization */}
                <div className="print:hidden">
                  <div className="space-y-3">
                    {[
                      { label: "Critical", count: riskSummary.critical, color: "bg-red-500" },
                      { label: "High", count: riskSummary.high, color: "bg-orange-500" },
                      { label: "Medium", count: riskSummary.medium, color: "bg-yellow-500" },
                      { label: "Low", count: riskSummary.low, color: "bg-blue-500" },
                      { label: "Info", count: riskSummary.info, color: "bg-gray-500" }
                    ].map((item) => (
                      <div key={item.label} className="flex items-center">
                        <div className={`w-4 h-4 ${item.color} mr-3`}></div>
                        <span className="text-sm">{item.label}: {item.count}</span>
                        <div className="ml-auto w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${item.color}`}
                            style={{ 
                              width: `${riskSummary.total > 0 ? (item.count / riskSummary.total) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 8: Zero-Day Vulnerabilities */}
          {zeroDayVulnerabilities.length > 0 && (
            <Card className="print:shadow-none print:border-none print:break-before-page">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">8. ZERO-DAY VULNERABILITIES</h2>
                
                {/* Part A: Risk-wise count */}
                <h3 className="text-lg font-bold mb-2">Risk-wise Count:</h3>
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-red-600 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Risk
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Count
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {[
                        ["Critical", zeroDayRiskSummary.critical],
                        ["High", zeroDayRiskSummary.high],
                        ["Medium", zeroDayRiskSummary.medium],
                        ["Low", zeroDayRiskSummary.low],
                        ["Info", zeroDayRiskSummary.info],
                        ["Total", zeroDayRiskSummary.total]
                      ].map(([risk, count], index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {risk}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Part B: Detailed Table */}
                <h3 className="text-lg font-bold mb-2">Detailed Zero-Day Vulnerabilities:</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-red-600 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          S.No
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          CVE ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Risk
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Host IP
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Recommended Fix
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {zeroDayVulnerabilities.slice(0, 15).map((vuln, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {vuln.serial_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {vuln.display_cve}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vuln.risk_priority}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vuln.ip_address}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {vuln.vuln_name || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {vuln.solution || "Patch available"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 9: All Vulnerabilities with Remediation */}
          <Card className="print:shadow-none print:border-none print:break-before-page">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">9. ALL VULNERABILITIES WITH REMEDIATION</h2>
              
              {nonZeroDayVulnerabilities.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-600 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          S.No
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Risk
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Host IP
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Vulnerability Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Fix Recommendation
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {nonZeroDayVulnerabilities.slice(0, 20).map((vuln, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {vuln.serial_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              SEVERITY_LEVELS[vuln.severity]?.color || "bg-gray-100"
                            } text-white`}>
                              {vuln.risk_priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vuln.ip_address}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-sm">
                            <div className="truncate" title={vuln.vuln_name || "N/A"}>
                              {vuln.vuln_name || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-sm">
                            <div className="truncate" title={vuln.solution || "Apply security updates"}>
                              {vuln.solution || "Apply security updates"}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {nonZeroDayVulnerabilities.length > 20 && (
                    <p className="mt-4 text-sm text-gray-600 text-center">
                      ... and {nonZeroDayVulnerabilities.length - 20} more vulnerabilities
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No additional vulnerabilities found.</p>
              )}
            </CardContent>
          </Card>

          {/* Section 10: Conclusion */}
          <Card className="print:shadow-none print:border-none print:break-before-page">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">10. CONCLUSION</h2>
              
              <p className="leading-6">
                {report.conclusion || 
                `This assessment identified ${report.total_vulnerabilities} vulnerabilities that require attention. ` +
                `It is strongly recommended to implement the suggested remediation measures prioritizing critical and high-risk findings. ` +
                `A follow-up assessment should be conducted after remediation to verify the effectiveness of implemented fixes. ` +
                `The security landscape continues to evolve, requiring ongoing vigilance and regular assessment activities.`}
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 print:hidden">
          <p>Generated on {new Date().toLocaleDateString()}</p>
        </div>

      </div>
    </div>
  );
}
