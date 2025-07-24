'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

interface Report {
  id: string
  org_name: string
  source_type: 'internal' | 'external'
  scan_start_date: string
  scan_end_date: string
  total_vulnerabilities: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  info_count: number
  status: string
  created_at: string
  iteration_number: number
}

export default function ReportsPage() {
  const searchParams = useSearchParams()
  const sourceFromUrl = searchParams.get('source') as 'internal' | 'external' | null
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sourceType, setSourceType] = useState<'internal' | 'external'>(sourceFromUrl || 'internal')

  useEffect(() => {
    if (sourceFromUrl) {
      setSourceType(sourceFromUrl)
    }
  }, [sourceFromUrl])

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('source_type', sourceType)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReports(data || [])
    } catch (err) {
      console.error('Error fetching reports:', err)
      setError('Failed to fetch reports')
    } finally {
      setLoading(false)
    }
  }, [sourceType])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading reports...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-xl mb-4">{error}</p>
            <button
              onClick={fetchReports}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-2xl">📋</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {sourceType === 'internal' ? 'Internal' : 'External'} Reports
                  </h1>
                  <p className="text-gray-600">Vulnerability assessment reports and findings</p>
                </div>
              </div>
              
              {/* Source Type Indicator */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Assessment Type:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  sourceType === 'internal' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {sourceType === 'internal' ? '🏢 Internal' : '🌐 External'}
                </span>
              </div>
            </div>
          </div>

          {/* Reports List */}
          {reports.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reports Found</h3>
              <p className="text-gray-600 mb-6">
                No {sourceType} assessment reports have been generated yet.
              </p>
              <Link
                href={`/upload?source=${sourceType}`}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                📤 Upload Scan Results
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {reports.map((report) => (
                <div key={report.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {report.org_name}
                        </h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Iteration #{report.iteration_number}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          report.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{report.critical_count}</div>
                          <div className="text-sm text-gray-600">Critical</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{report.high_count}</div>
                          <div className="text-sm text-gray-600">High</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">{report.medium_count}</div>
                          <div className="text-sm text-gray-600">Medium</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{report.low_count}</div>
                          <div className="text-sm text-gray-600">Low</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Scan Period:</span> {' '}
                          {new Date(report.scan_start_date).toLocaleDateString()} - {' '}
                          {new Date(report.scan_end_date).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Total Vulnerabilities:</span> {report.total_vulnerabilities}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {new Date(report.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-6">
                      <Link
                        href={`/reports/${report.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium text-center"
                      >
                        📄 View Report
                      </Link>
                      <Link
                        href={`/api/pdf/generate/${report.id}`}
                        target="_blank"
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium text-center"
                      >
                        📥 Download PDF
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
