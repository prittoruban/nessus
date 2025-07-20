-- ===============================================
-- VALIDATION SCRIPT
-- Migration: 05_validation_check.sql
-- Description: Validate the enhanced schema and data migration
-- ===============================================

-- 1. TABLE STRUCTURE VALIDATION
-- ===============================================
SELECT 'Schema Validation' as check_type;

-- Check if all tables exist
SELECT 
    'tables_exist' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') AND
             EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports') AND
             EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_hosts') AND
             EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vulnerabilities') AND
             EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cve_database') AND
             EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_configurations')
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as status;

-- Check if new columns exist in reports table
SELECT 
    'reports_new_columns' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'org_name') AND
             EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'source_type') AND
             EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'iteration') AND
             EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'assessor') AND
             EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'number_of_ips')
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as status;

-- Check if new columns exist in vulnerabilities table
SELECT 
    'vulnerabilities_new_columns' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vulnerabilities' AND column_name = 'report_id') AND
             EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vulnerabilities' AND column_name = 'host_id') AND
             EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vulnerabilities' AND column_name = 'solution') AND
             EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vulnerabilities' AND column_name = 'is_zero_day') AND
             EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vulnerabilities' AND column_name = 'iteration')
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as status;

-- 2. DATA INTEGRITY VALIDATION
-- ===============================================
SELECT 'Data Integrity Validation' as check_type;

-- Check for orphaned vulnerabilities (should be 0)
SELECT 
    'orphaned_vulnerabilities' as check_name,
    CASE 
        WHEN (SELECT COUNT(*) FROM vulnerabilities WHERE report_id IS NULL) = 0
        THEN 'PASS' 
        ELSE CONCAT('FAIL - ', (SELECT COUNT(*) FROM vulnerabilities WHERE report_id IS NULL), ' orphaned records')
    END as status;

-- Check for vulnerabilities without host links
SELECT 
    'vulnerabilities_without_hosts' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS'
        ELSE 'WARNING - Some vulnerabilities not linked to hosts'
    END as status
FROM vulnerabilities 
WHERE host_id IS NULL AND report_id IS NOT NULL;

-- Check report aggregation accuracy
SELECT 
    'report_aggregation_accuracy' as check_name,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS'
        ELSE CONCAT('FAIL - ', COUNT(*), ' reports with incorrect aggregations')
    END as status
FROM reports r
WHERE r.total_vulnerabilities != (SELECT COUNT(*) FROM vulnerabilities v WHERE v.report_id = r.id);

-- 3. FUNCTIONAL VALIDATION
-- ===============================================
SELECT 'Functional Validation' as check_type;

-- Check if triggers are working
SELECT 
    'aggregation_triggers' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_aggregations')
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as status;

-- Check foreign key constraints
SELECT 
    'foreign_key_constraints' as check_name,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.table_constraints 
              WHERE constraint_type = 'FOREIGN KEY' 
              AND table_name IN ('report_hosts', 'vulnerabilities', 'scan_configurations')) >= 3
        THEN 'PASS'
        ELSE 'FAIL'
    END as status;

-- 4. SAMPLE DATA OVERVIEW
-- ===============================================
SELECT 'Data Overview' as check_type;

-- Summary counts
SELECT 
    'data_summary' as check_name,
    (SELECT COUNT(*) FROM organizations) as organizations_count,
    (SELECT COUNT(*) FROM reports) as reports_count,
    (SELECT COUNT(*) FROM report_hosts) as hosts_count,
    (SELECT COUNT(*) FROM vulnerabilities) as vulnerabilities_count,
    (SELECT COUNT(*) FROM cve_database) as cve_records;

-- Sample organizations
SELECT 'Sample Organizations' as info;
SELECT name, total_reports, last_scan_date 
FROM organizations 
ORDER BY total_reports DESC 
LIMIT 5;

-- Sample reports with new fields
SELECT 'Sample Reports' as info;
SELECT 
    org_name,
    source_type,
    iteration,
    total_vulnerabilities,
    number_of_ips,
    scan_start_date,
    scan_end_date
FROM reports 
ORDER BY created_at DESC 
LIMIT 5;

-- Sample host aggregations
SELECT 'Sample Host Aggregations' as info;
SELECT 
    rh.ip_address,
    rh.critical_count,
    rh.high_count,
    rh.medium_count,
    rh.low_count,
    rh.total_count,
    r.org_name
FROM report_hosts rh
JOIN reports r ON rh.report_id = r.id
ORDER BY rh.total_count DESC
LIMIT 5;

-- Sample vulnerabilities with new fields
SELECT 'Sample Vulnerabilities' as info;
SELECT 
    v.ip_address,
    v.severity,
    v.vuln_name,
    v.is_zero_day,
    v.solution IS NOT NULL as has_solution,
    r.org_name
FROM vulnerabilities v
JOIN reports r ON v.report_id = r.id
ORDER BY 
    CASE v.severity 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
        ELSE 5 
    END
LIMIT 10;

-- 5. PERFORMANCE CHECK
-- ===============================================
SELECT 'Performance Check' as check_type;

-- Check indexes
SELECT 
    'required_indexes' as check_name,
    COUNT(*) as index_count,
    CASE 
        WHEN COUNT(*) >= 10 THEN 'PASS'
        ELSE 'WARNING - Some indexes may be missing'
    END as status
FROM pg_indexes 
WHERE tablename IN ('reports', 'report_hosts', 'vulnerabilities', 'organizations')
AND indexname LIKE 'idx_%';

-- Final validation summary
SELECT 'VALIDATION COMPLETE' as result,
       'Check all PASS/FAIL statuses above' as instruction;
