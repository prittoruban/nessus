-- ===============================================
-- DATA MIGRATION SCRIPT
-- Migration: 04_data_migration.sql
-- Description: Migrate existing data to new schema structure
-- ===============================================

-- 0. ADD MISSING COLUMNS
-- ===============================================
-- Add updated_at column to tables that may be missing it
ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE report_hosts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add aggregation columns to reports table if they don't exist
ALTER TABLE reports ADD COLUMN IF NOT EXISTS total_vulnerabilities INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS critical_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS high_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS medium_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS low_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS info_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS zero_day_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS number_of_ips INTEGER DEFAULT 0;

-- Add aggregation columns to report_hosts table if they don't exist
ALTER TABLE report_hosts ADD COLUMN IF NOT EXISTS critical_count INTEGER DEFAULT 0;
ALTER TABLE report_hosts ADD COLUMN IF NOT EXISTS high_count INTEGER DEFAULT 0;
ALTER TABLE report_hosts ADD COLUMN IF NOT EXISTS medium_count INTEGER DEFAULT 0;
ALTER TABLE report_hosts ADD COLUMN IF NOT EXISTS low_count INTEGER DEFAULT 0;
ALTER TABLE report_hosts ADD COLUMN IF NOT EXISTS info_count INTEGER DEFAULT 0;
ALTER TABLE report_hosts ADD COLUMN IF NOT EXISTS total_count INTEGER DEFAULT 0;
ALTER TABLE report_hosts ADD COLUMN IF NOT EXISTS zero_day_count INTEGER DEFAULT 0;

-- 1. UPDATE EXISTING REPORTS WITH DEFAULT VALUES
-- ===============================================
-- Add default values for new required fields in existing reports
UPDATE reports SET
    org_name = COALESCE(org_name, 'Legacy Organization ' || id),
    source_type = COALESCE(source_type, 'internal'),
    iteration = COALESCE(iteration, 1),
    scan_start_date = COALESCE(scan_start_date, CURRENT_DATE - INTERVAL '1 day'),
    scan_end_date = COALESCE(scan_end_date, CURRENT_DATE),
    tool_used = COALESCE(tool_used, 'Nessus'),
    test_location = COALESCE(test_location, 'On-site')
WHERE org_name IS NULL OR source_type IS NULL;

-- 2. CREATE REPORT_HOSTS FROM EXISTING VULNERABILITIES
-- ===============================================
-- Insert unique IP addresses from vulnerabilities into report_hosts
INSERT INTO report_hosts (report_id, ip_address, iteration, status)
SELECT DISTINCT 
    r.id as report_id,
    v.ip_address::inet,
    COALESCE(r.iteration, 1) as iteration,
    'Completed' as status
FROM reports r
JOIN vulnerabilities v ON true  -- We'll link them properly in next step
WHERE NOT EXISTS (
    SELECT 1 FROM report_hosts rh 
    WHERE rh.report_id = r.id AND rh.ip_address = v.ip_address::inet
)
AND v.report_id IS NULL;  -- Only for vulnerabilities not yet linked to reports

-- 3. LINK EXISTING VULNERABILITIES TO REPORTS AND HOSTS
-- ===============================================
-- Update vulnerabilities to link with reports (if not already linked)
-- This assumes each vulnerability belongs to the first available report
-- You may need to adjust this logic based on your data
UPDATE vulnerabilities 
SET report_id = (
    SELECT id FROM reports 
    ORDER BY created_at DESC 
    LIMIT 1
)
WHERE report_id IS NULL;

-- Update vulnerabilities to link with report_hosts
UPDATE vulnerabilities v
SET host_id = rh.id
FROM report_hosts rh
WHERE v.ip_address::inet = rh.ip_address 
AND v.report_id = rh.report_id
AND v.host_id IS NULL;

-- 4. UPDATE VULNERABILITY NAMES AND MISSING FIELDS
-- ===============================================
-- Copy plugin_name to vuln_name if vuln_name is empty
UPDATE vulnerabilities 
SET vuln_name = COALESCE(vuln_name, plugin_name, 'Unknown Vulnerability')
WHERE vuln_name IS NULL OR vuln_name = '';

-- Set iteration for existing vulnerabilities
UPDATE vulnerabilities v
SET iteration = r.iteration
FROM reports r
WHERE v.report_id = r.id AND v.iteration IS NULL;

-- 5. CALCULATE AND UPDATE AGGREGATION COUNTS
-- ===============================================
-- Update report aggregation counts
UPDATE reports r SET
    total_vulnerabilities = (
        SELECT COUNT(*) FROM vulnerabilities v WHERE v.report_id = r.id
    ),
    critical_count = (
        SELECT COUNT(*) FROM vulnerabilities v WHERE v.report_id = r.id AND v.severity = 'critical'
    ),
    high_count = (
        SELECT COUNT(*) FROM vulnerabilities v WHERE v.report_id = r.id AND v.severity = 'high'
    ),
    medium_count = (
        SELECT COUNT(*) FROM vulnerabilities v WHERE v.report_id = r.id AND v.severity = 'medium'
    ),
    low_count = (
        SELECT COUNT(*) FROM vulnerabilities v WHERE v.report_id = r.id AND v.severity = 'low'
    ),
    info_count = (
        SELECT COUNT(*) FROM vulnerabilities v WHERE v.report_id = r.id AND v.severity = 'info'
    ),
    zero_day_count = (
        SELECT COUNT(*) FROM vulnerabilities v WHERE v.report_id = r.id AND v.is_zero_day = true
    ),
    number_of_ips = (
        SELECT COUNT(DISTINCT v.ip_address) FROM vulnerabilities v WHERE v.report_id = r.id
    );

-- Update report_hosts aggregation counts
UPDATE report_hosts rh SET
    critical_count = (
        SELECT COUNT(*) FROM vulnerabilities v WHERE v.host_id = rh.id AND v.severity = 'critical'
    ),
    high_count = (
        SELECT COUNT(*) FROM vulnerabilities v WHERE v.host_id = rh.id AND v.severity = 'high'
    ),
    medium_count = (
        SELECT COUNT(*) FROM vulnerabilities v WHERE v.host_id = rh.id AND v.severity = 'medium'
    ),
    low_count = (
        SELECT COUNT(*) FROM vulnerabilities v WHERE v.host_id = rh.id AND v.severity = 'low'
    ),
    info_count = (
        SELECT COUNT(*) FROM vulnerabilities v WHERE v.host_id = rh.id AND v.severity = 'info'
    ),
    total_count = (
        SELECT COUNT(*) FROM vulnerabilities v WHERE v.host_id = rh.id
    ),
    zero_day_count = (
        SELECT COUNT(*) FROM vulnerabilities v WHERE v.host_id = rh.id AND v.is_zero_day = true
    );

-- 6. CREATE ORGANIZATIONS FROM EXISTING REPORTS
-- ===============================================
-- Insert organizations from existing reports
INSERT INTO organizations (name, total_reports, last_scan_date)
SELECT 
    r.org_name,
    COUNT(*) as total_reports,
    MAX(r.scan_end_date) as last_scan_date
FROM reports r
WHERE r.org_name IS NOT NULL
GROUP BY r.org_name
ON CONFLICT (name) DO UPDATE SET
    total_reports = EXCLUDED.total_reports,
    last_scan_date = EXCLUDED.last_scan_date;

-- 7. VALIDATION QUERIES
-- ===============================================
-- Check data integrity after migration
SELECT 
    'Migration Summary' as info,
    (SELECT COUNT(*) FROM reports) as total_reports,
    (SELECT COUNT(*) FROM report_hosts) as total_hosts,
    (SELECT COUNT(*) FROM vulnerabilities) as total_vulnerabilities,
    (SELECT COUNT(*) FROM organizations) as total_organizations,
    (SELECT COUNT(*) FROM vulnerabilities WHERE report_id IS NULL) as unlinked_vulnerabilities,
    (SELECT COUNT(*) FROM vulnerabilities WHERE host_id IS NULL) as unlinked_hosts;

-- Show sample data to verify
SELECT 'Sample Report Data' as info;
SELECT id, org_name, source_type, iteration, total_vulnerabilities, number_of_ips 
FROM reports 
LIMIT 3;

SELECT 'Sample Host Data' as info;
SELECT rh.ip_address, rh.total_count, r.org_name
FROM report_hosts rh
JOIN reports r ON rh.report_id = r.id
LIMIT 3;

-- Data migration completed successfully
SELECT 'Data migration completed successfully!' as status;
