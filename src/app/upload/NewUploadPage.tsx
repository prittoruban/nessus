'use client'

import { useState, useEffect, useCallback } from 'react'
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
}

export default function UploadPage() {
  const [formData, setFormData] = useState<UploadFormData>({
    sourceType: 'internal',
    organizationId: '',
    organizationName: '',
    assessee: '',
    assessor: '',
    reviewer: '',
    approver: '',
    scanStartDate: '',
    scanEndDate: '',
    csvFile: null,
  })

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [previousReports, setPreviousReports] = useState<PreviousReport[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [step, setStep] = useState(1)
  const [dragActive, setDragActive] = useState(false)

  // Fetch organizations
  const fetchOrganizations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('source_type', formData.sourceType)
        .order('name')

      if (error) throw error
      setOrganizations(data || [])
    } catch (error) {
      console.error('Error fetching organizations:', error)
    }
  }, [formData.sourceType])

  // Fetch previous reports when organization changes
  const fetchPreviousReports = useCallback(async () => {
    if (!formData.organizationId) {
      setPreviousReports([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('org_id', formData.organizationId)
        .order('iteration_number', { ascending: false })
        .limit(5)

      if (error) throw error
      setPreviousReports(data || [])
    } catch (error) {
      console.error('Error fetching previous reports:', error)
    }
  }, [formData.organizationId])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  useEffect(() => {
    fetchPreviousReports()
  }, [fetchPreviousReports])

  const handleInputChange = (field: keyof UploadFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleFileChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, csvFile: file }))
    setErrors(prev => ({ ...prev, csvFile: '' }))
  }

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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        handleFileChange(file)
      } else {
        setErrors(prev => ({ ...prev, csvFile: 'Please upload a CSV file' }))
      }
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Organization name is required'
    }
    if (!formData.assessee.trim()) {
      newErrors.assessee = 'Assessee is required'
    }
    if (!formData.assessor.trim()) {
      newErrors.assessor = 'Assessor is required'
    }
    if (!formData.reviewer.trim()) {
      newErrors.reviewer = 'Reviewer is required'
    }
    if (!formData.approver.trim()) {
      newErrors.approver = 'Approver is required'
    }
    if (!formData.scanStartDate) {
      newErrors.scanStartDate = 'Scan start date is required'
    }
    if (!formData.scanEndDate) {
      newErrors.scanEndDate = 'Scan end date is required'
    }
    if (!formData.csvFile) {
      newErrors.csvFile = 'CSV file is required'
    }

    if (formData.scanStartDate && formData.scanEndDate) {
      if (new Date(formData.scanStartDate) > new Date(formData.scanEndDate)) {
        newErrors.scanEndDate = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      // Your upload logic here
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setUploadProgress(100)
      clearInterval(progressInterval)
      
      // Reset form or redirect
      setTimeout(() => {
        setUploadProgress(0)
        setStep(1)
        // Reset form if needed
      }, 1000)

    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step === 1) {
      if (!formData.organizationName.trim() || !formData.sourceType) {
        setErrors({ organizationName: 'Please complete the organization details' })
        return
      }
    }
    setStep(prev => Math.min(prev + 1, 3))
  }

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1))
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Upload Vulnerability Scan
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Upload your Nessus CSV scan results with comprehensive metadata for professional vulnerability assessment reporting.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    step >= stepNumber 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                      : 'bg-white text-slate-400 border-2 border-slate-200'
                  }`}>
                    {step > stepNumber ? '✓' : stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div className={`w-16 h-1 mx-2 rounded-full transition-all duration-300 ${
                      step > stepNumber ? 'bg-blue-500' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-4 space-x-24">
              <span className={`text-sm font-medium transition-colors duration-300 ${
                step >= 1 ? 'text-blue-600' : 'text-slate-400'
              }`}>Organization</span>
              <span className={`text-sm font-medium transition-colors duration-300 ${
                step >= 2 ? 'text-blue-600' : 'text-slate-400'
              }`}>Scan Details</span>
              <span className={`text-sm font-medium transition-colors duration-300 ${
                step >= 3 ? 'text-blue-600' : 'text-slate-400'
              }`}>File Upload</span>
            </div>
          </div>

          {/* Main Form */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Organization Details */}
              {step === 1 && (
                <div className="p-8 space-y-6 animate-in slide-in-from-right-5 duration-300">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Organization Details</h2>
                  
                  {/* Source Type Selection */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">
                      Assessment Type
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {(['internal', 'external'] as const).map((type) => (
                        <label
                          key={type}
                          className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-md ${
                            formData.sourceType === type
                              ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            value={type}
                            checked={formData.sourceType === type}
                            onChange={(e) => handleInputChange('sourceType', e.target.value as 'internal' | 'external')}
                            className="sr-only"
                          />
                          <div className="flex items-center space-x-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                              formData.sourceType === type
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-slate-300'
                            }`}>
                              {formData.sourceType === type && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 capitalize">{type}</div>
                              <div className="text-sm text-slate-500">
                                {type === 'internal' ? 'Internal network assessment' : 'External perimeter assessment'}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Organization Selection */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">
                      Organization
                    </label>
                    <div className="relative">
                      <select
                        value={formData.organizationId}
                        onChange={(e) => {
                          const selectedOrg = organizations.find(org => org.id === e.target.value)
                          handleInputChange('organizationId', e.target.value)
                          if (selectedOrg) {
                            handleInputChange('organizationName', selectedOrg.name)
                          }
                        }}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white"
                      >
                        <option value="">Select an organization</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-center text-slate-500">or</div>
                    <input
                      type="text"
                      placeholder="Enter new organization name"
                      value={formData.organizationName}
                      onChange={(e) => handleInputChange('organizationName', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                        errors.organizationName ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    {errors.organizationName && (
                      <p className="text-red-500 text-sm">{errors.organizationName}</p>
                    )}
                  </div>

                  {/* Previous Reports Preview */}
                  {previousReports.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <h3 className="font-semibold text-slate-900 mb-4">Previous Reports</h3>
                      <div className="space-y-3 max-h-32 overflow-y-auto">
                        {previousReports.map((report) => (
                          <div key={report.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-slate-200">
                            <div>
                              <div className="font-medium text-slate-900">Iteration #{report.iteration_number}</div>
                              <div className="text-sm text-slate-500">
                                {new Date(report.scan_start_date).toLocaleDateString()} - {new Date(report.scan_end_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-sm text-slate-600">
                              {report.total_vulnerabilities} vulnerabilities
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Scan Details */}
              {step === 2 && (
                <div className="p-8 space-y-6 animate-in slide-in-from-right-5 duration-300">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Scan Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-slate-700">
                        Assessee
                      </label>
                      <input
                        type="text"
                        value={formData.assessee}
                        onChange={(e) => handleInputChange('assessee', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                          errors.assessee ? 'border-red-500' : 'border-slate-300'
                        }`}
                        placeholder="Enter assessee name"
                      />
                      {errors.assessee && (
                        <p className="text-red-500 text-sm">{errors.assessee}</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-slate-700">
                        Assessor
                      </label>
                      <input
                        type="text"
                        value={formData.assessor}
                        onChange={(e) => handleInputChange('assessor', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                          errors.assessor ? 'border-red-500' : 'border-slate-300'
                        }`}
                        placeholder="Enter assessor name"
                      />
                      {errors.assessor && (
                        <p className="text-red-500 text-sm">{errors.assessor}</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-slate-700">
                        Reviewer
                      </label>
                      <input
                        type="text"
                        value={formData.reviewer}
                        onChange={(e) => handleInputChange('reviewer', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                          errors.reviewer ? 'border-red-500' : 'border-slate-300'
                        }`}
                        placeholder="Enter reviewer name"
                      />
                      {errors.reviewer && (
                        <p className="text-red-500 text-sm">{errors.reviewer}</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-slate-700">
                        Approver
                      </label>
                      <input
                        type="text"
                        value={formData.approver}
                        onChange={(e) => handleInputChange('approver', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                          errors.approver ? 'border-red-500' : 'border-slate-300'
                        }`}
                        placeholder="Enter approver name"
                      />
                      {errors.approver && (
                        <p className="text-red-500 text-sm">{errors.approver}</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-slate-700">
                        Scan Start Date
                      </label>
                      <input
                        type="date"
                        value={formData.scanStartDate}
                        onChange={(e) => handleInputChange('scanStartDate', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                          errors.scanStartDate ? 'border-red-500' : 'border-slate-300'
                        }`}
                      />
                      {errors.scanStartDate && (
                        <p className="text-red-500 text-sm">{errors.scanStartDate}</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-slate-700">
                        Scan End Date
                      </label>
                      <input
                        type="date"
                        value={formData.scanEndDate}
                        onChange={(e) => handleInputChange('scanEndDate', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 ${
                          errors.scanEndDate ? 'border-red-500' : 'border-slate-300'
                        }`}
                      />
                      {errors.scanEndDate && (
                        <p className="text-red-500 text-sm">{errors.scanEndDate}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: File Upload */}
              {step === 3 && (
                <div className="p-8 space-y-6 animate-in slide-in-from-right-5 duration-300">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Upload CSV File</h2>
                  
                  <div
                    className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50'
                        : formData.csvFile
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    <div className="space-y-4">
                      <div className={`text-6xl transition-transform duration-300 ${
                        dragActive ? 'scale-110' : ''
                      }`}>
                        {formData.csvFile ? '✅' : '📎'}
                      </div>
                      
                      {formData.csvFile ? (
                        <div>
                          <p className="text-lg font-semibold text-green-700">
                            {formData.csvFile.name}
                          </p>
                          <p className="text-sm text-green-600">
                            {(formData.csvFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <button
                            type="button"
                            onClick={() => handleFileChange(null)}
                            className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-lg font-semibold text-slate-700">
                            Drop your CSV file here, or click to browse
                          </p>
                          <p className="text-sm text-slate-500">
                            Supports CSV files from Nessus exports
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {errors.csvFile && (
                    <p className="text-red-500 text-sm text-center">{errors.csvFile}</p>
                  )}

                  {/* Upload Progress */}
                  {loading && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={step === 1}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    step === 1 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:shadow-md'
                  }`}
                >
                  Previous
                </button>

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      loading
                        ? 'bg-slate-400 text-white cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                    }`}
                  >
                    {loading ? 'Uploading...' : 'Upload Scan'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
