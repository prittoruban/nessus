"use client";

import Link from "next/link";
import { config } from "@/lib/config";
import { useState } from "react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 md:py-6">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                <span className="hidden sm:inline">{config.app.name}</span>
                <span className="sm:hidden">HTC Portal</span>
              </h1>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-6">
            <Link
              href="/"
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/upload"
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Quick Scan Upload
            </Link>
            <Link
              href="/risk-insights"
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Risk Insights
            </Link>
            <Link
              href="/overview-of-results"
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Overview of Results
            </Link>
            <Link
              href="/reports"
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Reports
            </Link>
            <Link
              href="/vulnerabilities"
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Vulnerabilities
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700 p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {!mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 md:hidden bg-white border-t border-gray-200 shadow-lg z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="space-y-1">
                <Link
                  href="/"
                  className="block text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-base font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/upload"
                  className="block text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-base font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Quick Scan Upload
                </Link>
                <Link
                  href="/risk-insights"
                  className="block text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-base font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Risk Insights
                </Link>
                <Link
                  href="/overview-of-results"
                  className="block text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-base font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Overview of Results
                </Link>
                <Link
                  href="/reports"
                  className="block text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-base font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Reports
                </Link>
                <Link
                  href="/vulnerabilities"
                  className="block text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-base font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Vulnerabilities
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
