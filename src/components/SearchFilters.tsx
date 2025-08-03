"use client";

import { BuildingOfficeIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface Organization {
  id: string;
  name: string;
  source_type: "internal" | "external";
  report_count: number;
  latest_scan: string;
  total_ips: number;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  risk_score?: number;
  compliance_status?: "compliant" | "non-compliant" | "partial";
  last_assessment_date?: string;
  next_assessment_due?: string;
}

interface SearchFiltersProps {
  organizations: Organization[];
  selectedOrg: Organization | null;
  selectedSourceType: "all" | "internal" | "external";
  loading: boolean;
  onOrgSelect: (org: Organization) => void;
  onSourceTypeChange: (sourceType: "all" | "internal" | "external") => void;
}

export default function SearchFilters({
  organizations,
  selectedOrg,
  selectedSourceType,
  loading,
  onOrgSelect,
  onSourceTypeChange,
}: SearchFiltersProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assessment Type Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assessment Type
              </label>
              <select
                value={selectedSourceType}
                onChange={(e) =>
                  onSourceTypeChange(
                    e.target.value as "all" | "internal" | "external"
                  )
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Assessments</option>
                <option value="internal">Internal Only</option>
                <option value="external">External Only</option>
              </select>
            </div>

            {/* Organization Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Organization
              </label>
              <select
                value={selectedOrg?.id || ""}
                onChange={(e) => {
                  const org = organizations.find(
                    (o) => o.id === e.target.value
                  );
                  if (org) {
                    onOrgSelect(org);
                  }
                }}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                disabled={organizations.length === 0}
              >
                <option value="">
                  {organizations.length === 0
                    ? "No organizations available"
                    : "Select an organization..."}
                </option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.source_type}) - {org.report_count} reports
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center space-x-2 text-gray-500">
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading organizations...</span>
          </div>
        )}

        {/* Selected Organization Summary */}
        {selectedOrg && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  {selectedOrg.name}
                </h3>
                <p className="text-xs text-blue-700">
                  Type: {selectedOrg.source_type} | Reports:{" "}
                  {selectedOrg.report_count} | IPs: {selectedOrg.total_ips} |
                  Vulnerabilities: {selectedOrg.total_vulnerabilities}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-blue-700">
                  Critical: {selectedOrg.critical_count} | High:{" "}
                  {selectedOrg.high_count}
                </div>
                {selectedOrg.risk_score && (
                  <div className="text-xs text-blue-700">
                    Risk Score: {selectedOrg.risk_score}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
