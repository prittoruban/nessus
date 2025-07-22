'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Types
interface Report {
  id: string
  org_name: string
  source_type: string
  scan_start_date: string
  scan_end_date: string
  version: string
  document_type: string
  assessee: string | null
  assessor: string | null
  reviewer: string | null
  approver: string | null
  total_ips_tested: number
  total_vulnerabilities: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  info_count: number
  zero_day_count: number
  status: string
  created_at: string
}

interface Host {
  id: string
  ip_address: string
  hostname: string | null
  scan_status: string
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  info_count: number
  total_vulnerabilities: number
}

interface Vulnerability {
  id: string
  cve_id: string | null
  vulnerability_name: string
  severity: string
  cvss_score: number | null
  description: string | null
  solution: string | null
  fix_recommendation: string | null
  host_ip: string
  port: number | null
  protocol: string | null
  service: string | null
  is_zero_day: boolean
}

const RISK_MODEL = [
  { priority: 'P1', severity: 'Critical', cvss: '9.0–10.0', description: 'Full system compromise, data exfiltration' },
  { priority: 'P2', severity: 'High', cvss: '7.0–8.9', description: 'Major flaws risking unauthorized access' },
  { priority: 'P3', severity: 'Medium', cvss: '4.0–6.9', description: 'Flaws that need chaining to become exploitable' },
  { priority: 'P4', severity: 'Low', cvss: '0.1–3.9', description: 'Minor misconfigurations or indirect threats' },
  { priority: 'P5', severity: 'Informational', cvss: '0.0', description: 'Insightful but not risky on their own' }
]

const METHODOLOGY_STEPS = [
  'Asset Selection',
  'Reachability checks',
  'Informed initiation',
  'Tool execution',
  'Consolidation & Validation',
  'Severity Reclassification (if any)',
  'Reporting',
  'Secure Sharing'
]

export default function ReportPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string

  const [report, setReport] = useState<Report | null>(null)
  const [hosts, setHosts] = useState<Host[]>([])
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([])
  const [zeroDayVulns, setZeroDayVulns] = useState<Vulnerability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch report details
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single()

      if (reportError) throw reportError
      setReport(reportData)

      // Fetch hosts
      const { data: hostsData, error: hostsError } = await supabase
        .from('report_hosts')
        .select('*')
        .eq('report_id', reportId)
        .order('ip_address')

      if (hostsError) throw hostsError
      setHosts(hostsData || [])

      // Fetch all vulnerabilities
      const { data: vulnsData, error: vulnsError } = await supabase
        .from('vulnerabilities')
        .select('*')
        .eq('report_id', reportId)
        .order('severity', { ascending: false })
        .order('host_ip')

      if (vulnsError) throw vulnsError
      setVulnerabilities(vulnsData || [])

      // Filter zero-day vulnerabilities
      const zeroDays = vulnsData?.filter(v => v.is_zero_day) || []
      setZeroDayVulns(zeroDays)

    } catch (err) {
      console.error('Error fetching report data:', err)
      setError('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    if (reportId) {
      fetchReportData()
    }
  }, [reportId, fetchReportData])

  const downloadPDF = async () => {
    try {
      setGeneratingPdf(true)
      
      const response = await fetch(`/api/pdf/generate/${reportId}`)
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const date = new Date()
      const month = date.toLocaleString('default', { month: 'long' })
      const year = date.getFullYear()
      
      link.download = `${report?.org_name?.replace(/[^a-zA-Z0-9]/g, '_')}_VA_Report_${month}_${year}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF generation error:', err)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-700 bg-red-100'
      case 'high': return 'text-orange-700 bg-orange-100'
      case 'medium': return 'text-yellow-700 bg-yellow-100'
      case 'low': return 'text-blue-700 bg-blue-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">{error || 'Report not found'}</p>
          <button
            onClick={() => router.push('/upload')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Upload
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Controls */}
      <div className="bg-gray-50 border-b p-4 print:hidden">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button
            onClick={() => router.push('/upload')}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ← Back to Upload
          </button>
          <button
            onClick={downloadPDF}
            disabled={generatingPdf}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {generatingPdf ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating PDF...
              </>
            ) : (
              <>
                📄 Download Executive Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-6xl mx-auto p-8 space-y-12">
        
        {/* SECTION 1: COVER PAGE */}
        <section className="text-center space-y-8 pb-12 border-b-2 border-gray-200">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            {report.source_type === 'internal' ? 'Internal' : 'External'} Vulnerability Assessment Report
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="space-y-4">
              <div>
                <span className="block text-lg font-semibold text-gray-700">Organization Name</span>
                <span className="text-xl">{report.org_name}</span>
              </div>
              <div>
                <span className="block text-lg font-semibold text-gray-700">Version</span>
                <span className="text-xl">{report.version}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <span className="block text-lg font-semibold text-gray-700">Date Range</span>
                <span className="text-xl">
                  {new Date(report.scan_start_date).toLocaleDateString()} - {new Date(report.scan_end_date).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="block text-lg font-semibold text-gray-700">Document Type</span>
                <span className="text-xl">{report.document_type}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto pt-8">
            {[
              { label: 'Assessee', value: report.assessee },
              { label: 'Assessor', value: report.assessor },
              { label: 'Reviewer', value: report.reviewer },
              { label: 'Approved by', value: report.approver }
            ].map((item, index) => (
              <div key={index} className="flex flex-col">
                <span className="font-semibold text-gray-700 mb-2">{item.label}</span>
                <div className="border-b-2 border-gray-300 pb-1 min-h-[2rem]">
                  <span className="text-lg">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: SCAN MANIFEST */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Scan Manifest</h2>
          <div className="bg-gray-50 rounded-lg p-6">
            <table className="w-full">
              <tbody className="space-y-3">
                {[
                  ['Description', 'Network Vulnerability Assessment'],
                  ['Test Started On', new Date(report.scan_start_date).toLocaleDateString()],
                  ['Test Completed On', new Date(report.scan_end_date).toLocaleDateString()],
                  ['No. of IPs Tested', report.total_ips_tested.toString()],
                  ['Test Performed At', 'On-site'],
                  ['Tool Used', 'Nessus']
                ].map(([label, value], index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 font-semibold text-gray-700 w-1/3">{label}</td>
                    <td className="py-3 text-gray-900">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 3: EXECUTIVE SUMMARY */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Executive Summary</h2>
          <div className="space-y-6">
            <p className="text-lg leading-relaxed text-gray-800">
              This {report.source_type} assessment was conducted to understand the vulnerabilities affecting the environment
              of <strong>{report.org_name}</strong>. The assessment utilized automated scanning tools and manual verification 
              techniques to identify security weaknesses that could potentially be exploited by malicious actors. The findings 
              presented in this report are categorized according to industry-standard risk severity levels to facilitate 
              prioritized remediation efforts.
            </p>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Risk Model</h3>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Priority</th>
                      <th className="px-4 py-3 text-left font-semibold">Severity</th>
                      <th className="px-4 py-3 text-left font-semibold">CVSS Score</th>
                      <th className="px-4 py-3 text-left font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RISK_MODEL.map((risk, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="px-4 py-3 font-medium">{risk.priority}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${getSeverityColor(risk.severity)}`}>
                            {risk.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3">{risk.cvss}</td>
                        <td className="px-4 py-3">{risk.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: METHODOLOGY */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Methodology</h2>
          <div className="space-y-4">
            {METHODOLOGY_STEPS.map((step, index) => (
              <p key={index} className="text-lg leading-relaxed text-gray-800">
                <strong>{index + 1}. {step}:</strong> {getMethodologyDescription(step)}
              </p>
            ))}
          </div>
        </section>

        {/* SECTION 5: PROJECT SCOPE */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Project Scope</h2>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">S.No</th>
                  <th className="px-4 py-3 text-left font-semibold">IP Address</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {hosts.map((host, index) => (
                  <tr key={host.id} className="border-t border-gray-200">
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-mono">{host.ip_address}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        host.scan_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {host.scan_status.charAt(0).toUpperCase() + host.scan_status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600 italic">
            This assessment did not include brute-force, DoS, phishing, or physical methods.
          </p>
        </section>

        {/* SECTION 6: SUMMARY OF VULNERABLE HOSTS */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Summary of Vulnerable Hosts</h2>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Host IP</th>
                  <th className="px-4 py-3 text-center font-semibold">Critical</th>
                  <th className="px-4 py-3 text-center font-semibold">High</th>
                  <th className="px-4 py-3 text-center font-semibold">Medium</th>
                  <th className="px-4 py-3 text-center font-semibold">Low</th>
                  <th className="px-4 py-3 text-center font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {hosts.map((host) => (
                  <tr key={host.id} className="border-t border-gray-200">
                    <td className="px-4 py-3 font-mono">{host.ip_address}</td>
                    <td className="px-4 py-3 text-center">{host.critical_count}</td>
                    <td className="px-4 py-3 text-center">{host.high_count}</td>
                    <td className="px-4 py-3 text-center">{host.medium_count}</td>
                    <td className="px-4 py-3 text-center">{host.low_count}</td>
                    <td className="px-4 py-3 text-center font-semibold">{host.total_vulnerabilities}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-400 bg-gray-50">
                  <td className="px-4 py-3 font-bold">Grand Total</td>
                  <td className="px-4 py-3 text-center font-bold">{report.critical_count}</td>
                  <td className="px-4 py-3 text-center font-bold">{report.high_count}</td>
                  <td className="px-4 py-3 text-center font-bold">{report.medium_count}</td>
                  <td className="px-4 py-3 text-center font-bold">{report.low_count}</td>
                  <td className="px-4 py-3 text-center font-bold">{report.total_vulnerabilities}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 7: RISK-LEVEL SUMMARY */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Risk-Level Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300 rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Risk</th>
                    <th className="px-4 py-3 text-center font-semibold">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { risk: 'Critical', count: report.critical_count, color: 'text-red-700' },
                    { risk: 'High', count: report.high_count, color: 'text-orange-700' },
                    { risk: 'Medium', count: report.medium_count, color: 'text-yellow-700' },
                    { risk: 'Low', count: report.low_count, color: 'text-blue-700' },
                    { risk: 'Informational', count: report.info_count, color: 'text-gray-700' }
                  ].map((item, index) => (
                    <tr key={index} className="border-t border-gray-200">
                      <td className={`px-4 py-3 font-semibold ${item.color}`}>{item.risk}</td>
                      <td className="px-4 py-3 text-center font-semibold">{item.count}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-400 bg-gray-50">
                    <td className="px-4 py-3 font-bold">Total</td>
                    <td className="px-4 py-3 text-center font-bold">{report.total_vulnerabilities}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Placeholder for chart - will be added later */}
            <div className="bg-gray-100 rounded-lg p-6 flex items-center justify-center text-gray-500">
              <p>Risk Distribution Chart</p>
            </div>
          </div>
        </section>

        {/* SECTION 8: ZERO-DAY VULNERABILITIES */}
        {report.zero_day_count > 0 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Zero-Day Vulnerabilities</h2>
            
            {/* Part A: Risk-wise count */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Zero-Day Risk Distribution</h3>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 rounded-lg mb-6">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Risk Level</th>
                      <th className="px-4 py-3 text-center font-semibold">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['critical', 'high', 'medium', 'low'].map((severity) => {
                      const count = zeroDayVulns.filter(v => v.severity === severity).length
                      return count > 0 ? (
                        <tr key={severity} className="border-t border-gray-200">
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-sm font-medium ${getSeverityColor(severity)}`}>
                              {severity.charAt(0).toUpperCase() + severity.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">{count}</td>
                        </tr>
                      ) : null
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Part B: Detailed Table */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Detailed Zero-Day Vulnerabilities</h3>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 rounded-lg">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">S.No</th>
                      <th className="px-4 py-3 text-left font-semibold">CVE ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Risk</th>
                      <th className="px-4 py-3 text-left font-semibold">Host IP</th>
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Recommended Fix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zeroDayVulns.map((vuln, index) => (
                      <tr key={vuln.id} className="border-t border-gray-200">
                        <td className="px-4 py-3">{index + 1}</td>
                        <td className="px-4 py-3 font-mono">{vuln.cve_id || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${getSeverityColor(vuln.severity)}`}>
                            {vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">{vuln.host_ip}</td>
                        <td className="px-4 py-3">{vuln.vulnerability_name}</td>
                        <td className="px-4 py-3">{vuln.fix_recommendation || vuln.solution || 'Update to latest version'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 9: ALL VULNERABILITIES WITH REMEDIATION */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">All Vulnerabilities with Remediation</h2>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">S.No</th>
                  <th className="px-4 py-3 text-left font-semibold">Risk</th>
                  <th className="px-4 py-3 text-left font-semibold">Host IP</th>
                  <th className="px-4 py-3 text-left font-semibold">Vulnerability Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Fix Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {vulnerabilities
                  .filter(v => !v.is_zero_day) // Exclude zero-days if already shown
                  .map((vuln, index) => (
                  <tr key={vuln.id} className="border-t border-gray-200">
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${getSeverityColor(vuln.severity)}`}>
                        {vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{vuln.host_ip}</td>
                    <td className="px-4 py-3">{vuln.vulnerability_name}</td>
                    <td className="px-4 py-3">{vuln.fix_recommendation || vuln.solution || 'See detailed description'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 10: CONCLUSION */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Conclusion</h2>
          <div className="space-y-4 text-lg leading-relaxed text-gray-800">
            <p>
              The vulnerability assessment of <strong>{report.org_name}</strong> has identified <strong>{report.total_vulnerabilities}</strong> vulnerabilities 
              across <strong>{report.total_ips_tested}</strong> tested systems. The findings reveal a mix of security issues ranging from 
              critical vulnerabilities requiring immediate attention to informational findings that provide security insights.
            </p>
            
            <p>
              We strongly recommend prioritizing the remediation of <strong>{report.critical_count} critical</strong> and <strong>{report.high_count} high-severity</strong> vulnerabilities 
              as they pose the most significant risk to the organization's security posture. The <strong>{report.medium_count} medium-severity</strong> vulnerabilities 
              should be addressed in the next maintenance cycle, while low-severity issues can be scheduled for routine maintenance.
            </p>
            
            {report.zero_day_count > 0 && (
              <p className="bg-red-50 p-4 rounded-lg border border-red-200">
                <strong>Critical Notice:</strong> This assessment identified <strong>{report.zero_day_count} zero-day vulnerabilities</strong> that require 
                immediate attention due to their recent disclosure and potential for exploitation.
              </p>
            )}
            
            <p>
              Following the remediation efforts, we recommend conducting a follow-up assessment to verify that vulnerabilities have been 
              properly addressed and that no new security issues have been introduced during the remediation process.
            </p>
            
            <p>
              The cybersecurity landscape continues to evolve rapidly, with new threats and vulnerabilities emerging regularly. We recommend 
              implementing a continuous vulnerability management program that includes regular scanning, timely patching procedures, and 
              security awareness training for all personnel.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

// Helper function for methodology descriptions
function getMethodologyDescription(step: string): string {
  const descriptions: Record<string, string> = {
    'Asset Selection': 'Identified and catalogued all systems within the defined scope for vulnerability assessment.',
    'Reachability checks': 'Verified network connectivity and accessibility of target systems prior to scanning.',
    'Informed initiation': 'Coordinated with system administrators and stakeholders before commencing security testing.',
    'Tool execution': 'Conducted comprehensive vulnerability scans using Nessus and other security assessment tools.',
    'Consolidation & Validation': 'Aggregated scan results and manually verified findings to reduce false positives.',
    'Severity Reclassification (if any)': 'Reviewed and adjusted vulnerability severity ratings based on environmental context.',
    'Reporting': 'Compiled findings into this comprehensive report with detailed remediation guidance.',
    'Secure Sharing': 'Delivered the final report through secure channels to authorized personnel only.'
  }
  return descriptions[step] || 'Standard security assessment procedure.'
}
