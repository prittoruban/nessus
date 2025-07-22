import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// For server-side operations (API routes), we'll create this separately
export const createServerSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Database types (will be expanded as we add more tables)
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          source_type: 'internal' | 'external'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          source_type: 'internal' | 'external'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          source_type?: 'internal' | 'external'
          created_at?: string
          updated_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          org_id: string
          org_name: string
          source_type: 'internal' | 'external'
          scan_start_date: string
          scan_end_date: string
          version: string
          document_type: string
          assessee: string | null
          assessor: string | null
          reviewer: string | null
          approver: string | null
          created_by: string | null
          original_filename: string | null
          file_size: number | null
          total_ips_tested: number
          total_vulnerabilities: number
          critical_count: number
          high_count: number
          medium_count: number
          low_count: number
          info_count: number
          zero_day_count: number
          iteration_number: number
          previous_report_id: string | null
          status: 'processing' | 'completed' | 'failed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          org_name: string
          source_type: 'internal' | 'external'
          scan_start_date: string
          scan_end_date: string
          version?: string
          document_type?: string
          assessee?: string | null
          assessor?: string | null
          reviewer?: string | null
          approver?: string | null
          created_by?: string | null
          original_filename?: string | null
          file_size?: number | null
          total_ips_tested?: number
          total_vulnerabilities?: number
          critical_count?: number
          high_count?: number
          medium_count?: number
          low_count?: number
          info_count?: number
          zero_day_count?: number
          iteration_number?: number
          previous_report_id?: string | null
          status?: 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          org_name?: string
          source_type?: 'internal' | 'external'
          scan_start_date?: string
          scan_end_date?: string
          version?: string
          document_type?: string
          assessee?: string | null
          assessor?: string | null
          reviewer?: string | null
          approver?: string | null
          created_by?: string | null
          original_filename?: string | null
          file_size?: number | null
          total_ips_tested?: number
          total_vulnerabilities?: number
          critical_count?: number
          high_count?: number
          medium_count?: number
          low_count?: number
          info_count?: number
          zero_day_count?: number
          iteration_number?: number
          previous_report_id?: string | null
          status?: 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
      }
      report_hosts: {
        Row: {
          id: string
          report_id: string
          ip_address: string
          hostname: string | null
          scan_status: 'completed' | 'failed' | 'timeout' | 'unreachable'
          critical_count: number
          high_count: number
          medium_count: number
          low_count: number
          info_count: number
          total_vulnerabilities: number
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          ip_address: string
          hostname?: string | null
          scan_status?: 'completed' | 'failed' | 'timeout' | 'unreachable'
          critical_count?: number
          high_count?: number
          medium_count?: number
          low_count?: number
          info_count?: number
          total_vulnerabilities?: number
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          ip_address?: string
          hostname?: string | null
          scan_status?: 'completed' | 'failed' | 'timeout' | 'unreachable'
          critical_count?: number
          high_count?: number
          medium_count?: number
          low_count?: number
          info_count?: number
          total_vulnerabilities?: number
          created_at?: string
        }
      }
      vulnerabilities: {
        Row: {
          id: string
          report_id: string
          host_id: string
          host_ip: string
          cve_id: string | null
          plugin_id: string | null
          vulnerability_name: string
          severity: 'critical' | 'high' | 'medium' | 'low' | 'informational'
          cvss_score: number | null
          cvss_vector: string | null
          description: string | null
          solution: string | null
          fix_recommendation: string | null
          port: number | null
          protocol: string | null
          service: string | null
          is_zero_day: boolean
          is_exploitable: boolean
          references: string[] | null
          plugin_family: string | null
          plugin_output: string | null
          first_found: string
          last_seen: string
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          host_id: string
          host_ip: string
          cve_id?: string | null
          plugin_id?: string | null
          vulnerability_name: string
          severity: 'critical' | 'high' | 'medium' | 'low' | 'informational'
          cvss_score?: number | null
          cvss_vector?: string | null
          description?: string | null
          solution?: string | null
          fix_recommendation?: string | null
          port?: number | null
          protocol?: string | null
          service?: string | null
          is_zero_day?: boolean
          is_exploitable?: boolean
          references?: string[] | null
          plugin_family?: string | null
          plugin_output?: string | null
          first_found?: string
          last_seen?: string
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          host_id?: string
          host_ip?: string
          cve_id?: string | null
          plugin_id?: string | null
          vulnerability_name?: string
          severity?: 'critical' | 'high' | 'medium' | 'low' | 'informational'
          cvss_score?: number | null
          cvss_vector?: string | null
          description?: string | null
          solution?: string | null
          fix_recommendation?: string | null
          port?: number | null
          protocol?: string | null
          service?: string | null
          is_zero_day?: boolean
          is_exploitable?: boolean
          references?: string[] | null
          plugin_family?: string | null
          plugin_output?: string | null
          first_found?: string
          last_seen?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
