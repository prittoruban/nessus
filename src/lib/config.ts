// Environment configuration
export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  },
  app: {
    name: "HTC Global VA Report Assistance Portal",
    description: "Comprehensive vulnerability assessment reporting platform with multi-organizational support",
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
