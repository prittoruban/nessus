'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'
import { 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  FunnelIcon,
  CalendarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'

interface Report {
  id: string
  org_name: string
  source_type: 'internal' | 'external'
  scan_start_date: string
  scan_end_date: string
  test_performed_at: string
  total_vulnerabilities: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  info_count: number
  status: string
  created_at: string
  iteration_number: number
  assessee: string
  assessor: string
}

interface Filters {
  search: string
  sourceType: 'all' | 'internal' | 'external'
  status: 'all' | 'pending' | 'completed' | 'draft'
  sortBy: 'date' | 'name' | 'vulnerabilities' | 'iteration'
  sortOrder: 'asc' | 'desc'
  dateRange: 'all' | '7days' | '30days' | '90days' | 'custom'
  customStartDate: string
  customEndDate: string
}

export default function ReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({
    search: '',
    sourceType: 'all',
    status: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
    dateRange: 'all',
    customStartDate: '',
    customEndDate: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setReports(data || [])
    } catch (err) {
      console.error('Error fetching reports:', err)
      setError('Failed to fetch reports')
    } finally {
      setLoading(false)
    }
  }, [])

  const applyFilters = useCallback(() => {
    let filtered = [...reports]

    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(report => 
        report.org_name.toLowerCase().includes(searchTerm) ||
        report.assessee?.toLowerCase().includes(searchTerm) ||
        report.assessor?.toLowerCase().includes(searchTerm)
      )
    }

    // Source type filter
    if (filters.sourceType !== 'all') {
      filtered = filtered.filter(report => report.source_type === filters.sourceType)
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(report => report.status === filters.status)
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (filters.dateRange) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case 'custom':
          if (filters.customStartDate && filters.customEndDate) {
            startDate = new Date(filters.customStartDate)
            const endDate = new Date(filters.customEndDate)
            filtered = filtered.filter(report => {
              const reportDate = new Date(report.created_at)
              return reportDate >= startDate && reportDate <= endDate
            })
          }
          break
        default:
          startDate = new Date(0)
      }

      if (filters.dateRange !== 'custom') {
        filtered = filtered.filter(report => new Date(report.created_at) >= startDate)
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0

      switch (filters.sortBy) {
        case 'name':
          comparison = a.org_name.localeCompare(b.org_name)
          break
        case 'vulnerabilities':
          comparison = a.total_vulnerabilities - b.total_vulnerabilities
          break
        case 'iteration':
          comparison = a.iteration_number - b.iteration_number
          break
        case 'date':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison
    })

    setFilteredReports(filtered)
  }, [reports, filters])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      sourceType: 'all',
      status: 'all',
      sortBy: 'date',
      sortOrder: 'desc',
      dateRange: 'all',
      customStartDate: '',
      customEndDate: ''
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getSeverityColor = (count: number, severity: string) => {
    if (count === 0) return 'text-slate-400'
    
    switch (severity) {
      case 'critical':
        return 'text-red-600 font-bold'
      case 'high':
        return 'text-orange-600 font-semibold'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-blue-600'
      default:
        return 'text-slate-600'
    }
  }

  const handleViewReport = (reportId: string) => {
    router.push(`/reports/${reportId}`)
  }

  const handleExportReport = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    
    try {
      setExporting(reportId)
      
      // Create a link to download the PDF
      const response = await fetch(`/api/pdf/generate/${reportId}`)
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }
      
      // Get the blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `vulnerability-report-${reportId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export report. Please try again.')
    } finally {
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/25 animate-pulse">
                <ChartBarIcon className="w-8 h-8 text-white" />
              </div>
              <div className="h-10 bg-gray-200 rounded-lg w-1/2 mx-auto mb-4 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded-lg w-1/3 mx-auto animate-pulse"></div>
            </div>
            
            <div className="professional-card mb-8 animate-pulse">
              <div className="flex flex-col xl:flex-row gap-6">
                <div className="flex-1 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex gap-4">
                  <div className="h-12 w-32 bg-gray-200 rounded-lg"></div>
                  <div className="h-12 w-32 bg-gray-200 rounded-lg"></div>
                  <div className="h-12 w-24 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="professional-card animate-pulse">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                        <div className="flex gap-2">
                          <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                          <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    </div>
                    <div className="h-16 bg-gray-100 rounded-lg"></div>
                    <div className="grid grid-cols-4 gap-2">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="h-12 bg-gray-100 rounded-lg"></div>
                      ))}
                    </div>
                    <div className="h-8 bg-gray-100 rounded-lg"></div>
                    <div className="flex justify-between items-center pt-2">
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      <div className="flex gap-2">
                        <div className="h-6 w-12 bg-gray-200 rounded"></div>
                        <div className="h-6 w-14 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="professional-card text-center max-w-md mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Reports</h2>
            <p className="text-gray-600 mb-8">{error}</p>
            <button
              onClick={fetchReports}
              className="professional-btn-primary w-full"
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/25">
              <ChartBarIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Vulnerability Assessment Reports
            </h1>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              Manage and analyze your vulnerability assessment reports with advanced filtering, search capabilities, and professional export options.
            </p>
          </div>

          {/* Search and Quick Filters */}
          <div className="professional-card mb-8">
            <div className="flex flex-col xl:flex-row gap-6">
              {/* Search */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search organizations, assessees, or assessors..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="professional-input pl-12 pr-12"
                />
                {filters.search && (
                  <button
                    onClick={() => updateFilter('search', '')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap items-center gap-4">
                <select
                  value={filters.sourceType}
                  onChange={(e) => updateFilter('sourceType', e.target.value)}
                  className="professional-select min-w-[180px]"
                >
                  <option value="all">All Assessment Types</option>
                  <option value="internal">Internal Assessments</option>
                  <option value="external">External Assessments</option>
                </select>

                <select
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="professional-select min-w-[160px]"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed Reports</option>
                  <option value="pending">Pending Review</option>
                  <option value="draft">Draft Reports</option>
                </select>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`professional-btn-secondary flex items-center gap-2 ${
                    showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : ''
                  }`}
                >
                  <AdjustmentsHorizontalIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Advanced</span>
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200 animate-in slide-in-from-top-5 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Sort By</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => updateFilter('sortBy', e.target.value)}
                      className="professional-select"
                    >
                      <option value="date">Date Created</option>
                      <option value="name">Organization Name</option>
                      <option value="vulnerabilities">Vulnerability Count</option>
                      <option value="iteration">Iteration Number</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Sort Order</label>
                    <div className="relative">
                      <select
                        value={filters.sortOrder}
                        onChange={(e) => updateFilter('sortOrder', e.target.value)}
                        className="professional-select pr-10"
                      >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                      </select>
                      {filters.sortOrder === 'desc' ? (
                        <ArrowDownIcon className="absolute right-8 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      ) : (
                        <ArrowUpIcon className="absolute right-8 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Date Range</label>
                    <div className="relative">
                      <select
                        value={filters.dateRange}
                        onChange={(e) => updateFilter('dateRange', e.target.value)}
                        className="professional-select pr-10"
                      >
                        <option value="all">All Time</option>
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                        <option value="90days">Last 90 Days</option>
                        <option value="custom">Custom Range</option>
                      </select>
                      <CalendarIcon className="absolute right-8 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="professional-btn-secondary w-full"
                    >
                      <XMarkIcon className="w-4 h-4 mr-2" />
                      Clear All
                    </button>
                  </div>

                  {filters.dateRange === 'custom' && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Start Date</label>
                        <input
                          type="date"
                          value={filters.customStartDate}
                          onChange={(e) => updateFilter('customStartDate', e.target.value)}
                          className="professional-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">End Date</label>
                        <input
                          type="date"
                          value={filters.customEndDate}
                          onChange={(e) => updateFilter('customEndDate', e.target.value)}
                          className="professional-input"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <p className="text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredReports.length}</span> of <span className="font-semibold text-gray-900">{reports.length}</span> reports
              </p>
              {filteredReports.length !== reports.length && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <FunnelIcon className="w-3 h-3 mr-1" />
                  Filtered
                </span>
              )}
            </div>
            {(filters.search || filters.sourceType !== 'all' || filters.status !== 'all' || filters.dateRange !== 'all') && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 underline font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Reports Grid */}
          {filteredReports.length === 0 ? (
            <div className="professional-card text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
                <ShieldCheckIcon className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {filters.search || filters.sourceType !== 'all' || filters.status !== 'all' 
                  ? 'Try adjusting your filters to see more results, or upload new vulnerability scans to get started.'
                  : 'Upload your first vulnerability scan to create professional assessment reports.'}
              </p>
              <button
                onClick={() => window.location.href = '/upload'}
                className="professional-btn-primary inline-flex items-center gap-2"
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                Upload First Scan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredReports.map((report, index) => (
                <div
                  key={report.id}
                  onClick={() => handleViewReport(report.id)}
                  className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl cursor-pointer hover:-translate-y-1 transition-all duration-300 p-6"
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate mb-3 group-hover:text-blue-600 transition-colors">
                        {report.org_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          report.source_type === 'internal' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {report.source_type === 'internal' ? 'Internal' : 'External'}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:from-blue-600 group-hover:to-blue-700 transition-all shadow-sm">
                      <ChartBarIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Iteration Info */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="font-semibold text-gray-700">Iteration #{report.iteration_number}</span>
                      <div className="flex items-center text-gray-500">
                        <CalendarIcon className="w-4 h-4 mr-1.5" />
                        <span className="text-xs">
                          {new Date(report.scan_start_date).toLocaleDateString()} - {new Date(report.scan_end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Test Location:</span> 
                      <span className="ml-1">{report.test_performed_at}</span>
                    </div>
                  </div>

                  {/* Vulnerability Summary */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-gray-700">Total Vulnerabilities</span>
                      <span className="text-xl sm:text-2xl font-bold text-gray-900">{report.total_vulnerabilities}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                        <div className={`text-base sm:text-lg font-bold mb-1 ${getSeverityColor(report.critical_count, 'critical')}`}>
                          {report.critical_count}
                        </div>
                        <div className="text-xs font-medium text-red-700">Critical</div>
                      </div>
                      <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                        <div className={`text-base sm:text-lg font-bold mb-1 ${getSeverityColor(report.high_count, 'high')}`}>
                          {report.high_count}
                        </div>
                        <div className="text-xs font-medium text-orange-700">High</div>
                      </div>
                      <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
                        <div className={`text-base sm:text-lg font-bold mb-1 ${getSeverityColor(report.medium_count, 'medium')}`}>
                          {report.medium_count}
                        </div>
                        <div className="text-xs font-medium text-yellow-700">Medium</div>
                      </div>
                      <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                        <div className={`text-base sm:text-lg font-bold mb-1 ${getSeverityColor(report.low_count, 'low')}`}>
                          {report.low_count}
                        </div>
                        <div className="text-xs font-medium text-blue-700">Low</div>
                      </div>
                    </div>
                  </div>

                  {/* Team Info */}
                  {(report.assessee || report.assessor) && (
                    <div className="text-sm text-gray-600 space-y-2 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      {report.assessee && (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-20 flex-shrink-0">Assessee:</span>
                          <span className="ml-2 truncate">{report.assessee}</span>
                        </div>
                      )}
                      {report.assessor && (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-20 flex-shrink-0">Assessor:</span>
                          <span className="ml-2 truncate">{report.assessor}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      Created {new Date(report.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewReport(report.id)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      >
                        <EyeIcon className="w-4 h-4" />
                        View
                      </button>
                      <button 
                        onClick={(e) => handleExportReport(report.id, e)}
                        disabled={exporting === report.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
                      >
                        <DocumentArrowDownIcon className="w-4 h-4" />
                        {exporting === report.id ? 'Exporting...' : 'Export'}
                      </button>
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
