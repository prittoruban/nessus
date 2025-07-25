'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  ShieldExclamationIcon,
  ChartBarIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ComputerDesktopIcon,
  BugAntIcon,
  InformationCircleIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import {
  ShieldExclamationIcon as ShieldExclamationIconSolid,
  FireIcon as FireIconSolid
} from '@heroicons/react/24/solid'

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
        .order('host_ip')

      if (vulnsError) throw vulnsError
      
      // Sort vulnerabilities by severity priority: critical, high, medium, low, info
      const sortedVulns = vulnsData?.sort((a, b) => {
        const severityOrder = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4, 'informational': 5 }
        const aOrder = severityOrder[a.severity as keyof typeof severityOrder] || 6
        const bOrder = severityOrder[b.severity as keyof typeof severityOrder] || 6
        
        if (aOrder !== bOrder) {
          return aOrder - bOrder
        }
        
        // If same severity, sort by host IP
        return a.host_ip.localeCompare(b.host_ip)
      }) || []
      
      setVulnerabilities(sortedVulns)

      // Filter and sort zero-day vulnerabilities
      const zeroDays = sortedVulns?.filter(v => v.is_zero_day) || []
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="professional-card text-center max-w-md mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6 animate-pulse">
            <DocumentTextIcon className="w-8 h-8 text-blue-600" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Report</h3>
          <p className="text-gray-600">Fetching vulnerability assessment data...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="professional-card text-center max-w-md mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Report Not Found</h2>
          <p className="text-gray-600 mb-8">{error || 'The requested report could not be found.'}</p>
          <button
            onClick={() => router.push('/reports')}
            className="professional-btn-primary w-full"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Reports
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Controls */}
      <div className="bg-white border-b border-gray-200 print:hidden sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/reports')}
                className="professional-btn-secondary inline-flex items-center"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Reports
              </button>
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold text-gray-900">{report.org_name}</h1>
                <p className="text-sm text-gray-600">
                  {report.source_type === 'internal' ? 'Internal' : 'External'} Assessment Report
                </p>
              </div>
            </div>
            <button
              onClick={downloadPDF}
              disabled={generatingPdf}
              className="professional-btn-primary inline-flex items-center disabled:opacity-50"
            >
              {generatingPdf ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Generating PDF...
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Download Executive Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* SECTION 1: COVER PAGE */}
        <section className="professional-card p-8 lg:p-12 text-center space-y-8">
          {/* Header Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-lg">
            <ShieldExclamationIconSolid className="w-10 h-10 text-white" />
          </div>
          
          {/* Title */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              {report.source_type === 'internal' ? 'Internal' : 'External'}
            </h1>
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-600 mb-8">
              Vulnerability Assessment Report
            </h2>
          </div>
          
          {/* Organization Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center mb-3">
                  <BuildingOfficeIcon className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Organization</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{report.org_name}</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center mb-3">
                  <DocumentTextIcon className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Report Version</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{report.version}</span>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center mb-3">
                  <CalendarDaysIcon className="w-5 h-5 text-purple-600 mr-2" />
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Assessment Period</span>
                </div>
                <span className="text-base font-semibold text-gray-900">
                  {new Date(report.scan_start_date).toLocaleDateString('en-US', { 
                    day: 'numeric', month: 'short', year: 'numeric' 
                  })} - {new Date(report.scan_end_date).toLocaleDateString('en-US', { 
                    day: 'numeric', month: 'short', year: 'numeric' 
                  })}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center mb-3">
                  <DocumentTextIcon className="w-5 h-5 text-orange-600 mr-2" />
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Document Type</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{report.document_type}</span>
              </div>
            </div>
          </div>

          {/* Signature Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-6xl mx-auto">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
              <h3 className="text-lg font-semibold text-white text-center">Document Control</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
              {[
                { label: 'Assessee', value: report.assessee, icon: UserGroupIcon, color: 'text-blue-600' },
                { label: 'Assessor', value: report.assessor, icon: ChartBarIcon, color: 'text-green-600' },
                { label: 'Reviewer', value: report.reviewer, icon: DocumentTextIcon, color: 'text-purple-600' },
                { label: 'Approved by', value: report.approver, icon: ShieldExclamationIcon, color: 'text-orange-600' }
              ].map((item, index) => (
                <div key={index} className="p-6 text-center">
                  <item.icon className={`w-8 h-8 ${item.color} mx-auto mb-3`} />
                  <div className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">{item.label}</div>
                  <div className="min-h-[2rem] flex items-center justify-center border-b border-gray-300 pb-2 mb-2">
                    <span className="text-base font-semibold text-gray-900">{item.value || 'N/A'}</span>
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Signature</div>
                </div>
              ))}
            </div>
          </div>

          {/* Company Branding */}
          <div className="inline-flex items-center space-x-3 bg-gray-50 rounded-xl px-6 py-3 border border-gray-200">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">Conducted by HTC Global Services</span>
          </div>
        </section>

        {/* SECTION 2: SCAN MANIFEST */}
        <section className="professional-card space-y-6">
          <div className="flex items-center border-b border-gray-200 pb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mr-4">
              <ClockIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Scan Manifest</h2>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                { 
                  label: 'Description', 
                  value: 'Network Vulnerability Assessment',
                  icon: DocumentTextIcon
                },
                { 
                  label: 'Test Started On', 
                  value: new Date(report.scan_start_date).toLocaleDateString('en-US', { 
                    day: 'numeric', month: 'long', year: 'numeric' 
                  }),
                  icon: CalendarDaysIcon
                },
                { 
                  label: 'Test Completed On', 
                  value: new Date(report.scan_end_date).toLocaleDateString('en-US', { 
                    day: 'numeric', month: 'long', year: 'numeric' 
                  }),
                  icon: CalendarDaysIcon
                },
                { 
                  label: 'No. of IPs Tested', 
                  value: report.total_ips_tested.toString(),
                  icon: ServerIcon
                },
                { 
                  label: 'Test Performed At', 
                  value: report.test_performed_at,
                  icon: MapPinIcon
                },
                { 
                  label: 'Tool Used', 
                  value: 'Nessus Professional',
                  icon: ComputerDesktopIcon
                }
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <item.icon className="w-5 h-5 text-blue-600 mt-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-700 mb-1">{item.label}</div>
                      <div className="text-base font-medium text-gray-900 break-words">{item.value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3: EXECUTIVE SUMMARY */}
        <section className="professional-card space-y-6">
          <div className="flex items-center border-b border-gray-200 pb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mr-4">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Executive Summary</h2>
          </div>
          
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <p className="text-base leading-relaxed text-gray-800">
                This <span className="font-semibold text-blue-600">{report.source_type}</span> assessment was conducted to understand the vulnerabilities affecting the environment
                of <strong className="text-gray-900">{report.org_name}</strong>. The assessment utilized automated scanning tools and manual verification 
                techniques to identify security weaknesses that could potentially be exploited by malicious actors. The findings 
                presented in this report are categorized according to industry-standard risk severity levels to facilitate 
                prioritized remediation efforts.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <ShieldExclamationIcon className="w-6 h-6 text-green-600 mr-3" />
                Risk Classification Model
              </h3>
              <div className="overflow-x-auto">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Priority</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Severity</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">CVSS Score</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {RISK_MODEL.map((risk, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              {risk.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getSeverityColor(risk.severity)}`}>
                              {risk.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{risk.cvss}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{risk.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Vulnerability Summary Cards */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <BugAntIcon className="w-6 h-6 text-orange-600 mr-3" />
                Vulnerability Overview
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Total', count: report.total_vulnerabilities, color: 'bg-gray-100 text-gray-800', icon: BugAntIcon },
                  { label: 'Critical', count: report.critical_count, color: 'bg-red-100 text-red-800', icon: FireIconSolid },
                  { label: 'High', count: report.high_count, color: 'bg-orange-100 text-orange-800', icon: ExclamationTriangleIcon },
                  { label: 'Medium', count: report.medium_count, color: 'bg-yellow-100 text-yellow-800', icon: ExclamationTriangleIcon },
                  { label: 'Low', count: report.low_count, color: 'bg-blue-100 text-blue-800', icon: InformationCircleIcon },
                  { label: 'Info', count: report.info_count, color: 'bg-gray-100 text-gray-800', icon: InformationCircleIcon }
                ].map((item, index) => (
                  <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                    <item.icon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    <div className="text-2xl font-bold text-gray-900 mb-1">{item.count}</div>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.color}`}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: METHODOLOGY */}
        <section className="professional-card space-y-6">
          <div className="flex items-center border-b border-gray-200 pb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mr-4">
              <ComputerDesktopIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Methodology</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {METHODOLOGY_STEPS.map((step, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-900 mb-2">{step}</h4>
                    <p className="text-sm text-gray-700">
                      {getMethodologyDescription(step)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 5: PROJECT SCOPE */}
        <section className="professional-card space-y-6">
          <div className="flex items-center border-b border-gray-200 pb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mr-4">
              <ServerIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Project Scope</h2>
          </div>
          
          <div className="overflow-x-auto">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">S.No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">IP Address</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Hostname</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Vulnerabilities</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {hosts.map((host, index) => (
                    <tr key={host.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{host.ip_address}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{host.hostname || 'N/A'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          host.scan_status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {host.scan_status.charAt(0).toUpperCase() + host.scan_status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-gray-900">{host.total_vulnerabilities}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-800 font-medium">
                This assessment did not include brute-force, DoS, phishing, or physical methods.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 6: SUMMARY OF VULNERABLE HOSTS */}
        <section className="professional-card space-y-6">
          <div className="flex items-center border-b border-gray-200 pb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mr-4">
              <ServerIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Summary of Vulnerable Hosts</h2>
          </div>
          
          <div className="overflow-x-auto">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Host IP</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Critical</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">High</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Medium</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Low</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {hosts.map((host) => (
                    <tr key={host.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{host.ip_address}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                          {host.critical_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                          {host.high_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                          {host.medium_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                          {host.low_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-10 h-8 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
                          {host.total_vulnerabilities}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td className="px-4 py-3 font-bold text-blue-900">Grand Total</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-8 bg-red-600 text-white rounded-full text-sm font-bold">
                        {report.critical_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-8 bg-orange-600 text-white rounded-full text-sm font-bold">
                        {report.high_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-8 bg-yellow-600 text-white rounded-full text-sm font-bold">
                        {report.medium_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-8 bg-blue-600 text-white rounded-full text-sm font-bold">
                        {report.low_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-12 h-10 bg-gray-800 text-white rounded-full text-sm font-bold">
                        {report.total_vulnerabilities}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 7: RISK-LEVEL SUMMARY */}
        <section className="professional-card space-y-6">
          <div className="flex items-center border-b border-gray-200 pb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mr-4">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Risk-Level Summary</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Risk Level</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { risk: 'Critical', count: report.critical_count, severity: 'critical' },
                    { risk: 'High', count: report.high_count, severity: 'high' },
                    { risk: 'Medium', count: report.medium_count, severity: 'medium' },
                    { risk: 'Low', count: report.low_count, severity: 'low' },
                    { risk: 'Informational', count: report.info_count, severity: 'info' }
                  ].map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSeverityColor(item.severity)}`}>
                          {item.risk}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-base font-medium text-gray-900">{item.count}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td className="px-4 py-3 font-bold text-blue-900">Total</td>
                    <td className="px-4 py-3 text-center font-bold text-base text-blue-900">{report.total_vulnerabilities}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Professional Vulnerability Distribution Chart */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">Vulnerability Distribution</h3>
              <div className="space-y-4">
                {[
                  { label: 'Critical', count: report.critical_count, bgColor: 'bg-red-500', textColor: 'text-red-700' },
                  { label: 'High', count: report.high_count, bgColor: 'bg-orange-500', textColor: 'text-orange-700' },
                  { label: 'Medium', count: report.medium_count, bgColor: 'bg-yellow-500', textColor: 'text-yellow-700' },
                  { label: 'Low', count: report.low_count, bgColor: 'bg-blue-500', textColor: 'text-blue-700' },
                  { label: 'Info', count: report.info_count, bgColor: 'bg-gray-500', textColor: 'text-gray-700' }
                ].map((item, index) => {
                  const maxCount = Math.max(report.critical_count, report.high_count, report.medium_count, report.low_count, report.info_count);
                  const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-14 text-right font-medium text-xs ${item.textColor}`}>
                        {item.label}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                        <div 
                          className={`h-full ${item.bgColor} rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2`}
                          style={{ width: `${Math.max(percentage, item.count > 0 ? 15 : 0)}%` }}
                        >
                          {item.count > 0 && (
                            <span className="text-white font-semibold text-xs">
                              {item.count}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-8 text-left">
                        <span className={`font-semibold text-sm ${item.textColor}`}>
                          {item.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-gray-900">Total Vulnerabilities:</span>
                  <span className="text-xl font-bold text-blue-600">{report.total_vulnerabilities}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8: ZERO-DAY VULNERABILITIES */}
        {report.zero_day_count > 0 && (
          <section className="professional-card space-y-6 border-l-4 border-red-500 bg-red-50">
            <div className="flex items-center justify-between border-b border-red-200 pb-4">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg mr-4">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-red-900">Zero-Day Vulnerabilities</h2>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-600 text-white">
                CRITICAL ALERT
              </span>
            </div>
            
            {/* Part A: Risk-wise count */}
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
                <ChartBarIcon className="w-5 h-5 text-red-600 mr-2" />
                Zero-Day Risk Distribution
              </h3>
              <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-red-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-red-800">Risk Level</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-red-800">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {['critical', 'high', 'medium', 'low'].map((severity) => {
                      const count = zeroDayVulns.filter(v => v.severity === severity).length
                      return count > 0 ? (
                        <tr key={severity} className="hover:bg-red-50">
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSeverityColor(severity)}`}>
                              {severity.charAt(0).toUpperCase() + severity.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-red-600 text-white rounded-full text-sm font-bold">
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
              <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
                <DocumentTextIcon className="w-5 h-5 text-red-600 mr-2" />
                Detailed Zero-Day Vulnerabilities
              </h3>
              <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                <table className="w-full table-auto">
                  <thead className="bg-red-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-red-800 w-16">S.No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-red-800 w-32">CVE ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-red-800 w-24">Risk</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-red-800 w-32">Host IP</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-red-800">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-red-800">Fix</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {zeroDayVulns.map((vuln, index) => (
                      <tr key={vuln.id} className="hover:bg-red-50">
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{vuln.cve_id || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getSeverityColor(vuln.severity)}`}>
                            {vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{vuln.host_ip}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{vuln.vulnerability_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{vuln.fix_recommendation || vuln.solution || 'Update to latest version'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 9: ALL VULNERABILITIES WITH REMEDIATION */}
        <section className="professional-card space-y-6">
          <div className="flex items-center border-b border-gray-200 pb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mr-4">
              <CogIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">All Vulnerabilities with Remediation</h2>
          </div>
          
          <div className="overflow-x-auto">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-16">S.No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">Risk</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">Host IP</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vulnerability Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fix Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {vulnerabilities
                    .filter(v => !v.is_zero_day) // Exclude zero-days if already shown
                    .map((vuln, index) => (
                    <tr key={vuln.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getSeverityColor(vuln.severity)}`}>
                          {vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{vuln.host_ip}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {vuln.vulnerability_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {vuln.fix_recommendation || vuln.solution || 'See detailed description'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 10: CONCLUSION */}
        <section className="professional-card space-y-6">
          <div className="flex items-center border-b border-gray-200 pb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mr-4">
              <DocumentTextIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Conclusion</h2>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-6 border-l-4 border-blue-500 space-y-4">
            <p className="text-base leading-relaxed text-gray-800">
              The vulnerability assessment of <strong className="text-blue-600">{report.org_name}</strong> has identified <strong className="bg-blue-100 px-2 py-1 rounded text-blue-800">{report.total_vulnerabilities}</strong> vulnerabilities 
              across <strong className="bg-green-100 px-2 py-1 rounded text-green-800">{report.total_ips_tested}</strong> tested systems. The findings reveal a mix of security issues ranging from 
              critical vulnerabilities requiring immediate attention to informational findings that provide security insights.
            </p>
            
            <p className="text-base leading-relaxed text-gray-800">
              We strongly recommend prioritizing the remediation of <strong className="bg-red-100 px-2 py-1 rounded text-red-800">{report.critical_count} critical</strong> and <strong className="bg-orange-100 px-2 py-1 rounded text-orange-800">{report.high_count} high-severity</strong> vulnerabilities 
              as they pose the most significant risk to the organization&apos;s security posture. The <strong className="bg-yellow-100 px-2 py-1 rounded text-yellow-800">{report.medium_count} medium-severity</strong> vulnerabilities 
              should be addressed in the next maintenance cycle, while low-severity issues can be scheduled for routine maintenance.
            </p>
            
            {report.zero_day_count > 0 && (
              <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
                <div className="flex items-center mb-2">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-2" />
                  <strong className="text-red-800 text-base font-bold">CRITICAL NOTICE</strong>
                </div>
                <p className="text-red-700 text-sm leading-relaxed">
                  This assessment identified <strong className="bg-red-200 px-2 py-1 rounded text-red-900">{report.zero_day_count} zero-day vulnerabilities</strong> that require 
                  immediate attention due to their recent disclosure and potential for exploitation.
                </p>
              </div>
            )}
            
            <p className="text-base leading-relaxed text-gray-800">
              Following the remediation efforts, we recommend conducting a follow-up assessment to verify that vulnerabilities have been 
              properly addressed and that no new security issues have been introduced during the remediation process.
            </p>
            
            <p className="text-base leading-relaxed text-gray-800">
              The cybersecurity landscape continues to evolve rapidly, with new threats and vulnerabilities emerging regularly. We recommend 
              implementing a continuous vulnerability management program that includes regular scanning, timely patching procedures, and 
              security awareness training for all personnel.
            </p>
          </div>
          
          {/* Professional end marker */}
          <div className="text-center pt-6 border-t border-gray-200">
            <div className="inline-flex items-center space-x-3 bg-blue-600 text-white px-6 py-3 rounded-lg">
              <DocumentTextIcon className="w-5 h-5" />
              <span className="text-base font-semibold">END OF REPORT</span>
              <ShieldExclamationIcon className="w-5 h-5" />
            </div>
            <p className="text-sm text-gray-600 mt-3">
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
