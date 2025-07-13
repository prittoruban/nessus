import { useState, useEffect } from "react";
import { VulnerabilityService } from "../lib/services/vulnerability.service";
import { Vulnerability } from "../lib/validators/vulnerability.schema";

interface UseVulnerabilitiesOptions {
  page?: number;
  limit?: number;
  severity?: "all" | "high" | "medium" | "low" | "info";
  search?: string;
  sort?: "created_at" | "severity" | "ip_address";
  order?: "asc" | "desc";
}

interface UseVulnerabilitiesReturn {
  vulnerabilities: Vulnerability[];
  loading: boolean;
  error: string | null;
  total: number;
  totalPages: number;
  currentPage: number;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for managing vulnerabilities data
 */
export function useVulnerabilities(options: UseVulnerabilitiesOptions = {}): UseVulnerabilitiesReturn {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(options.page || 1);

  const fetchVulnerabilities = async () => {
    const service = new VulnerabilityService();
    
    try {
      setLoading(true);
      setError(null);

      const result = await service.getVulnerabilities({
        page: options.page || 1,
        limit: options.limit || 20,
        severity: options.severity || "all",
        search: options.search || "",
        sort: options.sort || "created_at",
        order: options.order || "desc",
      });

      setVulnerabilities(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setCurrentPage(result.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch vulnerabilities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVulnerabilities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.page,
    options.limit,
    options.severity,
    options.search,
    options.sort,
    options.order,
  ]);

  return {
    vulnerabilities,
    loading,
    error,
    total,
    totalPages,
    currentPage,
    refetch: fetchVulnerabilities,
  };
}

/**
 * Custom hook for vulnerability statistics
 */
export function useVulnerabilityStats() {
  const [stats, setStats] = useState({
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    const service = new VulnerabilityService();
    
    try {
      setLoading(true);
      setError(null);

      const result = await service.getVulnerabilityStats();
      setStats(result.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

/**
 * Custom hook for database connection testing
 */
export function useConnectionTest() {
  const [status, setStatus] = useState<"checking" | "connected" | "failed">("checking");
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    const service = new VulnerabilityService();
    
    try {
      setStatus("checking");
      setError(null);

      const result = await service.testConnection();

      if (result.success) {
        setStatus("connected");
      } else {
        setStatus("failed");
        setError(result.error || "Connection failed");
      }
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Connection test failed");
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return {
    status,
    error,
    testConnection,
  };
}
