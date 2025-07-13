"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase, testSupabaseConnection } from "@/lib/supabase";
import { config } from "@/lib/config";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Stats {
  totalVulnerabilities: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({
    totalVulnerabilities: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "failed">("checking");

  useEffect(() => {
    checkConnectionAndFetchStats();
  }, []);

  const checkConnectionAndFetchStats = async () => {
    try {
      // First check connection
      const connectionResult = await testSupabaseConnection();
      if (!connectionResult.success) {
        setConnectionStatus("failed");
        setError(connectionResult.error || "Failed to connect to database");
        setLoading(false);
        return;
      }

      setConnectionStatus("connected");
      await fetchStats();
    } catch (error) {
      setConnectionStatus("failed");
      setError("Failed to initialize application");
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setError(null);
      
      // Get total count
      const { count: total } = await supabase
        .from("vulnerabilities")
        .select("*", { count: "exact", head: true });

      // Get severity counts
      const { data: severityData } = await supabase
        .from("vulnerabilities")
        .select("severity");

      const severityCounts = severityData?.reduce((acc, item) => {
        const severity = item.severity?.toLowerCase();
        if (severity === "high") acc.highSeverity++;
        else if (severity === "medium") acc.mediumSeverity++;
        else if (severity === "low") acc.lowSeverity++;
        return acc;
      }, { highSeverity: 0, mediumSeverity: 0, lowSeverity: 0 }) || { highSeverity: 0, mediumSeverity: 0, lowSeverity: 0 };

      setStats({
        totalVulnerabilities: total || 0,
        ...severityCounts,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      setError("Failed to load vulnerability data");
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color 
  }: { 
    title: string; 
    value: number; 
    icon: React.ReactNode; 
    color: string; 
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 w-8 h-8 ${color} rounded-md flex items-center justify-center`}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {loading ? "Loading..." : value.toLocaleString()}
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Connection Status */}
          {connectionStatus === "failed" && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Vulnerabilities"
              value={stats.totalVulnerabilities}
              icon={
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              color="bg-blue-500"
            />

            <StatCard
              title="High Severity"
              value={stats.highSeverity}
              icon={
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              }
              color="bg-red-500"
            />

            <StatCard
              title="Medium Severity"
              value={stats.mediumSeverity}
              icon={
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              }
              color="bg-yellow-500"
            />

            <StatCard
              title="Low Severity"
              value={stats.lowSeverity}
              icon={
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="bg-green-500"
            />
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link href="/upload">
                <Card className="relative group hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div>
                      <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-lg font-medium">Upload New Scan</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Upload a Nessus CSV file to analyze vulnerabilities
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/vulnerabilities">
                <Card className="relative group hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div>
                      <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-lg font-medium">View Vulnerabilities</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Browse and analyze all discovered vulnerabilities
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
