"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    reportId: string;
    inserted: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-generate report name if not provided
      if (!reportName) {
        const timestamp = new Date().toLocaleDateString();
        const fileName = selectedFile.name.replace('.csv', '');
        setReportName(`${fileName} - ${timestamp}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setMessage("Please select a file");
      return;
    }

    setLoading(true);
    setMessage("");
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("reportName", reportName);
      formData.append("reportDescription", reportDescription);

      const response = await fetch("/api/scan/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setMessage("Upload successful!");
        setUploadResult(result.data);
        // Clear form
        setFile(null);
        setReportName("");
        setReportDescription("");
        const fileInput = document.getElementById("file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        setMessage(result.error || "Upload failed");
      }
    } catch (error) {
      setMessage("Upload failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center mb-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700 mr-4">
                ← Back to Dashboard
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Upload Nessus Scan</h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              Upload your Nessus CSV vulnerability scan file to analyze and store the results.
            </p>
          </div>

          {/* Upload Form */}
          <Card className="mb-6">
            <CardContent className="p-4 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Report Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label htmlFor="reportName" className="block text-sm font-medium text-gray-700 mb-2">
                      Report Name *
                    </label>
                    <input
                      type="text"
                      id="reportName"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="Enter report name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
                      Nessus CSV File *
                    </label>
                    <input
                      type="file"
                      id="file-input"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reportDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    id="reportDescription"
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Enter report description..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                  />
                </div>

                {/* File Info */}
                {file && (
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Selected File:</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p><strong>Name:</strong> <span className="break-all">{file.name}</span></p>
                      <p><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      <p><strong>Type:</strong> {file.type || 'text/csv'}</p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || !file}
                    className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Uploading..." : "Upload & Process"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Upload Result */}
          {uploadResult && (
            <Card className="mb-6">
              <CardContent className="p-4 md:p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-4">✅ Upload Successful</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-md text-center">
                    <p className="text-sm font-medium text-green-900">Processed</p>
                    <p className="text-2xl font-bold text-green-700">{uploadResult.inserted}</p>
                    <p className="text-xs text-green-600">vulnerabilities</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-md text-center">
                    <p className="text-sm font-medium text-yellow-900">Skipped</p>
                    <p className="text-2xl font-bold text-yellow-700">{uploadResult.skipped}</p>
                    <p className="text-xs text-yellow-600">invalid rows</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-md text-center sm:text-left">
                    <p className="text-sm font-medium text-blue-900">Report ID</p>
                    <p className="text-xs sm:text-sm font-mono text-blue-700 break-all">{uploadResult.reportId}</p>
                  </div>
                </div>
                
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-red-900 mb-2">Processing Errors:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {uploadResult.errors.slice(0, 5).map((error: string, index: number) => (
                        <li key={index} className="break-words">• {error}</li>
                      ))}
                      {uploadResult.errors.length > 5 && (
                        <li className="text-red-600">... and {uploadResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="mt-6 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <Link 
                    href="/vulnerabilities"
                    className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-center"
                  >
                    View All Vulnerabilities
                  </Link>
                  <Link 
                    href={`/reports/${uploadResult.reportId}`}
                    className="w-full sm:w-auto bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-center"
                  >
                    View This Report
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Message */}
          {message && (
            <div className={`p-4 rounded-md ${
              message.includes("successful") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}>
              {message}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
