import Link from "next/link";
import AppLayout from "@/components/AppLayout";

export default function Home() {
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              🛡️ Nessus VA Report Portal
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              A comprehensive vulnerability assessment reporting platform for managing Nessus scan results, 
              generating professional reports, and tracking security insights across your organization.
            </p>
          </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {/* Upload Scans */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🔺</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Quick Scan Upload</h3>
            <p className="text-gray-600 mb-6">
              Upload CSV scan results from Nessus with comprehensive metadata and automatic parsing.
            </p>
            <Link 
              href="/upload"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Upload Scan →
            </Link>
          </div>

          {/* Risk Insights */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Risk Insights</h3>
            <p className="text-gray-600 mb-6">
              View iteration-wise risk counts and compare vulnerability trends across time.
            </p>
            <button 
              disabled
              className="inline-block bg-gray-400 text-white px-6 py-3 rounded-lg cursor-not-allowed font-medium"
            >
              Coming Soon
            </button>
          </div>

          {/* Overview Results */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Overview of Results</h3>
            <p className="text-gray-600 mb-6">
              Executive-level summaries with charts and metrics for organization-wide security posture.
            </p>
            <button 
              disabled
              className="inline-block bg-gray-400 text-white px-6 py-3 rounded-lg cursor-not-allowed font-medium"
            >
              Coming Soon
            </button>
          </div>

          {/* Professional Reports */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow md:col-span-2 lg:col-span-3">
            <div className="text-center">
              <div className="text-4xl mb-4">📑</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Professional VA Reports</h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Generate HTC Global-style executive reports with all 10 required sections, from cover pages to detailed 
                vulnerability remediation guidance. Available both on-screen and as downloadable PDFs.
              </p>
              <div className="text-sm text-gray-500">
                ✅ Cover Page • ✅ Scan Manifest • ✅ Executive Summary • ✅ Methodology • ✅ Project Scope<br/>
                ✅ Vulnerable Hosts Summary • ✅ Risk-Level Summary • ✅ Zero-Day Vulnerabilities • ✅ All Vulnerabilities • ✅ Conclusion
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Get Started</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/upload"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
            >
              🚀 Upload Your First Scan
            </Link>
            <Link 
              href="/reports"
              className="bg-gray-600 text-white px-8 py-4 rounded-lg hover:bg-gray-700 transition-colors font-semibold text-lg"
            >
              📋 View Existing Reports
            </Link>
          </div>
        </div>

        {/* Features List */}
        <div className="mt-20 bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">System Capabilities</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-green-600 text-xl">✅</span>
                <span>CSV Upload with automatic parsing</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600 text-xl">✅</span>
                <span>Internal & External organization support</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600 text-xl">✅</span>
                <span>Automatic vulnerability categorization</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600 text-xl">✅</span>
                <span>Zero-day vulnerability detection</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600 text-xl">✅</span>
                <span>Professional PDF report generation</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-green-600 text-xl">✅</span>
                <span>HTC Global report format compliance</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600 text-xl">✅</span>
                <span>Iteration tracking and comparison</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600 text-xl">✅</span>
                <span>Comprehensive vulnerability remediation</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600 text-xl">✅</span>
                <span>Secure data storage with RLS</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600 text-xl">✅</span>
                <span>Responsive design for all devices</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
