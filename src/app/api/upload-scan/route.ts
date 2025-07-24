import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import Papa from 'papaparse'
import { z } from 'zod'

// Validation schemas
const FormDataSchema = z.object({
  sourceType: z.enum(['internal', 'external']),
  organizationId: z.string().optional(),
  organizationName: z.string().min(1),
  assessee: z.string().min(1),
  assessor: z.string().min(1),
  reviewer: z.string().min(1),
  approver: z.string().min(1),
  scanStartDate: z.string(),
  scanEndDate: z.string()
})

// Types
interface HostData {
  ip_address: string
  hostname: string | null
  scan_status: string
}

interface HostRecord extends HostData {
  id: string
  report_id: string
}

interface VulnerabilityData {
  report_id: string
  host_ip: string
  cve_id: string | null
  plugin_id: string | null
  vulnerability_name: string
  severity: string
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
  plugin_family: string | null
  plugin_output: string | null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    
    // Parse FormData
    const formData = await request.formData()
    const csvFile = formData.get('csvFile') as File
    const formDataJson = formData.get('formData') as string

    // Debug logging
    console.log('Received csvFile:', csvFile ? csvFile.name : 'null')
    console.log('Received formData:', formDataJson ? 'present' : 'null')
    console.log('FormData keys:', Array.from(formData.keys()))

    if (!csvFile || !formDataJson) {
      return NextResponse.json(
        { 
          error: 'Missing required files or data',
          debug: {
            hasCsvFile: !!csvFile,
            hasFormData: !!formDataJson,
            formDataKeys: Array.from(formData.keys())
          }
        },
        { status: 400 }
      )
    }

    // Validate form data
    const parsedFormData = FormDataSchema.parse(JSON.parse(formDataJson))
    
    // Manual validation for organizationId - treat empty strings as undefined
    if (parsedFormData.organizationId === '') {
      parsedFormData.organizationId = undefined
    } else if (parsedFormData.organizationId) {
      // Validate UUID format if provided
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(parsedFormData.organizationId)) {
        return NextResponse.json(
          { error: 'Invalid organization ID format' },
          { status: 400 }
        )
      }
    }
    
    // Validate file
    if (!csvFile.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      )
    }

    if (csvFile.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Read and parse CSV
    const csvText = await csvFile.text()
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    })

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing failed', details: parseResult.errors },
        { status: 400 }
      )
    }

    const csvData = parseResult.data as Record<string, string>[]
    
    if (csvData.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty or invalid' },
        { status: 400 }
      )
    }

    // Handle organization - either find existing or create new
    let orgId: string

    if (parsedFormData.organizationId) {
      // Existing organization
      const { data: existingOrg, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', parsedFormData.organizationId)
        .single()

      if (orgError || !existingOrg) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        )
      }
      orgId = existingOrg.id
    } else {
      // New organization - check if it already exists by name and source type
      const { data: existingByName } = await supabase
        .from('organizations')
        .select('*')
        .ilike('name', parsedFormData.organizationName)
        .eq('source_type', parsedFormData.sourceType)
        .single()

      if (existingByName) {
        // Organization exists, use it
        orgId = existingByName.id
      } else {
        // Create new organization
        const { data: newOrg, error: createError } = await supabase
          .from('organizations')
          .insert({
            name: parsedFormData.organizationName.trim(),
            source_type: parsedFormData.sourceType
          })
          .select()
          .single()

        if (createError || !newOrg) {
          return NextResponse.json(
            { error: 'Failed to create organization: ' + createError?.message },
            { status: 500 }
          )
        }
        orgId = newOrg.id
      }
    }

    // Check for previous reports to determine iteration
    const { data: previousReports } = await supabase
      .from('reports')
      .select('id, iteration_number')
      .eq('org_id', orgId)
      .order('iteration_number', { ascending: false })
      .limit(1)

    const nextIteration = previousReports?.[0]?.iteration_number ? 
      previousReports[0].iteration_number + 1 : 1

    // Create report record
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .insert({
        org_id: orgId,
        org_name: parsedFormData.organizationName,
        source_type: parsedFormData.sourceType,
        scan_start_date: parsedFormData.scanStartDate,
        scan_end_date: parsedFormData.scanEndDate,
        assessee: parsedFormData.assessee,
        assessor: parsedFormData.assessor,
        reviewer: parsedFormData.reviewer,
        approver: parsedFormData.approver,
        created_by: parsedFormData.assessor, // Using assessor as creator for now
        original_filename: csvFile.name,
        file_size: csvFile.size,
        iteration_number: nextIteration,
        previous_report_id: previousReports?.[0]?.id || null,
        status: 'processing'
      })
      .select()
      .single()

    if (reportError) {
      console.error('Report creation error:', reportError)
      return NextResponse.json(
        { error: 'Failed to create report', details: reportError.message },
        { status: 500 }
      )
    }

    const reportId = reportData.id

    // Process CSV data to extract unique hosts and vulnerabilities
    const hostMap = new Map<string, HostData>()
    const vulnerabilities: VulnerabilityData[] = []

    for (const row of csvData) {
      try {
        // Validate row structure (flexible validation)
        const hostIp = row['Host'] || row['IP'] || row['host'] || row['ip']
        const riskLevel = row['Risk'] || row['risk'] || row['Severity'] || row['severity']
        const vulnName = row['Name'] || row['name'] || row['Vulnerability'] || row['vulnerability']
        
        if (!hostIp || !riskLevel || !vulnName) {
          console.warn('Skipping row with missing required fields:', row)
          continue
        }

        // Normalize risk level
        const normalizedRisk = normalizeRiskLevel(riskLevel)
        if (!normalizedRisk) {
          console.warn('Skipping row with invalid risk level:', riskLevel)
          continue
        }

        // Add/update host
        if (!hostMap.has(hostIp)) {
          hostMap.set(hostIp, {
            ip_address: hostIp,
            hostname: row['Hostname'] || row['hostname'] || null,
            scan_status: 'completed'
          })
        }

        // Extract CVE ID
        const cveMatch = (row['CVE'] || row['cve'] || '').match(/CVE-\d{4}-\d+/i)
        const cveId = cveMatch ? cveMatch[0].toUpperCase() : null

        // Check if it's a zero-day (2024-2025 CVEs or specific indicators)
        const isZeroDay = checkIfZeroDay(cveId, vulnName, row['Description'] || '')

        // Parse CVSS score
        const cvssScore = parseCVSSScore(row['CVSS'] || row['cvss'] || '')

        vulnerabilities.push({
          report_id: reportId,
          host_ip: hostIp,
          cve_id: cveId,
          plugin_id: row['Plugin ID'] || row['plugin_id'] || null,
          vulnerability_name: vulnName,
          severity: normalizedRisk,
          cvss_score: cvssScore,
          cvss_vector: row['CVSS Vector'] || row['cvss_vector'] || null,
          description: row['Description'] || row['Synopsis'] || row['description'] || null,
          solution: row['Solution'] || row['solution'] || null,
          fix_recommendation: row['Solution'] || row['Recommendation'] || row['Fix'] || null,
          port: parseInt(row['Port'] || row['port'] || '0') || null,
          protocol: row['Protocol'] || row['protocol'] || null,
          service: row['Service'] || row['service'] || null,
          is_zero_day: isZeroDay,
          is_exploitable: checkIfExploitable(vulnName, row['Description'] || ''),
          plugin_family: row['Plugin Family'] || row['family'] || null,
          plugin_output: row['Plugin Output'] || row['output'] || null
        })
      } catch (rowError) {
        console.warn('Error processing row:', rowError, row)
        continue
      }
    }

    // Insert hosts
    const hostsToInsert = Array.from(hostMap.values()).map(host => ({
      ...host,
      report_id: reportId
    }))

    const { data: hostData, error: hostError } = await supabase
      .from('report_hosts')
      .insert(hostsToInsert)
      .select()

    if (hostError) {
      console.error('Host insertion error:', hostError)
      return NextResponse.json(
        { error: 'Failed to insert hosts', details: hostError.message },
        { status: 500 }
      )
    }

    // Create host_id mapping
    const hostIdMap = new Map<string, string>()
    hostData.forEach((host: HostRecord) => {
      hostIdMap.set(host.ip_address, host.id)
    })

    // Add host_id to vulnerabilities
    const vulnerabilitiesWithHostId = vulnerabilities.map(vuln => ({
      ...vuln,
      host_id: hostIdMap.get(vuln.host_ip)
    })).filter(vuln => vuln.host_id) // Only include vulnerabilities with valid host_id

    // Insert vulnerabilities in batches (Supabase has a limit)
    const batchSize = 100
    for (let i = 0; i < vulnerabilitiesWithHostId.length; i += batchSize) {
      const batch = vulnerabilitiesWithHostId.slice(i, i + batchSize)
      const { error: vulnError } = await supabase
        .from('vulnerabilities')
        .insert(batch)

      if (vulnError) {
        console.error('Vulnerability insertion error:', vulnError)
        // Continue with other batches but log the error
      }
    }

    // Update report status to completed
    await supabase
      .from('reports')
      .update({ status: 'completed' })
      .eq('id', reportId)

    return NextResponse.json({
      success: true,
      reportId,
      message: 'Upload processed successfully',
      stats: {
        hostsProcessed: hostsToInsert.length,
        vulnerabilitiesProcessed: vulnerabilitiesWithHostId.length,
        totalRows: csvData.length
      }
    })

  } catch (error) {
    console.error('Upload processing error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process upload', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Helper functions
function normalizeRiskLevel(risk: string): string | null {
  const normalized = risk.toLowerCase().trim()
  switch (normalized) {
    case 'critical':
    case 'high':
    case 'medium':
    case 'low':
      return normalized
    case 'info':
    case 'informational':
    case 'information':
      return 'informational'
    default:
      return null
  }
}

function parseCVSSScore(cvss: string): number | null {
  const score = parseFloat(cvss)
  return !isNaN(score) && score >= 0 && score <= 10 ? score : null
}

function checkIfZeroDay(cveId: string | null, vulnName: string, description: string): boolean {
  if (!cveId) return false
  
  // Check for recent CVEs (2024-2025)
  const cveYear = cveId.match(/CVE-(\d{4})-/)?.[1]
  if (cveYear && parseInt(cveYear) >= 2024) return true
  
  // Check for zero-day indicators in name/description
  const zerodayIndicators = ['zero-day', 'zero day', '0-day', 'recently disclosed', 'newly discovered']
  const searchText = `${vulnName} ${description}`.toLowerCase()
  
  return zerodayIndicators.some((indicator: string) => searchText.includes(indicator))
}

function checkIfExploitable(vulnName: string, description: string): boolean {
  const exploitableIndicators = [
    'remote code execution', 'rce', 'privilege escalation', 'buffer overflow',
    'sql injection', 'code injection', 'arbitrary code', 'exploit available'
  ]
  const searchText = `${vulnName} ${description}`.toLowerCase()
  
  return exploitableIndicators.some((indicator: string) => searchText.includes(indicator))
}
