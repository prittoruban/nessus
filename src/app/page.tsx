'use client'

import { useState, useEffect } from 'react'
import Link from "next/link"
import { supabase } from '@/lib/supabase'
import AppLayout from "@/components/AppLayout"

interface DashboardStats {
  totalReports: number
  totalVulnerabilities: number
  criticalVulns: number
  recentReports: number
  organizationsCount: number
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    totalVulnerabilities: 0,
    criticalVulns: 0,
    recentReports: 0,
    organizationsCount: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch dashboard statistics
        const [reportsResult, orgsResult] = await Promise.all([
          supabase.from('reports').select('*'),
          supabase.from('organizations').select('id')
        ])

        if (reportsResult.data) {
          const reports = reportsResult.data
          const now = new Date()
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          
          const recentReports = reports.filter(report => 
            new Date(report.created_at) >= sevenDaysAgo
          ).length

          const totalVulns = reports.reduce((sum, report) => sum + (report.total_vulnerabilities || 0), 0)
          const criticalVulns = reports.reduce((sum, report) => sum + (report.critical_count || 0), 0)

          setStats({
            totalReports: reports.length,
            totalVulnerabilities: totalVulns,
            criticalVulns: criticalVulns,
            recentReports: recentReports,
            organizationsCount: orgsResult.data?.length || 0
          })
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
              Vulnerability Assessment Portal
            </h1>
            <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Professional vulnerability management platform for Nessus scan analysis, 
              executive reporting, and comprehensive security insights.
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                {loading && <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>}
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {loading ? '...' : stats.totalReports.toLocaleString()}
              </div>
              <div className="text-sm text-slate-600">Total Reports</div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                {loading && <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full"></div>}
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {loading ? '...' : stats.totalVulnerabilities.toLocaleString()}
              </div>
              <div className="text-sm text-slate-600">Total Vulnerabilities</div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                {loading && <div className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"></div>}
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {loading ? '...' : stats.criticalVulns.toLocaleString()}
              </div>
              <div className="text-sm text-slate-600">Critical Vulnerabilities</div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                </div>
                {loading && <div className="animate-spin w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full"></div>}
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {loading ? '...' : stats.recentReports.toLocaleString()}
              </div>
              <div className="text-sm text-slate-600">Recent (7 days)</div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
                {loading && <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>}
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {loading ? '...' : stats.organizationsCount.toLocaleString()}
              </div>
              <div className="text-sm text-slate-600">Organizations</div>
            </div>
          </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Upload Scans */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-blue-100 rounded-xl">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.413V13H5.5z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 text-center">Quick Scan Upload</h3>
            <p className="text-slate-600 mb-8 text-center leading-relaxed">
              Upload CSV scan results from Nessus with comprehensive metadata and automatic parsing for instant analysis.
            </p>
            <Link 
              href="/upload"
              className="w-full inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Upload Scan
              <span className="ml-2">→</span>
            </Link>
          </div>

          {/* View Reports */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-slate-100 rounded-xl">
                <svg className="w-8 h-8 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 000 2h8a1 1 0 100-2H6zm0-3a1 1 0 000 2h4a1 1 0 100-2H6z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 text-center">View Reports</h3>
            <p className="text-slate-600 mb-8 text-center leading-relaxed">
              Access comprehensive vulnerability assessment reports with professional formatting and detailed analysis.
            </p>
            <Link 
              href="/reports"
              className="w-full inline-flex items-center justify-center bg-gradient-to-r from-slate-500 to-slate-600 text-white px-8 py-4 rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              View Reports
              <span className="ml-2">→</span>
            </Link>
          </div>

          {/* Risk Analytics */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] md:col-span-2 lg:col-span-1">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-orange-100 rounded-xl">
                <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                  <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 text-center">Risk Analytics</h3>
            <p className="text-slate-600 mb-8 text-center leading-relaxed">
              Advanced vulnerability analytics with trend analysis and executive-level insights.
            </p>
            <button 
              disabled
              className="w-full inline-flex items-center justify-center bg-slate-300 text-slate-500 px-8 py-4 rounded-xl cursor-not-allowed font-semibold"
            >
              Coming Soon
            </button>
          </div>
        </div>

        {/* Professional Report Features */}
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-8 lg:p-12 mb-16">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-blue-100 rounded-xl">
                <svg className="w-12 h-12 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 000 2h8a1 1 0 100-2H6zm0-3a1 1 0 000 2h4a1 1 0 100-2H6z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Professional VA Reports</h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Generate HTC Global-style executive reports with all 10 required sections, from cover pages to detailed 
              vulnerability remediation guidance. Available both on-screen and as downloadable PDFs.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 text-center">Report Sections</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-slate-700">Cover Page & Executive Summary</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-slate-700">Scan Manifest & Methodology</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-slate-700">Project Scope & Host Summary</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-slate-700">Risk-Level & Zero-Day Analysis</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-slate-700">Detailed Vulnerabilities & Conclusion</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 text-center">Key Features</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span className="text-slate-700">Professional Formatting</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span className="text-slate-700">Interactive Charts & Graphs</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span className="text-slate-700">Secure Data Handling</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span className="text-slate-700">Responsive Design</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span className="text-slate-700">Fast PDF Generation</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="text-center space-y-8">
          <h2 className="text-2xl font-bold text-slate-900">Get Started</h2>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link 
              href="/upload"
              className="inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 text-white px-10 py-5 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.413V13H5.5z" />
              </svg>
              Upload Your First Scan
            </Link>
            <Link 
              href="/reports"
              className="inline-flex items-center justify-center bg-gradient-to-r from-slate-600 to-slate-700 text-white px-10 py-5 rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 000 2h8a1 1 0 100-2H6zm0-3a1 1 0 000 2h4a1 1 0 100-2H6z" />
              </svg>
              View Existing Reports
            </Link>
          </div>
        </div>
        </div>
      </div>
    </AppLayout>
  )
}
