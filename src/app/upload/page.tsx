"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface UploadFormData {
  // Organization & Report Details
  orgName: string;
  sourceType: "internal" | "external";
  reportName: string;
  reportDescription: string;
  documentType: string;
  version: string;
  
  // Personnel
  assessee: string;
  assessor: string;
  reviewer: string;
  approver: string;
  conductedBy: string;
  
  // Scan Details
  scanStartDate: string;
  scanEndDate: string;
  testLocation: string;
  toolUsed: string;
  scanDescription: string;
  
  // Report Content
  methodology: string;
  projectScopeNotes: string;
  conclusion: string;
  confidentialityLevel: string;
  legalDisclaimer: string;
  
  // File
  file: File | null;
}

export default function QuickScanUploadPage() {
  const [formData, setFormData] = useState<UploadFormData>({
    orgName: "",
    sourceType: "internal",
    reportName: "",
    reportDescription: "",
    documentType: "Vulnerability Assessment Report",
    version: "1.0",
    assessee: "",
    assessor: "",
    reviewer: "",
    approver: "",
    conductedBy: "HTC Global Services\nUnit 25, SDF II, Phase II, MEPZ\nChennai- 600045. India.\nPhone: (44) 45158888 / 45158800",
    scanStartDate: "",
    scanEndDate: "",
    testLocation: "On-site",
    toolUsed: "Nessus",
    scanDescription: "Network Vulnerability Assessment",
    methodology: "",
    projectScopeNotes: "In this testing except Brute force attack, HTC did not attempt any active network-based Denial of Service (DoS), Password cracking, physical, process, and social engineering attacks.",
    conclusion: "",
    confidentialityLevel: "Internal",
    legalDisclaimer: "This document contains confidential and proprietary information.",
    file: null,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadHistory, setUploadHistory] = useState<{
    id: number;
    orgName: string;
    iteration: number;
    date: string;
    vulnerabilities: number;
  }[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Mock data for organizations and history
  const existingOrganizations = [
    "ABC Corporation", "XYZ Company", "TechCorp Ltd", "Client A", "Client B"
  ];

  const mockUploadHistory = [
    { id: 1, orgName: "ABC Corporation", iteration: 2, date: "2025-01-15", vulnerabilities: 45 },
    { id: 2, orgName: "ABC Corporation", iteration: 1, date: "2024-12-10", vulnerabilities: 156 },
    { id: 3, orgName: "XYZ Company", iteration: 1, date: "2024-11-20", vulnerabilities: 89 },
  ];

  useEffect(() => {
    // Filter upload history based on selected organization
    if (formData.orgName) {
      const filtered = mockUploadHistory.filter(upload => upload.orgName === formData.orgName);
      setUploadHistory(filtered);
    } else {
      setUploadHistory([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.orgName]);

  const handleInputChange = (field: keyof UploadFormData, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleInputChange("file", selectedFile);
      // Auto-generate report name if not provided
      if (!formData.reportName) {
        const timestamp = new Date().toLocaleDateString();
        const fileName = selectedFile.name.replace('.csv', '');
        handleInputChange("reportName", `${fileName} - ${timestamp}`);
      }
    }
  };

  const getNextIteration = () => {
    if (uploadHistory.length === 0) return 1;
    return Math.max(...uploadHistory.map(h => h.iteration)) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation
    const requiredFields = {
      file: "Please select a file",
      orgName: "Please enter organization name",
      reportName: "Please enter report name",
      scanStartDate: "Please select scan start date",
      scanEndDate: "Please select scan end date"
    };

    for (const [field, errorMessage] of Object.entries(requiredFields)) {
      if (!formData[field as keyof UploadFormData]) {
        setMessage(errorMessage);
        return;
      }
    }

    // Validate date range
    if (formData.scanStartDate && formData.scanEndDate) {
      const startDate = new Date(formData.scanStartDate);
      const endDate = new Date(formData.scanEndDate);
      if (startDate > endDate) {
        setMessage("Scan end date must be after start date");
        return;
      }
    }

    // Auto-populate report name if not provided
    if (!formData.reportName && formData.file) {
      const timestamp = new Date().toLocaleDateString();
      const fileName = formData.file.name.replace('.csv', '');
      handleInputChange("reportName", `${fileName} - ${timestamp}`);
    }

    setLoading(true);
    setMessage("");

    try {
      // Create FormData with all fields
      const uploadFormData = new FormData();
      if (formData.file) {
        uploadFormData.append("file", formData.file);
      }
      uploadFormData.append("orgName", formData.orgName);
      uploadFormData.append("sourceType", formData.sourceType);
      uploadFormData.append("reportName", formData.reportName);
      uploadFormData.append("reportDescription", formData.reportDescription);
      uploadFormData.append("documentType", formData.documentType);
      uploadFormData.append("version", formData.version);
      uploadFormData.append("assessee", formData.assessee);
      uploadFormData.append("assessor", formData.assessor);
      uploadFormData.append("reviewer", formData.reviewer);
      uploadFormData.append("approver", formData.approver);
      uploadFormData.append("conductedBy", formData.conductedBy);
      uploadFormData.append("scanStartDate", formData.scanStartDate);
      uploadFormData.append("scanEndDate", formData.scanEndDate);
      uploadFormData.append("testLocation", formData.testLocation);
      uploadFormData.append("toolUsed", formData.toolUsed);
      uploadFormData.append("scanDescription", formData.scanDescription);
      uploadFormData.append("methodology", formData.methodology);
      uploadFormData.append("projectScopeNotes", formData.projectScopeNotes);
      uploadFormData.append("conclusion", formData.conclusion);
      uploadFormData.append("confidentialityLevel", formData.confidentialityLevel);
      uploadFormData.append("legalDisclaimer", formData.legalDisclaimer);

      // Make API call
      const response = await fetch("/api/scan/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const result = await response.json();

      if (response.ok) {
        const iteration = getNextIteration();
        setMessage(`Successfully uploaded scan for ${formData.orgName} (Iteration #${iteration})`);
        
        // Reset form
        setFormData(prev => ({ 
          ...prev, 
          file: null, 
          reportName: "", 
          reportDescription: "",
          scanStartDate: "",
          scanEndDate: ""
        }));
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quick Scan Upload</h1>
          <p className="text-gray-600 mb-4">Upload vulnerability scan results for an organization</p>
          
          {/* Essential Information Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Essential Information for Report Generation</h3>
            <p className="text-sm text-blue-700 mb-2">
              The following fields marked with (*) are required for generating comprehensive executive reports:
            </p>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li><strong>Organization Name</strong> - Used in report headers and identification</li>
              <li><strong>CSV File</strong> - Contains vulnerability data for analysis</li>
              <li><strong>Report Name</strong> - Identifies this specific assessment</li>
              <li><strong>Scan Dates</strong> - Defines the assessment period for the report</li>
            </ul>
            <p className="text-sm text-blue-700 mt-2">
              <strong>Tip:</strong> Use &ldquo;Advanced Settings&rdquo; to customize personnel, methodology, and legal disclaimers for more professional reports.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization & Source Type */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.orgName}
                    onChange={(e) => handleInputChange("orgName", e.target.value)}
                    placeholder="Enter organization name"
                    list="organizations"
                  />
                  <datalist id="organizations">
                    {existingOrganizations.map(org => (
                      <option key={org} value={org} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Type *
                  </label>
                  <select
                    value={formData.sourceType}
                    onChange={(e) => handleInputChange("sourceType", e.target.value as "internal" | "external")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="internal">Internal</option>
                    <option value="external">External</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Type
                  </label>
                  <Input
                    type="text"
                    value={formData.documentType}
                    onChange={(e) => handleInputChange("documentType", e.target.value)}
                    placeholder="e.g., Vulnerability Assessment Report"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Version
                  </label>
                  <Input
                    type="text"
                    value={formData.version}
                    onChange={(e) => handleInputChange("version", e.target.value)}
                    placeholder="e.g., 1.0"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Upload History (shown when org is selected) */}
          {formData.orgName && uploadHistory.length > 0 && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Previous Scans for {formData.orgName}
                </h3>
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-700">
                    This will be <strong>Iteration #{getNextIteration()}</strong> for this organization
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Iteration</th>
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Vulnerabilities</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadHistory.map(upload => (
                        <tr key={upload.id} className="border-b">
                          <td className="py-2">#{upload.iteration}</td>
                          <td className="py-2">{upload.date}</td>
                          <td className="py-2">{upload.vulnerabilities}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}

          {/* File Upload */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan File</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSV File *
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload your Nessus scan results in CSV format (max 10MB)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.reportName}
                    onChange={(e) => handleInputChange("reportName", e.target.value)}
                    placeholder="Auto-generated from file name if left empty"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Description
                  </label>
                  <textarea
                    value={formData.reportDescription}
                    onChange={(e) => handleInputChange("reportDescription", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of this scan"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Basic Scan Details */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scan Start Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.scanStartDate}
                    onChange={(e) => handleInputChange("scanStartDate", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scan End Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.scanEndDate}
                    onChange={(e) => handleInputChange("scanEndDate", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Location
                  </label>
                  <Input
                    type="text"
                    value={formData.testLocation}
                    onChange={(e) => handleInputChange("testLocation", e.target.value)}
                    placeholder="e.g., On-site, Remote"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tool Used
                  </label>
                  <Input
                    type="text"
                    value={formData.toolUsed}
                    onChange={(e) => handleInputChange("toolUsed", e.target.value)}
                    placeholder="e.g., Nessus"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Advanced Settings Toggle */}
          <Card>
            <div className="p-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <span className="mr-2">{showAdvanced ? "Hide" : "Show"} Advanced Settings</span>
                <svg
                  className={`w-4 h-4 transform ${showAdvanced ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAdvanced && (
                <div className="mt-6 space-y-6">
                  {/* Personnel */}
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-4">Personnel</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Assessee</label>
                        <Input
                          type="text"
                          value={formData.assessee}
                          onChange={(e) => handleInputChange("assessee", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Assessor</label>
                        <Input
                          type="text"
                          value={formData.assessor}
                          onChange={(e) => handleInputChange("assessor", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reviewer</label>
                        <Input
                          type="text"
                          value={formData.reviewer}
                          onChange={(e) => handleInputChange("reviewer", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Approver</label>
                        <Input
                          type="text"
                          value={formData.approver}
                          onChange={(e) => handleInputChange("approver", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Report Content */}
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-4">Report Content</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Methodology</label>
                        <textarea
                          value={formData.methodology}
                          onChange={(e) => handleInputChange("methodology", e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Describe the assessment methodology used"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Project Scope Notes</label>
                        <textarea
                          value={formData.projectScopeNotes}
                          onChange={(e) => handleInputChange("projectScopeNotes", e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Conclusion</label>
                        <textarea
                          value={formData.conclusion}
                          onChange={(e) => handleInputChange("conclusion", e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Summary and recommendations"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Security & Legal */}
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-4">Security & Legal</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confidentiality Level</label>
                        <select
                          value={formData.confidentialityLevel}
                          onChange={(e) => handleInputChange("confidentialityLevel", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Internal">Internal</option>
                          <option value="Confidential">Confidential</option>
                          <option value="Restricted">Restricted</option>
                          <option value="Public">Public</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Legal Disclaimer</label>
                        <textarea
                          value={formData.legalDisclaimer}
                          onChange={(e) => handleInputChange("legalDisclaimer", e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Legal disclaimer for the report"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !formData.file || !formData.orgName || !formData.reportName || !formData.scanStartDate || !formData.scanEndDate}
            >
              {loading ? "Uploading..." : "Upload Scan"}
            </Button>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-md ${
              message.includes("Success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
