'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-slate-200 rounded w-1/3"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 shadow-lg">
                    <div className="space-y-3">
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center bg-white rounded-2xl p-8 shadow-xl border border-red-200">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Reports</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={fetchReports}
              className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors duration-300"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Vulnerability Assessment Reports
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Manage and view all your vulnerability assessment reports with advanced filtering and search capabilities.
            </p>
          </div>

          {/* Search and Quick Filters */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 text-xl">🔍</span>
                </div>
                <input
                  type="text"
                  placeholder="Search organizations, assessees, or assessors..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                />
                {filters.search && (
                  <button
                    onClick={() => updateFilter('search', '')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Quick Filters */}
              <div className="flex items-center space-x-4">
                <select
                  value={filters.sourceType}
                  onChange={(e) => updateFilter('sourceType', e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="all">All Types</option>
                  <option value="internal">Internal</option>
                  <option value="external">External</option>
                </select>

                <select
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="draft">Draft</option>
                </select>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 rounded-xl transition-all duration-300 ${
                    showFilters 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  🔧 Filters
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-slate-200 animate-in slide-in-from-top-5 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Sort By</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => updateFilter('sortBy', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="date">Date Created</option>
                      <option value="name">Organization Name</option>
                      <option value="vulnerabilities">Vulnerability Count</option>
                      <option value="iteration">Iteration Number</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Sort Order</label>
                    <select
                      value={filters.sortOrder}
                      onChange={(e) => updateFilter('sortOrder', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Date Range</label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => updateFilter('dateRange', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Time</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="90days">Last 90 Days</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all duration-300"
                    >
                      Clear Filters
                    </button>
                  </div>

                  {filters.dateRange === 'custom' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Start Date</label>
                        <input
                          type="date"
                          value={filters.customStartDate}
                          onChange={(e) => updateFilter('customStartDate', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">End Date</label>
                        <input
                          type="date"
                          value={filters.customEndDate}
                          onChange={(e) => updateFilter('customEndDate', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-slate-600">
              Showing <span className="font-semibold">{filteredReports.length}</span> of <span className="font-semibold">{reports.length}</span> reports
            </p>
            {(filters.search || filters.sourceType !== 'all' || filters.status !== 'all' || filters.dateRange !== 'all') && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Reports Grid */}
          {filteredReports.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-2xl font-semibold text-slate-700 mb-2">No reports found</h3>
              <p className="text-slate-500 mb-6">
                {filters.search || filters.sourceType !== 'all' || filters.status !== 'all' 
                  ? 'Try adjusting your filters to see more results.'
                  : 'Upload your first vulnerability scan to get started.'}
              </p>
              <button
                onClick={() => window.location.href = '/upload'}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors duration-300"
              >
                Upload First Scan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReports.map((report, index) => (
                <div
                  key={report.id}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] cursor-pointer"
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 truncate mb-1">
                        {report.org_name}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                          report.source_type === 'internal' 
                            ? 'bg-blue-100 text-blue-800 border-blue-200' 
                            : 'bg-purple-100 text-purple-800 border-purple-200'
                        }`}>
                          {report.source_type === 'internal' ? '🏢 Internal' : '🌐 External'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-2xl">📋</div>
                  </div>

                  {/* Iteration Info */}
                  <div className="mb-4 p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Iteration #{report.iteration_number}</span>
                      <span className="text-slate-500">
                        {new Date(report.scan_start_date).toLocaleDateString()} - {new Date(report.scan_end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Vulnerability Counts */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Total Vulnerabilities</span>
                      <span className="text-lg font-bold text-slate-900">{report.total_vulnerabilities}</span>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 bg-red-50 rounded-lg">
                        <div className={`text-lg font-bold ${getSeverityColor(report.critical_count, 'critical')}`}>
                          {report.critical_count}
                        </div>
                        <div className="text-xs text-slate-600">Critical</div>
                      </div>
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <div className={`text-lg font-bold ${getSeverityColor(report.high_count, 'high')}`}>
                          {report.high_count}
                        </div>
                        <div className="text-xs text-slate-600">High</div>
                      </div>
                      <div className="p-2 bg-yellow-50 rounded-lg">
                        <div className={`text-lg font-bold ${getSeverityColor(report.medium_count, 'medium')}`}>
                          {report.medium_count}
                        </div>
                        <div className="text-xs text-slate-600">Medium</div>
                      </div>
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <div className={`text-lg font-bold ${getSeverityColor(report.low_count, 'low')}`}>
                          {report.low_count}
                        </div>
                        <div className="text-xs text-slate-600">Low</div>
                      </div>
                    </div>
                  </div>

                  {/* Team Info */}
                  {(report.assessee || report.assessor) && (
                    <div className="text-sm text-slate-600 space-y-1 mb-4">
                      {report.assessee && (
                        <div>Assessee: <span className="font-medium">{report.assessee}</span></div>
                      )}
                      {report.assessor && (
                        <div>Assessor: <span className="font-medium">{report.assessor}</span></div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-500">
                      Created {new Date(report.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        View
                      </button>
                      <button className="text-slate-600 hover:text-slate-700 text-sm font-medium">
                        Export
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
