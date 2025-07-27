"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/AppLayout";
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import {
  CloudArrowUpIcon as CloudArrowUpIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
} from "@heroicons/react/24/solid";

type Organization = {
  id: string;
  name: string;
  source_type: "internal" | "external";
};

type UploadFormData = {
  sourceType: "internal" | "external";
  organizationId: string;
  organizationName: string;
  assessee: string;
  assessor: string;
  reviewer: string;
  approver: string;
  scanStartDate: string;
  scanEndDate: string;
  testPerformedAt: string;
  csvFile: File | null;
};

type PreviousReport = {
  id: string;
  iteration_number: number;
  scan_start_date: string;
  scan_end_date: string;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
};

export default function UploadPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<UploadFormData>({
    sourceType: "internal",
    organizationId: "",
    organizationName: "",
    assessee: "",
    assessor: "",
    reviewer: "",
    approver: "",
    scanStartDate: "",
    scanEndDate: "",
    testPerformedAt: "onsite",
    csvFile: null,
  });

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [previousReports, setPreviousReports] = useState<PreviousReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Fetch organizations
  const fetchOrganizations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("source_type", formData.sourceType)
        .order("name");

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    }
  }, [formData.sourceType]);

  // Fetch previous reports when organization changes
  const fetchPreviousReports = useCallback(async () => {
    if (!formData.organizationId) {
      setPreviousReports([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("org_id", formData.organizationId)
        .order("iteration_number", { ascending: false })
        .limit(5);

      if (error) throw error;
      setPreviousReports(data || []);
    } catch (error) {
      console.error("Error fetching previous reports:", error);
    }
  }, [formData.organizationId]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    fetchPreviousReports();
  }, [fetchPreviousReports]);

  const handleInputChange = (field: keyof UploadFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleFileChange = (file: File | null) => {
    setFormData((prev) => ({ ...prev, csvFile: file }));
    setErrors((prev) => ({ ...prev, csvFile: "" }));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        handleFileChange(file);
      } else {
        setErrors((prev) => ({ ...prev, csvFile: "Please upload a CSV file" }));
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = "Organization name is required";
    }
    if (!formData.assessee.trim()) {
      newErrors.assessee = "Assessee is required";
    }
    if (!formData.assessor.trim()) {
      newErrors.assessor = "Assessor is required";
    }
    if (!formData.reviewer.trim()) {
      newErrors.reviewer = "Reviewer is required";
    }
    if (!formData.approver.trim()) {
      newErrors.approver = "Approver is required";
    }
    if (!formData.scanStartDate) {
      newErrors.scanStartDate = "Scan start date is required";
    }
    if (!formData.scanEndDate) {
      newErrors.scanEndDate = "Scan end date is required";
    }
    if (!formData.testPerformedAt.trim()) {
      newErrors.testPerformedAt = "Test performed at location is required";
    }
    if (!formData.csvFile) {
      newErrors.csvFile = "CSV file is required";
    }

    if (formData.scanStartDate && formData.scanEndDate) {
      if (new Date(formData.scanStartDate) > new Date(formData.scanEndDate)) {
        newErrors.scanEndDate = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // Create FormData object
      const formDataToSend = new FormData();
      // The API expects form data as a JSON string
      const formDataJson = {
        sourceType: formData.sourceType,
        ...(formData.organizationId && { organizationId: formData.organizationId }),
        organizationName: formData.organizationName,
        assessee: formData.assessee,
        assessor: formData.assessor,
        reviewer: formData.reviewer,
        approver: formData.approver,
        scanStartDate: formData.scanStartDate,
        scanEndDate: formData.scanEndDate,
        testPerformedAt: formData.testPerformedAt
      };
      formDataToSend.append('formData', JSON.stringify(formDataJson));
      if (formData.csvFile) {
        formDataToSend.append('csvFile', formData.csvFile);
      }
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 300);
      // Upload to API
      const response = await fetch('/api/upload-scan', {
        method: 'POST',
        body: formDataToSend,
      });
      clearInterval(progressInterval);
      setUploadProgress(100);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        console.error('Upload failed:', errorData);
        console.error('Response status:', response.status);
        console.error('Response headers:', response.headers);
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }
      const result = await response.json();
      console.log('Upload successful:', result);
      // Show success state
      setUploadSuccess(true);
      // Show success message and redirect to the uploaded report page
      setTimeout(() => {
        setUploadProgress(0);
        setUploadSuccess(false);
        setStep(1);
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
          testPerformedAt: 'onsite',
          csvFile: null,
        });
        setErrors({});
        // Redirect to the uploaded report page
        if (result && result.reportId) {
          router.push(`/reports/${result.reportId}`);
        } else {
          router.push('/reports');
        }
      }, 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Upload failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.organizationName.trim() || !formData.sourceType) {
        setErrors({
          organizationName: "Please complete the organization details",
        });
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 mt-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Page Header - consistent with /reports */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center space-x-3">
              <CloudArrowUpIcon className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Upload Vulnerability Scan
                </h1>
                <p className="text-gray-600">
                  Upload and process vulnerability scan data for your
                  organization.
                </p>
              </div>
            </div>
          </div>

          {/* Main Form Card */}
          <div className="card card-hover overflow-hidden">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Organization Details */}
              {step === 1 && (
                <div className="p-4 sm:p-6 lg:p-8 animate-fade-in-up">
                  <div className="flex items-center mb-6 sm:mb-8">
                    <BuildingOfficeIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-3" />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      Organization Information
                    </h2>
                  </div>

                  {/* Source Type Selection */}
                  <div className="mb-6 sm:mb-8">
                    <label className="form-label">Assessment Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(["internal", "external"] as const).map((type) => (
                        <label
                          key={type}
                          className={`relative flex items-center p-4 sm:p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                            formData.sourceType === type
                              ? "border-blue-500 bg-blue-50 shadow-md"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                          }`}
                        >
                          <input
                            type="radio"
                            value={type}
                            checked={formData.sourceType === type}
                            onChange={(e) =>
                              handleInputChange(
                                "sourceType",
                                e.target.value as "internal" | "external"
                              )
                            }
                            className="sr-only"
                          />
                          <div className="flex items-center space-x-4">
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                formData.sourceType === type
                                  ? "border-blue-500 bg-blue-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {formData.sourceType === type && (
                                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 capitalize text-lg">
                                {type}
                              </div>
                              <div className="text-gray-500">
                                {type === "internal"
                                  ? "Internal network assessment"
                                  : "External perimeter assessment"}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Organization Selection */}
                  <div className="mb-8">
                    <label className="form-label">Organization</label>
                    <div className="space-y-4">
                      <select
                        value={formData.organizationId}
                        onChange={(e) => {
                          const selectedOrg = organizations.find(
                            (org) => org.id === e.target.value
                          );
                          handleInputChange("organizationId", e.target.value);
                          if (selectedOrg) {
                            handleInputChange(
                              "organizationName",
                              selectedOrg.name
                            );
                          }
                        }}
                        className="form-input"
                      >
                        <option value="">
                          Select an existing organization
                        </option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-gray-500">
                            or create new
                          </span>
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Enter new organization name"
                        value={formData.organizationName}
                        onChange={(e) =>
                          handleInputChange("organizationName", e.target.value)
                        }
                        className={`form-input ${
                          errors.organizationName
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                            : ""
                        }`}
                      />
                      {errors.organizationName && (
                        <div className="flex items-center space-x-2 text-red-600 text-sm">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          <span>{errors.organizationName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Previous Reports Preview */}
                  {previousReports.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-gray-600 mr-2" />
                        Previous Reports
                      </h3>
                      <div className="space-y-3 max-h-40 overflow-y-auto">
                        {previousReports.map((report) => (
                          <div
                            key={report.id}
                            className="flex items-center justify-between py-3 px-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                          >
                            <div>
                              <div className="font-medium text-gray-900">
                                Iteration #{report.iteration_number}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <CalendarDaysIcon className="h-4 w-4 mr-1" />
                                {new Date(
                                  report.scan_start_date
                                ).toLocaleDateString()}{" "}
                                -{" "}
                                {new Date(
                                  report.scan_end_date
                                ).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {report.total_vulnerabilities} vulnerabilities
                              </div>
                              <div className="text-xs text-gray-500">
                                Critical: {report.critical_count} | High:{" "}
                                {report.high_count}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Assessment Details */}
              {step === 2 && (
                <div className="p-4 sm:p-6 lg:p-8 animate-fade-in-up">
                  <div className="flex items-center mb-6 sm:mb-8">
                    <UserGroupIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-3" />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      Assessment Information
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    <div>
                      <label className="form-label">Assessee</label>
                      <input
                        type="text"
                        value={formData.assessee}
                        onChange={(e) =>
                          handleInputChange("assessee", e.target.value)
                        }
                        className={`form-input ${
                          errors.assessee
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                            : ""
                        }`}
                        placeholder="Enter assessee name"
                      />
                      {errors.assessee && (
                        <div className="flex items-center space-x-2 text-red-600 text-sm mt-1">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          <span>{errors.assessee}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Assessor</label>
                      <input
                        type="text"
                        value={formData.assessor}
                        onChange={(e) =>
                          handleInputChange("assessor", e.target.value)
                        }
                        className={`form-input ${
                          errors.assessor
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                            : ""
                        }`}
                        placeholder="Enter assessor name"
                      />
                      {errors.assessor && (
                        <div className="flex items-center space-x-2 text-red-600 text-sm mt-1">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          <span>{errors.assessor}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Reviewer</label>
                      <input
                        type="text"
                        value={formData.reviewer}
                        onChange={(e) =>
                          handleInputChange("reviewer", e.target.value)
                        }
                        className={`form-input ${
                          errors.reviewer
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                            : ""
                        }`}
                        placeholder="Enter reviewer name"
                      />
                      {errors.reviewer && (
                        <div className="flex items-center space-x-2 text-red-600 text-sm mt-1">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          <span>{errors.reviewer}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Approver</label>
                      <input
                        type="text"
                        value={formData.approver}
                        onChange={(e) =>
                          handleInputChange("approver", e.target.value)
                        }
                        className={`form-input ${
                          errors.approver
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                            : ""
                        }`}
                        placeholder="Enter approver name"
                      />
                      {errors.approver && (
                        <div className="flex items-center space-x-2 text-red-600 text-sm mt-1">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          <span>{errors.approver}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="form-label">
                        <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
                        Scan Start Date
                      </label>
                      <input
                        type="date"
                        value={formData.scanStartDate}
                        onChange={(e) =>
                          handleInputChange("scanStartDate", e.target.value)
                        }
                        className={`form-input ${
                          errors.scanStartDate
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                            : ""
                        }`}
                      />
                      {errors.scanStartDate && (
                        <div className="flex items-center space-x-2 text-red-600 text-sm mt-1">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          <span>{errors.scanStartDate}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="form-label">
                        <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
                        Scan End Date
                      </label>
                      <input
                        type="date"
                        value={formData.scanEndDate}
                        onChange={(e) =>
                          handleInputChange("scanEndDate", e.target.value)
                        }
                        className={`form-input ${
                          errors.scanEndDate
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                            : ""
                        }`}
                      />
                      {errors.scanEndDate && (
                        <div className="flex items-center space-x-2 text-red-600 text-sm mt-1">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          <span>{errors.scanEndDate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8">
                    <label className="form-label">Test Performed At</label>
                    <input
                      type="text"
                      value={formData.testPerformedAt}
                      onChange={(e) =>
                        handleInputChange("testPerformedAt", e.target.value)
                      }
                      placeholder="Enter test location (e.g., onsite, remote, hybrid)"
                      className={`form-input ${
                        errors.testPerformedAt
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : ""
                      }`}
                    />
                    {errors.testPerformedAt && (
                      <div className="flex items-center space-x-2 text-red-600 text-sm mt-1">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <span>{errors.testPerformedAt}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: File Upload */}
              {step === 3 && (
                <div className="p-4 sm:p-6 lg:p-8 animate-fade-in-up">
                  <div className="flex items-center mb-6 sm:mb-8">
                    <CloudArrowUpIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-3" />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      Upload Scan Data
                    </h2>
                  </div>

                  <div
                    className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 lg:p-12 text-center transition-all duration-300 ${
                      dragActive
                        ? "border-blue-500 bg-blue-50"
                        : formData.csvFile
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) =>
                        handleFileChange(e.target.files?.[0] || null)
                      }
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    <div className="space-y-4 sm:space-y-6">
                      <div
                        className={`transition-transform duration-300 ${
                          dragActive ? "scale-110" : ""
                        }`}
                      >
                        {formData.csvFile ? (
                          <CheckCircleIconSolid className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mx-auto" />
                        ) : (
                          <CloudArrowUpIconSolid className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto" />
                        )}
                      </div>

                      {formData.csvFile ? (
                        <div className="space-y-2">
                          <p className="text-lg sm:text-xl font-semibold text-green-700 break-all">
                            {formData.csvFile.name}
                          </p>
                          <p className="text-sm sm:text-base text-green-600">
                            {(formData.csvFile.size / 1024 / 1024).toFixed(2)}{" "}
                            MB
                          </p>
                          <button
                            type="button"
                            onClick={() => handleFileChange(null)}
                            className="inline-flex items-center mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-lg sm:text-xl font-semibold text-gray-700">
                            Drop your CSV file here, or click to browse
                          </p>
                          <p className="text-sm sm:text-base text-gray-500">
                            Supports CSV files from Nessus exports (max 50MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {errors.csvFile && (
                    <div className="flex items-center justify-center space-x-2 text-red-600 text-sm mt-4">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <span>{errors.csvFile}</span>
                    </div>
                  )}

                  {/* Upload Progress */}
                  {loading && (
                    <div className="mt-8 space-y-4">
                      <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                        <span>Processing your vulnerability scan...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {uploadSuccess && (
                    <div className="text-center space-y-4 mt-8 animate-fade-in-up">
                      <CheckCircleIconSolid className="h-16 w-16 text-green-500 mx-auto" />
                      <h3 className="text-xl font-semibold text-green-700">
                        Upload Successful!
                      </h3>
                      <p className="text-green-600">
                        Your vulnerability scan has been processed and saved.
                      </p>
                      <p className="text-sm text-green-500">
                        Redirecting to reports page...
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {errors.submit && (
                    <div className="text-center space-y-4 mt-8 p-6 bg-red-50 rounded-xl border border-red-200">
                      <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
                      <h3 className="text-lg font-semibold text-red-700">
                        Upload Failed
                      </h3>
                      <p className="text-red-600">{errors.submit}</p>
                      <button
                        type="button"
                        onClick={() =>
                          setErrors((prev) => ({ ...prev, submit: "" }))
                        }
                        className="inline-flex items-center text-sm text-red-700 hover:text-red-800 font-medium"
                      >
                        <XMarkIcon className="h-4 w-4 mr-1" />
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={step === 1}
                  className={`inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all duration-200 w-full sm:w-auto ${
                    step === 1
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "btn-secondary"
                  }`}
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Previous
                </button>

                <div className="text-sm text-gray-500 order-first sm:order-none">
                  Step {step} of 3
                </div>

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn-primary w-full sm:w-auto"
                  >
                    <span className="sm:hidden">Continue</span>
                    <span className="hidden sm:inline">Next Step</span>
                    <ArrowRightIcon className="h-4 w-4 ml-2" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || uploadSuccess}
                    className={`inline-flex items-center justify-center px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-200 w-full sm:w-auto ${
                      loading || uploadSuccess
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-105"
                    }`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                        Upload Scan
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
