"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const reportId = params.id as string;
    if (reportId) {
      // Redirect to executive report
      router.replace(`/reports/${reportId}/executive`);
    }
  }, [params.id, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Redirecting to executive report...</p>
      </div>
    </div>
  );
}
