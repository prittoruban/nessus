"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ExecutiveReportService } from "@/lib/services/executive-report.service";
import { 
  ExecutiveReportData, 
  RISK_MODEL_DATA, 
  EXECUTIVE_SUMMARY_CONTENT, 
  METHODOLOGY_STEPS,
  CONCLUSION_CONTENT 
} from "@/types/vulnerability";

export default function ExecutiveReportPage() {
  const params = useParams();
  const reportId = params.id as string;
  
  const [reportData, setReportData] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const executiveReportService = useMemo(() => new ExecutiveReportService(), []);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const data = await executiveReportService.getExecutiveReportData(reportId);
        
        if (!data) {
          setError("Report not found or failed to load data");
          return;
        }
        
        setReportData(data);
      } catch (err) {
        console.error("Error fetching executive report data:", err);
        setError("Failed to load report data");
      } finally {
        setLoading(false);
      }
    };

    if (reportId) {
      fetchReportData();
    }
  }, [reportId, executiveReportService]);

  const handleDownloadPDF = async () => {
    if (!reportData) return;
    
    try {
      setGeneratingPDF(true);
      
      const response = await fetch(`/api/pdf/generate/${reportId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = executiveReportService.generatePDFFilename(reportData.report);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading executive report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">{error || "Report data not available"}</p>
            <Link href="/reports" className="mt-2 inline-block text-blue-600 hover:text-blue-800">
              ← Back to Reports
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { report, hosts, vulnerabilityStats, hostSummaries, zeroDayVulnerabilities, allVulnerabilitiesWithRemediation } = reportData;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto py-8 px-6 print:px-0 print:py-0">
        
        {/* Header with Download Button - Screen Only */}
        <div className="mb-8 print:hidden">
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <Link href="/reports" className="text-gray-500 hover:text-gray-700 text-sm">
                ← Back to Reports
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">
                Executive Report
              </h1>
              <p className="text-gray-600">{report.org_name}</p>
            </div>
            <button
              onClick={handleDownloadPDF}
              disabled={generatingPDF}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-3 rounded-md font-medium"
            >
              {generatingPDF ? "Generating PDF..." : "Download Executive Summary"}
            </button>
          </div>
        </div>

        {/* SECTION 1: COVER PAGE */}
        <div className="mb-12 text-center print:mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8">
            Internal Vulnerability Assessment Report
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto text-left">
            <div>
              <div className="mb-6">
                <label className="font-semibold text-gray-700">Organization Name</label>
                <p className="text-gray-900 border-b border-gray-300 pb-1">{report.org_name}</p>
              </div>
              <div className="mb-6">
                <label className="font-semibold text-gray-700">Date Range</label>
                <p className="text-gray-900 border-b border-gray-300 pb-1">
                  {executiveReportService.formatDateRange(report.scan_start_date, report.scan_end_date)}
                </p>
              </div>
              <div className="mb-6">
                <label className="font-semibold text-gray-700">Version</label>
                <p className="text-gray-900 border-b border-gray-300 pb-1">{report.version}</p>
              </div>
              <div className="mb-6">
                <label className="font-semibold text-gray-700">Document Type</label>
                <p className="text-gray-900 border-b border-gray-300 pb-1">{report.document_type}</p>
              </div>
            </div>
            
            <div>
              <div className="mb-6">
                <label className="font-semibold text-gray-700">Assessee</label>
                <div className="border-b border-gray-300 pb-1 h-6">
                  {report.assessee && <p className="text-gray-900">{report.assessee}</p>}
                </div>
              </div>
              <div className="mb-6">
                <label className="font-semibold text-gray-700">Assessor</label>
                <div className="border-b border-gray-300 pb-1 h-6">
                  {report.assessor && <p className="text-gray-900">{report.assessor}</p>}
                </div>
              </div>
              <div className="mb-6">
                <label className="font-semibold text-gray-700">Reviewer</label>
                <div className="border-b border-gray-300 pb-1 h-6">
                  {report.reviewer && <p className="text-gray-900">{report.reviewer}</p>}
                </div>
              </div>
              <div className="mb-6">
                <label className="font-semibold text-gray-700">Approved by</label>
                <div className="border-b border-gray-300 pb-1 h-6">
                  {report.approver && <p className="text-gray-900">{report.approver}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Confidentiality Disclaimer - Bottom of Cover */}
          <div className="mt-16 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-800 font-medium">
                CONFIDENTIALITY LEVEL: {report.confidentiality_level}
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <p className="text-sm text-gray-700">
                {report.legal_disclaimer}
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: SCAN MANIFEST */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Scan Manifest</h2>
          
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <table className="min-w-full">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-50">Description</td>
                  <td className="px-6 py-4 text-gray-900">{report.scan_description}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-50">Test Started On</td>
                  <td className="px-6 py-4 text-gray-900">
                    {report.scan_start_date ? executiveReportService.formatDate(report.scan_start_date) : 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-50">Test Completed On</td>
                  <td className="px-6 py-4 text-gray-900">
                    {report.scan_end_date ? executiveReportService.formatDate(report.scan_end_date) : 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-50">No. of IPs Tested</td>
                  <td className="px-6 py-4 text-gray-900">{hosts.length}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-50">Test Performed At</td>
                  <td className="px-6 py-4 text-gray-900">{report.test_location}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-50">Tool Used</td>
                  <td className="px-6 py-4 text-gray-900">{report.tool_used}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: EXECUTIVE SUMMARY */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Executive Summary</h2>
          
          <div className="mb-8">
            <p className="text-gray-700 leading-7 mb-4">
              {EXECUTIVE_SUMMARY_CONTENT.objective}
            </p>
          </div>

          {/* Risk Model Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Severity Model</h3>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CVSS Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {RISK_MODEL_DATA.map((risk, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {risk.priority}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {risk.severity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {risk.cvss_range}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {risk.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION 4: METHODOLOGY */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Methodology</h2>
          
          <div className="space-y-4">
            {METHODOLOGY_STEPS.map((step, index) => (
              <div key={index} className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {step.step}. {step.title}
                </h3>
                <p className="text-gray-700 leading-6 ml-4">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: PROJECT SCOPE */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Project Scope</h2>
          
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">S.No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {hosts.map((host, index) => (
                  <tr key={host.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {host.ip_address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        host.status === 'Completed' 
                          ? 'bg-green-100 text-green-800'
                          : host.status === 'Failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {host.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {EXECUTIVE_SUMMARY_CONTENT.disclaimer}
            </p>
          </div>
        </div>

        {/* SECTION 6: SUMMARY OF VULNERABLE HOSTS */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Summary of Vulnerable Hosts</h2>
          
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Critical</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">High</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medium</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Low</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {hostSummaries.map((host, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {host.ip_address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      {host.critical}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                      {host.high}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                      {host.medium}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {host.low}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {host.total}
                    </td>
                  </tr>
                ))}
                
                {/* Grand Total Row */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Grand Total
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    {vulnerabilityStats.critical}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                    {vulnerabilityStats.high}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                    {vulnerabilityStats.medium}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    {vulnerabilityStats.low}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {vulnerabilityStats.total}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 7: RISK-LEVEL SUMMARY */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Risk-Level Summary</h2>
          
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">Critical</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vulnerabilityStats.critical}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">High</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vulnerabilityStats.high}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-600">Medium</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vulnerabilityStats.medium}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">Low</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vulnerabilityStats.low}</td>
                </tr>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vulnerabilityStats.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 8: ZERO-DAY VULNERABILITIES */}
        {zeroDayVulnerabilities.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Zero-Day Vulnerabilities</h2>
            
            {/* Risk-wise count */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk-wise Zero-Day Count</h3>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {['critical', 'high', 'medium', 'low'].map(severity => {
                      const count = zeroDayVulnerabilities.filter(v => v.severity === severity).length;
                      if (count === 0) return null;
                      return (
                        <tr key={severity}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium capitalize text-gray-900">
                            {severity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{count}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Zero-Day Table */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Zero-Day Vulnerabilities</h3>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">S.No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CVE ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host IP</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recommended Fix</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {zeroDayVulnerabilities.slice(0, 20).map((vuln, index) => (
                      <tr key={vuln.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {vuln.cve || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                            vuln.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            vuln.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            vuln.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {vuln.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vuln.ip_address}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={vuln.vuln_name}>
                            {vuln.vuln_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={executiveReportService.generateRecommendedFix(vuln)}>
                            {executiveReportService.generateRecommendedFix(vuln)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 9: ALL VULNERABILITIES WITH REMEDIATION */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">All Vulnerabilities with Remediation</h2>
          
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">S.No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vulnerability Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fix Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allVulnerabilitiesWithRemediation
                  .filter(vuln => !vuln.is_zero_day) // Exclude zero-days if already shown
                  .slice(0, 50) // Limit to prevent very long tables
                  .map((vuln, index) => (
                  <tr key={vuln.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                        vuln.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        vuln.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        vuln.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        vuln.severity === 'low' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {vuln.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vuln.ip_address}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={vuln.vuln_name}>
                        {vuln.vuln_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                      <div className="truncate" title={vuln.recommended_fix}>
                        {vuln.recommended_fix}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {allVulnerabilitiesWithRemediation.length > 50 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Showing first 50 vulnerabilities. Full list available in detailed vulnerability report.
              </p>
            </div>
          )}
        </div>

        {/* SECTION 10: CONCLUSION */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Conclusion</h2>
          
          <div className="space-y-6">
            <p className="text-gray-700 leading-7">
              {CONCLUSION_CONTENT.summary}
            </p>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {CONCLUSION_CONTENT.recommendations.map((rec, index) => (
                  <li key={index} className="leading-6">{rec}</li>
                ))}
              </ul>
            </div>

            <p className="text-gray-700 leading-7">
              {CONCLUSION_CONTENT.future}
            </p>
          </div>
        </div>

        {/* Report End */}
        <div className="text-center py-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            End of Executive Summary Report
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Generated on {executiveReportService.formatDate(new Date().toISOString())}
          </p>
        </div>
      </div>
    </div>
  );
}
