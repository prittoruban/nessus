"use client";

import Link from "next/link";
import { config } from "@/lib/config";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const [sourceType, setSourceType] = useState<"internal" | "external">("external");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
        </svg>
      )
    },
    {
      name: "Quick Scan Upload",
      href: "/upload",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      )
    },
    {
      name: "Risk Insights",
      href: "/risk-insights",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      name: "Overview of Results",
      href: "/overview-of-results",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      name: "Reports",
      href: "/reports",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      name: "Vulnerabilities",
      href: "/vulnerabilities",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    }
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
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
          <h1 className="text-lg font-bold text-gray-900">
            {config.app.name}
          </h1>
        </Link>
        
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          <svg
            className={`w-6 h-6 text-gray-600 transition-transform ${
              isMobileMenuOpen ? "rotate-90" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50" />
          <div className="absolute top-0 left-0 w-80 h-full bg-white shadow-xl">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
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
                  <h1 className="text-lg font-bold text-gray-900">
                    {config.app.name}
                  </h1>
                </Link>
                
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mobile Source Type Selector */}
            <div className="p-4 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Type
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as "internal" | "external")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="external">External Assessment</option>
                <option value="internal">Internal Assessment</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {sourceType === "external" 
                  ? "Third-party security assessments" 
                  : "Internal security audits"
                }
              </p>
            </div>

            {/* Mobile Navigation */}
            <nav className="p-4 space-y-2">
              {navigationItems.map((item) => {
                const active = isActive(item.href);
                const linkHref = item.href === "/" ? "/" : `${item.href}?source=${sourceType}`;
                
                return (
                  <Link
                    key={item.name}
                    href={linkHref}
                    className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className={`${active ? "text-blue-700" : "text-gray-400"}`}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                    {active && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex bg-white shadow-lg border-r border-gray-200 h-screen flex-col transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}>
        {/* Header */}
        <div className={`flex items-center p-4 border-b border-gray-200 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <Link href="/" className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
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
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold text-gray-900 leading-tight">
                  {config.app.name}
                </h1>
              </div>
            </Link>
          )}
          
          {isCollapsed && (
            <div className="flex flex-col items-center space-y-2">
              <Link href="/" className="flex items-center justify-center">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors">
                  <svg
                    className="w-6 h-6 text-white"
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
              </Link>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                title="Expand sidebar"
              >
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
          
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
              title="Collapse sidebar"
            >
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Source Type Selector */}
        {!isCollapsed && (
          <div className="p-4 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assessment Type
            </label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as "internal" | "external")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="external">External Assessment</option>
              <option value="internal">Internal Assessment</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {sourceType === "external" 
                ? "Third-party security assessments" 
                : "Internal security audits"
              }
            </p>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'p-2' : 'p-4'}`}>
          <div className={`space-y-2 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
            {navigationItems.map((item) => {
              const active = isActive(item.href);
              const linkHref = item.href === "/" ? "/" : `${item.href}?source=${sourceType}`;
              
              if (isCollapsed) {
                return (
                  <Link
                    key={item.name}
                    href={linkHref}
                    className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors group ${
                      active
                        ? "bg-blue-100 text-blue-700 border-2 border-blue-200"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    }`}
                    title={item.name}
                  >
                    <span className={`${active ? "text-blue-700" : "text-gray-500 group-hover:text-gray-700"}`}>
                      {item.icon}
                    </span>
                  </Link>
                );
              }
              
              return (
                <Link
                  key={item.name}
                  href={linkHref}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors group ${
                    active
                      ? "bg-blue-50 text-blue-700 border-r-4 border-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className={`${active ? "text-blue-700" : "text-gray-400 group-hover:text-gray-600"}`}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.name}</span>
                  {active && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Security Analyst
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {sourceType === "external" ? "External Assessments" : "Internal Audits"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
