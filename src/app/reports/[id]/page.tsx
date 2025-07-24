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
  test_performed_at: string
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center bg-white rounded-2xl p-8 shadow-xl border border-slate-200">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading Report</h3>
          <p className="text-slate-600">Fetching vulnerability assessment data...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center bg-white rounded-2xl p-8 shadow-xl border border-red-200">
          <div className="text-4xl text-red-500 mb-4">⚠</div>
          <h2 className="text-xl font-bold text-red-600 mb-4">Report Not Found</h2>
          <p className="text-slate-600 mb-6">{error || 'The requested report could not be found.'}</p>
          <button
            onClick={() => router.push('/reports')}
            className="px-6 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors duration-300"
          >
            Back to Reports
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Controls */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 p-6 print:hidden shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/reports')}
              className="inline-flex items-center px-5 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span className="mr-2">←</span>
              Back to Reports
            </button>
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-slate-900">{report.org_name}</h1>
              <p className="text-sm text-slate-600">{report.source_type === 'internal' ? 'Internal' : 'External'} Assessment Report</p>
            </div>
          </div>
          <button
            onClick={downloadPDF}
            disabled={generatingPdf}
            className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {generatingPdf ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                Generating PDF...
              </>
            ) : (
              <>
                <span className="mr-3">↓</span>
                Download Executive Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-7xl mx-auto p-8 space-y-16 bg-gradient-to-br from-slate-50 via-white to-blue-50">
        
        {/* SECTION 1: COVER PAGE */}
        <section className="bg-gradient-to-br from-white via-slate-50 to-blue-50 rounded-3xl shadow-2xl border border-slate-200 p-16 text-center space-y-12 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
          
          {/* Header Icon */}
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl mb-8 shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <span className="text-white text-3xl font-bold">VA</span>
            </div>
          </div>
          
          {/* Title */}
          <div className="relative z-10">
            <h1 className="text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              {report.source_type === 'internal' ? 'Internal' : 'External'}
            </h1>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-12">
              Vulnerability Assessment Report
            </h2>
          </div>
          
          {/* Organization Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto relative z-10">
            <div className="space-y-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-shadow duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mr-3"></div>
                  <span className="text-base font-bold text-slate-700 uppercase tracking-wider">Organization Name</span>
                </div>
                <span className="text-2xl font-bold text-slate-900 block mt-3">{report.org_name}</span>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-shadow duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-3 h-3 bg-green-600 rounded-full mr-3"></div>
                  <span className="text-base font-bold text-slate-700 uppercase tracking-wider">Report Version</span>
                </div>
                <span className="text-2xl font-bold text-slate-900 block mt-3">{report.version}</span>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-shadow duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-3 h-3 bg-purple-600 rounded-full mr-3"></div>
                  <span className="text-base font-bold text-slate-700 uppercase tracking-wider">Assessment Period</span>
                </div>
                <span className="text-lg font-bold text-slate-900 block mt-3">
                  {new Date(report.scan_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} - {new Date(report.scan_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-shadow duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-3 h-3 bg-orange-600 rounded-full mr-3"></div>
                  <span className="text-base font-bold text-slate-700 uppercase tracking-wider">Document Type</span>
                </div>
                <span className="text-2xl font-bold text-slate-900 block mt-3">{report.document_type}</span>
              </div>
            </div>
          </div>

          {/* Signature Table */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-w-7xl mx-auto relative z-10">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <h3 className="text-2xl font-bold text-white text-center uppercase tracking-wider">Document Control</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 bg-slate-100">
              {[
                { label: 'Assessee', value: report.assessee, icon: '👤', color: 'from-blue-500 to-blue-600' },
                { label: 'Assessor', value: report.assessor, icon: '🔍', color: 'from-green-500 to-green-600' },
                { label: 'Reviewer', value: report.reviewer, icon: '📋', color: 'from-purple-500 to-purple-600' },
                { label: 'Approved by', value: report.approver, icon: '✅', color: 'from-orange-500 to-orange-600' }
              ].map((item, index) => (
                <div key={index} className="bg-white p-8 hover:bg-slate-50 transition-colors duration-200">
                  <div className={`text-2xl mb-4 w-12 h-12 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center text-white shadow-lg mx-auto`}>
                    {item.icon}
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-slate-700 mb-4 uppercase text-sm tracking-wide">{item.label}</span>
                    <div className="border-b-2 border-slate-300 pb-4 min-h-[3rem] flex items-center justify-center">
                      <span className="text-lg font-semibold text-slate-900">{item.value || 'N/A'}</span>
                    </div>
                    <div className="mt-4 text-xs text-slate-500 uppercase tracking-wide">Signature</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HTC Global Services Branding */}
          <div className="relative z-10">
            <div className="inline-flex items-center space-x-3 bg-white/90 backdrop-blur-sm rounded-2xl px-8 py-4 shadow-xl border border-slate-200">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-xl font-bold text-slate-900">Conducted by HTC Global Services</span>
            </div>
          </div>
        </section>

        {/* SECTION 2: SCAN MANIFEST */}
        <section className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
          <h2 className="text-3xl font-bold text-slate-900 border-b-4 border-blue-600 pb-4 mb-8 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-4">
              <span className="text-white text-xl">📋</span>
            </div>
            Scan Manifest
          </h2>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 border border-slate-200 shadow-lg">
            <table className="w-full">
              <tbody className="space-y-4">
                {[
                  ['Description', 'Network Vulnerability Assessment'],
                  ['Test Started On', new Date(report.scan_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
                  ['Test Completed On', new Date(report.scan_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
                  ['No. of IPs Tested', report.total_ips_tested.toString()],
                  ['Test Performed At', report.test_performed_at],
                  ['Tool Used', 'Nessus Professional']
                ].map(([label, value], index) => (
                  <tr key={index} className="border-b border-slate-200 hover:bg-slate-50 transition-colors duration-200">
                    <td className="py-6 pr-8 font-bold text-slate-700 w-1/3 text-lg">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                        {label}
                      </div>
                    </td>
                    <td className="py-6 text-slate-900 font-semibold text-lg">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 3: EXECUTIVE SUMMARY */}
        <section className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
          <h2 className="text-3xl font-bold text-slate-900 border-b-4 border-blue-600 pb-4 mb-8 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-4">
              <span className="text-white text-xl">📊</span>
            </div>
            Executive Summary
          </h2>
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl p-8 border-l-4 border-blue-600 shadow-lg">
              <p className="text-lg leading-relaxed text-slate-800 font-medium">
                This <span className="font-bold text-blue-600">{report.source_type}</span> assessment was conducted to understand the vulnerabilities affecting the environment
                of <strong className="text-slate-900">{report.org_name}</strong>. The assessment utilized automated scanning tools and manual verification 
                techniques to identify security weaknesses that could potentially be exploited by malicious actors. The findings 
                presented in this report are categorized according to industry-standard risk severity levels to facilitate 
                prioritized remediation efforts.
              </p>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                <div className="w-6 h-6 bg-gradient-to-r from-green-600 to-green-700 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-sm">🛡️</span>
                </div>
                Risk Model
              </h3>
              <div className="overflow-hidden rounded-xl shadow-lg border border-slate-200">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Severity</th>
                      <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">CVSS Score</th>
                      <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {RISK_MODEL.map((risk, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors duration-200">
                        <td className="px-6 py-4 font-bold text-slate-900 text-center">
                          <span className="bg-gradient-to-r from-blue-100 to-blue-200 px-3 py-1 rounded-full text-blue-800 font-bold">
                            {risk.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getSeverityColor(risk.severity)}`}>
                            {risk.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">{risk.cvss}</td>
                        <td className="px-6 py-4 text-slate-700 leading-relaxed">{risk.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: METHODOLOGY */}
        <section className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
          <h2 className="text-3xl font-bold text-slate-900 border-b-4 border-blue-600 pb-4 mb-8 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-4">
              <span className="text-white text-xl">⚙️</span>
            </div>
            Methodology
          </h2>
          <div className="space-y-6">
            {METHODOLOGY_STEPS.map((step, index) => (
              <div key={index} className="bg-gradient-to-r from-white to-slate-50 rounded-xl p-8 border-l-4 border-blue-600 shadow-lg hover:shadow-xl transition-shadow duration-300 relative">
                <div className="absolute left-0 top-0 w-1 h-8 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-r-full"></div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-blue-600 mb-4 uppercase tracking-wide">{step}</h4>
                    <p className="text-lg leading-relaxed text-slate-700 font-medium">
                      <strong>{index + 1}. {step}:</strong> {getMethodologyDescription(step)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 5: PROJECT SCOPE */}
        <section className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
          <h2 className="text-3xl font-bold text-slate-900 border-b-4 border-blue-600 pb-4 mb-8 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-4">
              <span className="text-white text-xl">🎯</span>
            </div>
            Project Scope
          </h2>
          <div className="overflow-hidden rounded-xl shadow-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">S.No</th>
                  <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-4 text-center font-bold text-sm uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {hosts.map((host, index) => (
                  <tr key={host.id} className="hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-6 py-4 font-bold text-slate-900 text-center">
                      <span className="bg-gradient-to-r from-blue-100 to-blue-200 px-3 py-1 rounded-full text-blue-800 font-bold">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-lg font-bold text-slate-900">{host.ip_address}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider shadow-md ${
                        host.scan_status === 'completed' 
                          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                          : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                      }`}>
                        {host.scan_status.charAt(0).toUpperCase() + host.scan_status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-400 p-6 rounded-lg shadow-md">
            <p className="text-base text-yellow-800 font-medium italic flex items-center">
              <span className="text-yellow-600 mr-2">⚠️</span>
              This assessment did not include brute-force, DoS, phishing, or physical methods.
            </p>
          </div>
        </section>

        {/* SECTION 6: SUMMARY OF VULNERABLE HOSTS */}
        <section className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
          <h2 className="text-3xl font-bold text-slate-900 border-b-4 border-blue-600 pb-4 mb-8 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-4">
              <span className="text-white text-xl">🖥️</span>
            </div>
            Summary of Vulnerable Hosts
          </h2>
          <div className="overflow-hidden rounded-xl shadow-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Host IP</th>
                  <th className="px-6 py-4 text-center font-bold text-sm uppercase tracking-wider">Critical</th>
                  <th className="px-6 py-4 text-center font-bold text-sm uppercase tracking-wider">High</th>
                  <th className="px-6 py-4 text-center font-bold text-sm uppercase tracking-wider">Medium</th>
                  <th className="px-6 py-4 text-center font-bold text-sm uppercase tracking-wider">Low</th>
                  <th className="px-6 py-4 text-center font-bold text-sm uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {hosts.map((host) => (
                  <tr key={host.id} className="hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-6 py-4 font-mono text-lg font-bold text-slate-900">{host.ip_address}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full font-bold text-sm shadow-md">
                        {host.critical_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full font-bold text-sm shadow-md">
                        {host.high_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-full font-bold text-sm shadow-md">
                        {host.medium_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-bold text-sm shadow-md">
                        {host.low_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-12 h-10 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-full font-bold text-lg shadow-md">
                        {host.total_vulnerabilities}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <td className="px-6 py-4 font-bold text-xl">Grand Total</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-12 h-10 bg-gradient-to-r from-red-400 to-red-500 text-white rounded-full font-bold text-lg shadow-md">
                      {report.critical_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-12 h-10 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-full font-bold text-lg shadow-md">
                      {report.high_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-12 h-10 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-full font-bold text-lg shadow-md">
                      {report.medium_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-12 h-10 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-full font-bold text-lg shadow-md">
                      {report.low_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-14 h-12 bg-gradient-to-r from-slate-400 to-slate-500 text-white rounded-full font-bold text-xl shadow-lg">
                      {report.total_vulnerabilities}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 7: RISK-LEVEL SUMMARY */}
        <section className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
          <h2 className="text-3xl font-bold text-slate-900 border-b-4 border-blue-600 pb-4 mb-8">
            Risk-Level Summary
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="overflow-hidden rounded-xl shadow-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Risk</th>
                    <th className="px-6 py-4 text-center font-bold text-sm uppercase tracking-wider">Count</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {[
                    { risk: 'Critical', count: report.critical_count, severity: 'critical' },
                    { risk: 'High', count: report.high_count, severity: 'high' },
                    { risk: 'Medium', count: report.medium_count, severity: 'medium' },
                    { risk: 'Low', count: report.low_count, severity: 'low' },
                    { risk: 'Informational', count: report.info_count, severity: 'info' }
                  ].map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getSeverityColor(item.severity)}`}>
                          {item.risk}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-lg text-slate-900">{item.count}</td>
                    </tr>
                  ))}
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <td className="px-6 py-4 font-bold text-lg">Total</td>
                    <td className="px-6 py-4 text-center font-bold text-xl">{report.total_vulnerabilities}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Professional Bar Chart */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 border border-slate-200 shadow-lg">
              <h3 className="text-xl font-bold text-slate-900 mb-6 text-center">Vulnerability Distribution</h3>
              <div className="space-y-6">
                {[
                  { label: 'Critical', count: report.critical_count, color: 'bg-gradient-to-r from-red-600 to-red-700', textColor: 'text-red-700' },
                  { label: 'High', count: report.high_count, color: 'bg-gradient-to-r from-orange-500 to-orange-600', textColor: 'text-orange-700' },
                  { label: 'Medium', count: report.medium_count, color: 'bg-gradient-to-r from-yellow-500 to-yellow-600', textColor: 'text-yellow-700' },
                  { label: 'Low', count: report.low_count, color: 'bg-gradient-to-r from-blue-500 to-blue-600', textColor: 'text-blue-700' },
                  { label: 'Info', count: report.info_count, color: 'bg-gradient-to-r from-gray-500 to-gray-600', textColor: 'text-gray-700' }
                ].map((item, index) => {
                  const maxCount = Math.max(report.critical_count, report.high_count, report.medium_count, report.low_count, report.info_count);
                  const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex items-center space-x-4">
                      <div className={`w-16 text-right font-bold text-sm ${item.textColor}`}>
                        {item.label}
                      </div>
                      <div className="flex-1 bg-slate-200 rounded-full h-8 shadow-inner relative overflow-hidden">
                        <div 
                          className={`h-full ${item.color} rounded-full transition-all duration-1000 ease-out shadow-md flex items-center justify-end pr-3`}
                          style={{ width: `${Math.max(percentage, item.count > 0 ? 15 : 0)}%` }}
                        >
                          {item.count > 0 && (
                            <span className="text-white font-bold text-sm text-shadow-sm">
                              {item.count}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-12 text-left">
                        <span className={`font-bold text-lg ${item.textColor}`}>
                          {item.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-slate-900">Total Vulnerabilities:</span>
                  <span className="text-2xl font-bold text-blue-600">{report.total_vulnerabilities}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8: ZERO-DAY VULNERABILITIES */}
        {report.zero_day_count > 0 && (
          <section className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-2xl border-2 border-red-400 p-8 space-y-8 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/20 to-orange-400/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-red-400/10 to-orange-400/10 rounded-full blur-2xl"></div>
            
            {/* Warning badge */}
            <div className="absolute -top-4 left-8 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2 rounded-full shadow-lg">
              <span className="text-lg font-bold">⚠️ CRITICAL ALERT</span>
            </div>
            
            <h2 className="text-3xl font-bold text-red-800 border-b-4 border-red-600 pb-4 mb-8 flex items-center pt-6">
              <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-red-700 rounded-lg flex items-center justify-center mr-4">
                <span className="text-white text-xl">🚨</span>
              </div>
              Zero-Day Vulnerabilities
            </h2>
            
            {/* Part A: Risk-wise count */}
            <div>
              <h3 className="text-2xl font-bold text-red-700 mb-6 flex items-center">
                <div className="w-6 h-6 bg-gradient-to-r from-red-600 to-red-700 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-sm">📊</span>
                </div>
                Zero-Day Risk Distribution
              </h3>
              <div className="overflow-hidden rounded-xl shadow-lg border border-red-300">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Risk Level</th>
                      <th className="px-6 py-4 text-center font-bold text-sm uppercase tracking-wider">Count</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-red-200">
                    {['critical', 'high', 'medium', 'low'].map((severity) => {
                      const count = zeroDayVulns.filter(v => v.severity === severity).length
                      return count > 0 ? (
                        <tr key={severity} className="hover:bg-red-50 transition-colors duration-200">
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getSeverityColor(severity)}`}>
                              {severity.charAt(0).toUpperCase() + severity.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full font-bold text-lg shadow-md">
                              {count}
                            </span>
                          </td>
                        </tr>
                      ) : null
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Part B: Detailed Table */}
            <div>
              <h3 className="text-2xl font-bold text-red-700 mb-6 flex items-center">
                <div className="w-6 h-6 bg-gradient-to-r from-red-600 to-red-700 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-sm">📋</span>
                </div>
                Detailed Zero-Day Vulnerabilities
              </h3>
              <div className="overflow-hidden rounded-xl shadow-lg border border-red-300">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-red-600 to-red-700 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">S.No</th>
                      <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">CVE ID</th>
                      <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Risk</th>
                      <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Host IP</th>
                      <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Recommended Fix</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-red-200">
                    {zeroDayVulns.map((vuln, index) => (
                      <tr key={vuln.id} className="hover:bg-red-50 transition-colors duration-200">
                        <td className="px-6 py-4 text-center">
                          <span className="bg-gradient-to-r from-red-100 to-red-200 px-3 py-1 rounded-full text-red-800 font-bold">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">{vuln.cve_id || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getSeverityColor(vuln.severity)}`}>
                            {vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">{vuln.host_ip}</td>
                        <td className="px-6 py-4 text-slate-700 font-medium">{vuln.vulnerability_name}</td>
                        <td className="px-6 py-4 text-slate-700">{vuln.fix_recommendation || vuln.solution || 'Update to latest version'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 9: ALL VULNERABILITIES WITH REMEDIATION */}
        <section className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
          <h2 className="text-3xl font-bold text-slate-900 border-b-4 border-blue-600 pb-4 mb-8 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-4">
              <span className="text-white text-xl">🔧</span>
            </div>
            All Vulnerabilities with Remediation
          </h2>
          <div className="overflow-hidden rounded-xl shadow-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">S.No</th>
                  <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Risk</th>
                  <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Host IP</th>
                  <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Vulnerability Name</th>
                  <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Fix Recommendation</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {vulnerabilities
                  .filter(v => !v.is_zero_day) // Exclude zero-days if already shown
                  .map((vuln, index) => (
                  <tr key={vuln.id} className="hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-6 py-4 text-center">
                      <span className="bg-gradient-to-r from-blue-100 to-blue-200 px-3 py-1 rounded-full text-blue-800 font-bold">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getSeverityColor(vuln.severity)}`}>
                        {vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{vuln.host_ip}</td>
                    <td className="px-6 py-4 text-slate-700 font-medium max-w-xs">
                      <div className="truncate" title={vuln.vulnerability_name}>
                        {vuln.vulnerability_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 max-w-md">
                      <div className="text-sm leading-relaxed">
                        {vuln.fix_recommendation || vuln.solution || 'See detailed description'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 10: CONCLUSION */}
        <section className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
          <h2 className="text-3xl font-bold text-slate-900 border-b-4 border-blue-600 pb-4 mb-8 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-4">
              <span className="text-white text-xl">📝</span>
            </div>
            Conclusion
          </h2>
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-8 border-l-4 border-blue-600 shadow-lg space-y-6">
            <p className="text-lg leading-relaxed text-slate-800 font-medium">
              The vulnerability assessment of <strong className="text-blue-600">{report.org_name}</strong> has identified <strong className="bg-gradient-to-r from-blue-100 to-blue-200 px-2 py-1 rounded text-blue-800">{report.total_vulnerabilities}</strong> vulnerabilities 
              across <strong className="bg-gradient-to-r from-green-100 to-green-200 px-2 py-1 rounded text-green-800">{report.total_ips_tested}</strong> tested systems. The findings reveal a mix of security issues ranging from 
              critical vulnerabilities requiring immediate attention to informational findings that provide security insights.
            </p>
            
            <p className="text-lg leading-relaxed text-slate-800 font-medium">
              We strongly recommend prioritizing the remediation of <strong className="bg-gradient-to-r from-red-100 to-red-200 px-2 py-1 rounded text-red-800">{report.critical_count} critical</strong> and <strong className="bg-gradient-to-r from-orange-100 to-orange-200 px-2 py-1 rounded text-orange-800">{report.high_count} high-severity</strong> vulnerabilities 
              as they pose the most significant risk to the organization&apos;s security posture. The <strong className="bg-gradient-to-r from-yellow-100 to-yellow-200 px-2 py-1 rounded text-yellow-800">{report.medium_count} medium-severity</strong> vulnerabilities 
              should be addressed in the next maintenance cycle, while low-severity issues can be scheduled for routine maintenance.
            </p>
            
            {report.zero_day_count > 0 && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 p-6 rounded-xl border-2 border-red-300 shadow-lg">
                <div className="flex items-center mb-3">
                  <span className="text-red-600 text-2xl mr-3">🚨</span>
                  <strong className="text-red-800 text-xl font-bold">CRITICAL NOTICE</strong>
                </div>
                <p className="text-red-700 font-medium text-lg leading-relaxed">
                  This assessment identified <strong className="bg-gradient-to-r from-red-200 to-red-300 px-3 py-1 rounded text-red-900">{report.zero_day_count} zero-day vulnerabilities</strong> that require 
                  immediate attention due to their recent disclosure and potential for exploitation.
                </p>
              </div>
            )}
            
            <p className="text-lg leading-relaxed text-slate-800 font-medium">
              Following the remediation efforts, we recommend conducting a follow-up assessment to verify that vulnerabilities have been 
              properly addressed and that no new security issues have been introduced during the remediation process.
            </p>
            
            <p className="text-lg leading-relaxed text-slate-800 font-medium">
              The cybersecurity landscape continues to evolve rapidly, with new threats and vulnerabilities emerging regularly. We recommend 
              implementing a continuous vulnerability management program that includes regular scanning, timely patching procedures, and 
              security awareness training for all personnel.
            </p>
          </div>
          
          {/* Professional end marker */}
          <div className="text-center pt-8 border-t-4 border-blue-600">
            <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-2xl shadow-lg">
              <span className="text-2xl">📋</span>
              <span className="text-xl font-bold uppercase tracking-wider">END OF REPORT</span>
              <span className="text-2xl">🔒</span>
            </div>
            <p className="text-sm text-slate-600 mt-4 font-medium">
              Generated by HTC Global Services | Confidential Document
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
