'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

type Organization = {
  id: string
  name: string
  source_type: 'internal' | 'external'
}

type UploadFormData = {
  sourceType: 'internal' | 'external'
  organizationId: string
  organizationName: string
  assessee: string
  assessor: string
  reviewer: string
  approver: string
  scanStartDate: string
  scanEndDate: string
  csvFile: File | null
}

type PreviousReport = {
  id: string
  iteration_number: number
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
}

export default function UploadPage() {
  const searchParams = useSearchParams()
  const sourceFromUrl = searchParams.get('source') as 'internal' | 'external' | null
  
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([])
  const [previousReports, setPreviousReports] = useState<PreviousReport[]>([])
  const [orgSuggestions, setOrgSuggestions] = useState<Organization[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [formData, setFormData] = useState<UploadFormData>({
    sourceType: sourceFromUrl || 'internal',
    organizationId: '',
    organizationName: '',
    assessee: '',
    assessor: '',
    reviewer: '',
    approver: '',
    scanStartDate: '',
    scanEndDate: '',
    csvFile: null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  useEffect(() => {
    const filtered = organizations.filter(org => org.source_type === formData.sourceType)
    setFilteredOrgs(filtered)
    
    // Reset organization selection when source type changes
    setFormData(prev => ({ ...prev, organizationId: '', organizationName: '' }))
    setPreviousReports([])
    setOrgSuggestions([])
    setShowSuggestions(false)
  }, [formData.sourceType, organizations])

  // Fetch previous reports when organization name changes
  useEffect(() => {
    if (formData.organizationName.trim().length > 0) {
      fetchPreviousReports(formData.organizationName.trim(), formData.sourceType)
    } else {
      setPreviousReports([])
    }
  }, [formData.organizationName, formData.sourceType])

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name')

      if (error) throw error
      setOrganizations(data || [])
    } catch (err) {
      console.error('Error fetching organizations:', err)
      setError('Failed to load organizations')
    }
  }

  const fetchPreviousReports = async (orgName: string, sourceType: string) => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('id, iteration_number, scan_start_date, scan_end_date, total_vulnerabilities, critical_count, high_count, medium_count, low_count, info_count, status, created_at')
        .ilike('org_name', orgName)
        .eq('source_type', sourceType)
        .eq('status', 'completed')
        .order('iteration_number', { ascending: false })
        .limit(5)

      if (error) throw error
      setPreviousReports(data || [])
    } catch (err) {
      console.error('Error fetching previous reports:', err)
      // Don't show error for this, it's optional functionality
    }
  }

  const handleInputChange = (field: keyof UploadFormData, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  const handleOrgNameChange = useCallback(async (value: string) => {
    setFormData(prev => ({ ...prev, organizationName: value, organizationId: '' }))
    
    // Show suggestions when typing
    if (value.trim().length > 0) {
      const suggestions = filteredOrgs.filter(org => 
        org.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5)
      setOrgSuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
      
      // Check for exact match and fetch previous reports
      const exactMatch = filteredOrgs.find(org => 
        org.name.toLowerCase() === value.toLowerCase()
      )
      if (exactMatch) {
        await fetchPreviousReports(exactMatch.name, exactMatch.source_type)
      } else {
        setPreviousReports([])
      }
    } else {
      setOrgSuggestions([])
      setShowSuggestions(false)
      setPreviousReports([])
    }
  }, [filteredOrgs])

  const selectOrgSuggestion = useCallback(async (org: Organization) => {
    setFormData(prev => ({ 
      ...prev, 
      organizationName: org.name, 
      organizationId: org.id 
    }))
    setShowSuggestions(false)
    setOrgSuggestions([])
    await fetchPreviousReports(org.name, org.source_type)
  }, [])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    const csvFile = files.find(file => file.name.toLowerCase().endsWith('.csv'))
    
    if (csvFile) {
      if (csvFile.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB')
        return
      }
      handleInputChange('csvFile', csvFile)
    } else {
      setError('Please upload a CSV file')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Please upload a CSV file')
        return
      }
      handleInputChange('csvFile', file)
    }
  }

  const validateForm = (): string | null => {
    if (!formData.organizationName.trim()) return 'Organization name is required'
    if (!formData.assessee.trim()) return 'Assessee is required'
    if (!formData.assessor.trim()) return 'Assessor is required'
    if (!formData.reviewer.trim()) return 'Reviewer is required'
    if (!formData.approver.trim()) return 'Approver is required'
    if (!formData.scanStartDate) return 'Scan start date is required'
    if (!formData.scanEndDate) return 'Scan end date is required'
    if (!formData.csvFile) return 'Please upload a CSV file'
    
    if (new Date(formData.scanStartDate) > new Date(formData.scanEndDate)) {
      return 'Scan start date must be before end date'
    }
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setUploadProgress(0)
    setError('')
    setSuccess('')

    try {
      // Create FormData for file upload
      const uploadData = new FormData()
      uploadData.append('csvFile', formData.csvFile!)
      
      // Prepare form data, omitting organizationId if empty
      const submitData: Partial<UploadFormData> = {
        sourceType: formData.sourceType,
        organizationName: formData.organizationName.trim(),
        assessee: formData.assessee,
        assessor: formData.assessor,
        reviewer: formData.reviewer,
        approver: formData.approver,
        scanStartDate: formData.scanStartDate,
        scanEndDate: formData.scanEndDate
      }
      
      // Only include organizationId if it's not empty
      if (formData.organizationId && formData.organizationId.trim()) {
        submitData.organizationId = formData.organizationId
      }
      
      uploadData.append('formData', JSON.stringify(submitData))

      setUploadProgress(25)

      const response = await fetch('/api/upload-scan', {
        method: 'POST',
        body: uploadData
      })

      setUploadProgress(75)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setUploadProgress(100)
      setSuccess(`✅ Upload successful! Report ID: ${result.reportId}`)
      
      // Reset form
      setFormData({
        sourceType: 'internal',
        organizationId: '',
        organizationName: '',
        assessee: '',
        assessor: '',
        reviewer: '',
        approver: '',
        scanStartDate: '',
        scanEndDate: '',
        csvFile: null
      })

      // Redirect to report after 2 seconds
      setTimeout(() => {
        window.location.href = `/reports/${result.reportId}`
      }, 2000)

    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-2xl">�</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {formData.sourceType === 'internal' ? 'Internal' : 'External'} Scan Upload
                </h1>
                <p className="text-gray-600">Upload Nessus CSV scan results for vulnerability assessment</p>
              </div>
            </div>
            
            {/* Source Type Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Assessment Type:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                formData.sourceType === 'internal' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {formData.sourceType === 'internal' ? '🏢 Internal' : '🌐 External'}
              </span>
            </div>
          </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          {/* Source Type Selection */}
          <div>
            <label className="text-lg font-semibold text-gray-900 mb-4 block">
              📍 Source Type
            </label>
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="sourceType"
                  value="internal"
                  checked={formData.sourceType === 'internal'}
                  onChange={(e) => handleInputChange('sourceType', e.target.value as 'internal' | 'external')}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-lg font-medium text-gray-700">
                  🏢 Internal
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="sourceType"
                  value="external"
                  checked={formData.sourceType === 'external'}
                  onChange={(e) => handleInputChange('sourceType', e.target.value as 'internal' | 'external')}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-lg font-medium text-gray-700">
                  🌐 External
                </span>
              </label>
            </div>
          </div>

          {/* Organization Input with Suggestions */}
          <div>
            <label className="text-lg font-semibold text-gray-900 mb-3 block">
              🏛️ Organization Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.organizationName}
                onChange={(e) => handleOrgNameChange(e.target.value)}
                onFocus={() => {
                  if (formData.organizationName.trim() && orgSuggestions.length > 0) {
                    setShowSuggestions(true)
                  }
                }}
                onBlur={() => {
                  // Delay hiding suggestions to allow clicking
                  setTimeout(() => setShowSuggestions(false), 200)
                }}
                placeholder="Type organization name..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                required
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && orgSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {orgSuggestions.map(org => (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => selectOrgSuggestion(org)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                      <div className="font-medium">{org.name}</div>
                      <div className="text-sm text-gray-500">
                        {org.source_type} organization
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              💡 Start typing to see existing organizations or enter a new one
            </p>
          </div>

          {/* Previous Reports History */}
          {previousReports.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                📊 Previous Reports for &quot;{formData.organizationName}&quot;
              </h3>
              <div className="space-y-3">
                {previousReports.map((report) => (
                  <div key={report.id} className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-900">
                          Iteration #{report.iteration_number}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(report.scan_start_date).toLocaleDateString()} - {new Date(report.scan_end_date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Created: {new Date(report.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 mb-2">
                          Total: {report.total_vulnerabilities} vulnerabilities
                        </div>
                        <div className="flex space-x-3 text-xs">
                          <span className="text-red-600 font-semibold">C: {report.critical_count}</span>
                          <span className="text-orange-600 font-semibold">H: {report.high_count}</span>
                          <span className="text-yellow-600">M: {report.medium_count}</span>
                          <span className="text-blue-600">L: {report.low_count}</span>
                          <span className="text-gray-600">I: {report.info_count}</span>
                        </div>
                        <a
                          href={`/reports/${report.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          View Report →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 Your new upload will be <strong>Iteration #{(previousReports[0]?.iteration_number || 0) + 1}</strong> for this organization
                </p>
              </div>
            </div>
          )}

          {/* Signature Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-lg font-semibold text-gray-900 mb-3 block">
                👤 Assessee
              </label>
              <input
                type="text"
                value={formData.assessee}
                onChange={(e) => handleInputChange('assessee', e.target.value)}
                placeholder="Person being assessed"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="text-lg font-semibold text-gray-900 mb-3 block">
                🔍 Assessor
              </label>
              <input
                type="text"
                value={formData.assessor}
                onChange={(e) => handleInputChange('assessor', e.target.value)}
                placeholder="Person conducting assessment"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="text-lg font-semibold text-gray-900 mb-3 block">
                📋 Reviewer
              </label>
              <input
                type="text"
                value={formData.reviewer}
                onChange={(e) => handleInputChange('reviewer', e.target.value)}
                placeholder="Person reviewing the report"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="text-lg font-semibold text-gray-900 mb-3 block">
                ✅ Approver
              </label>
              <input
                type="text"
                value={formData.approver}
                onChange={(e) => handleInputChange('approver', e.target.value)}
                placeholder="Person approving the report"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-lg font-semibold text-gray-900 mb-3 block">
                📅 Scan Start Date
              </label>
              <input
                type="date"
                value={formData.scanStartDate}
                onChange={(e) => handleInputChange('scanStartDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="text-lg font-semibold text-gray-900 mb-3 block">
                📅 Scan End Date
              </label>
              <input
                type="date"
                value={formData.scanEndDate}
                onChange={(e) => handleInputChange('scanEndDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="text-lg font-semibold text-gray-900 mb-3 block">
              📁 CSV File Upload
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {formData.csvFile ? (
                <div className="space-y-3">
                  <div className="text-green-600 text-4xl">✅</div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">{formData.csvFile.name}</p>
                    <p className="text-gray-600">
                      {(formData.csvFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInputChange('csvFile', null)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-gray-400 text-6xl">📁</div>
                  <div>
                    <p className="text-xl text-gray-600 mb-2">
                      Drag and drop your Nessus CSV file here
                    </p>
                    <p className="text-gray-500 mb-4">or</p>
                    <label className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                      Choose File
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-sm text-gray-500">
                    Maximum file size: 10MB | Supported format: CSV
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing upload...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-red-500 text-xl">❌</span>
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-green-500 text-xl">✅</span>
                <p className="text-green-800 font-medium">{success}</p>
              </div>
              <p className="text-green-700 text-sm mt-2">
                Redirecting to report view...
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                '🚀 Upload & Process Scan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </AppLayout>
  )
}
