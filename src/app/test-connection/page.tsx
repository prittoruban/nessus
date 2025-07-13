"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestConnection() {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setStatus("Testing connection...");

    try {
      // Test basic connection
      const { data, error } = await supabase
        .from("vulnerabilities")
        .select("count", { count: "exact", head: true });

      if (error) {
        setStatus(`❌ Connection failed: ${error.message}`);
      } else {
        setStatus(
          `✅ Connection successful! Found ${data?.length || 0} records`
        );
      }
    } catch (err) {
      setStatus(
        `❌ Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Supabase Connection Test</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2 text-sm">
            <p>
              <strong>SUPABASE_URL:</strong>{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing"}
            </p>
            <p>
              <strong>SUPABASE_ANON_KEY:</strong>{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                ? "✅ Set"
                : "❌ Missing"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Test</h2>
          <button
            onClick={testConnection}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Testing..." : "Test Connection"}
          </button>
          {status && (
            <div className="mt-4 p-3 rounded bg-gray-100">
              <p className="text-sm">{status}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
          <ul className="space-y-2 text-sm">
            <li>• If connection fails, check your Supabase project settings</li>
            <li>
              • Make sure the &apos;vulnerabilities&apos; table exists in your
              database
            </li>
            <li>• Verify RLS policies allow read access</li>
            <li>• Check if your project URL and anon key are correct</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
