// Environment configuration
export const config = {
  supabase: {
    url: "https://sluaqkqvglnbklqqxjds.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdWFxa3F2Z2xuYmtscXF4amRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMzIzNjksImV4cCI6MjA2NzcwODM2OX0.RLtHtjOJmNpHE-JMjByGSkoRFsqO6QkbkID7xKriHHI",
  },
  app: {
    name: "Nessus Vulnerability Scanner",
    description: "Upload and analyze Nessus vulnerability scan results",
    version: "1.0.0",
  },
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [".csv"],
    maxRecords: 10000, // Maximum records per upload
  },
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
} as const;

// Type for the config
export type Config = typeof config; 