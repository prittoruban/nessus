-- ===============================================
-- COMPLETE NESSUS VULNERABILITY MANAGEMENT SCHEMA
-- File: complete_schema.sql
-- Description: Complete database schema for Nessus vulnerability management system
-- Version: 1.0
-- Date: July 21, 2025
-- ===============================================

-- ===============================================
-- 1. DROP ALL EXISTING TABLES (Clean Slate)
-- ===============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_aggregations ON vulnerabilities;
DROP TRIGGER IF EXISTS trigger_update_organization_stats ON reports;
DROP TRIGGER IF EXISTS trigger_vulnerabilities_report_stats ON vulnerabilities;
DROP TRIGGER IF EXISTS update_vulnerabilities_updated_at ON vulnerabilities;
DROP TRIGGER IF EXISTS update_report_hosts_updated_at ON report_hosts;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;

-- Drop views
DROP VIEW IF EXISTS executive_report_view;
DROP VIEW IF EXISTS host_summary_view;
DROP VIEW IF EXISTS vulnerability_detail_view;

-- Drop functions
DROP FUNCTION IF EXISTS update_report_aggregations();
DROP FUNCTION IF EXISTS update_organization_stats();
DROP FUNCTION IF EXISTS trigger_update_report_stats();
DROP FUNCTION IF EXISTS update_report_stats(UUID);
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS get_cvss_description(DECIMAL);
DROP FUNCTION IF EXISTS generate_pdf_filename(TEXT, DATE);

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS scan_configurations CASCADE;
DROP TABLE IF EXISTS vulnerabilities CASCADE;
DROP TABLE IF EXISTS report_hosts CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS cve_database CASCADE;

-- ===============================================
-- 2. CREATE CORE TABLES
-- ===============================================

-- Organizations Table
CREATE TABLE organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    industry VARCHAR(100),
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    total_reports INTEGER DEFAULT 0,
    last_scan_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports Table (Main report metadata)
CREATE TABLE reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Organization & Report Details
    org_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(20) CHECK (source_type IN ('internal', 'external')) DEFAULT 'internal',
    iteration INTEGER DEFAULT 1,
    
    -- Report Metadata
    name TEXT NOT NULL,
    description TEXT,
    document_type VARCHAR(100) DEFAULT 'Vulnerability Assessment Report',
    version VARCHAR(10) DEFAULT '1.0',
    
    -- Personnel
    assessee VARCHAR(255),
    assessor VARCHAR(255),
    reviewer VARCHAR(255),
    approver VARCHAR(255),
    conducted_by TEXT,
    created_by TEXT,
    
    -- Scan Details
    scan_start_date DATE,
    scan_end_date DATE,
    test_location VARCHAR(100) DEFAULT 'On-site',
    tool_used VARCHAR(50) DEFAULT 'Nessus',
    scan_description TEXT DEFAULT 'Network Vulnerability Assessment',
    
    -- File Upload Details
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size >= 0),
    
    -- Calculated Aggregations (Auto-updated by triggers)
    number_of_ips INTEGER DEFAULT 0,
    total_vulnerabilities INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    info_count INTEGER DEFAULT 0,
    zero_day_count INTEGER DEFAULT 0,
    
    -- Report Content
    methodology TEXT,
    project_scope_notes TEXT,
    conclusion TEXT,
    
    -- Executive Report Specific
    confidentiality_level VARCHAR(20) DEFAULT 'Internal',
    legal_disclaimer TEXT DEFAULT 'This document contains confidential and proprietary information.',
    pdf_generated_at TIMESTAMP WITH TIME ZONE,
    pdf_file_path TEXT,
    
    -- Status & Timestamps
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for organization iterations
    UNIQUE(org_name, source_type, iteration)
);

-- Report Hosts Table (Individual IP addresses per report)
CREATE TABLE report_hosts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    hostname VARCHAR(255),
    status VARCHAR(20) DEFAULT 'Completed' CHECK (status IN ('Completed', 'Failed', 'Partial')),
    iteration INTEGER NOT NULL DEFAULT 1,
    
    -- Per-host vulnerability counts (Auto-updated by triggers)
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    info_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    zero_day_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(report_id, ip_address)
);

-- Vulnerabilities Table (Individual vulnerability findings)
CREATE TABLE vulnerabilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relationships
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    host_id UUID REFERENCES report_hosts(id) ON DELETE CASCADE,
    
    -- Vulnerability Identification
    cve VARCHAR(50) DEFAULT 'N/A',
    plugin_id VARCHAR(50),
    plugin_name TEXT,
    vuln_name TEXT NOT NULL,
    
    -- Risk Assessment
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    cvss_score DECIMAL(3,1) CHECK (cvss_score >= 0.0 AND cvss_score <= 10.0),
    risk_priority VARCHAR(5) CHECK (risk_priority IN ('P1', 'P2', 'P3', 'P4', 'P5')),
    
    -- Technical Details
    description TEXT,
    solution TEXT,
    synopsis TEXT,
    
    -- Host Information
    ip_address INET NOT NULL,
    port INTEGER CHECK (port >= 0 AND port <= 65535),
    protocol VARCHAR(10) CHECK (protocol IN ('TCP', 'UDP')),
    service_name VARCHAR(100),
    
    -- Classification
    is_zero_day BOOLEAN DEFAULT FALSE,
    exploitability VARCHAR(20) CHECK (exploitability IN ('Easy', 'Moderate', 'Difficult')),
    
    -- Iteration tracking
    iteration INTEGER DEFAULT 1,
    
    -- Timestamps
    first_detected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CVE Database Table (Reference data for CVEs)
CREATE TABLE cve_database (
    cve_id VARCHAR(50) PRIMARY KEY,
    cvss_v3_score DECIMAL(3,1) CHECK (cvss_v3_score >= 0.0 AND cvss_v3_score <= 10.0),
    cvss_v2_score DECIMAL(3,1) CHECK (cvss_v2_score >= 0.0 AND cvss_v2_score <= 10.0),
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    description TEXT,
    published_date DATE,
    modified_date DATE,
    is_zero_day BOOLEAN DEFAULT FALSE,
    exploitability VARCHAR(20) CHECK (exploitability IN ('Easy', 'Moderate', 'Difficult')),
    reference_links TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scan Configurations Table (Scan settings per report)
CREATE TABLE scan_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    scan_type VARCHAR(50),
    scan_policy VARCHAR(100),
    credentials_used BOOLEAN DEFAULT FALSE,
    included_networks TEXT,
    excluded_networks TEXT,
    port_ranges TEXT,
    max_hosts INTEGER,
    max_checks INTEGER,
    timeout_settings TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ===============================================

-- Organizations indexes
CREATE INDEX idx_organizations_name ON organizations(name);
CREATE INDEX idx_organizations_last_scan ON organizations(last_scan_date DESC);

-- Reports indexes
CREATE INDEX idx_reports_org_name ON reports(org_name);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_upload_date ON reports(upload_date DESC);
CREATE INDEX idx_reports_scan_dates ON reports(scan_start_date, scan_end_date);
CREATE INDEX idx_reports_source_iteration ON reports(org_name, source_type, iteration);

-- Report Hosts indexes
CREATE INDEX idx_report_hosts_report_id ON report_hosts(report_id);
CREATE INDEX idx_report_hosts_ip ON report_hosts(ip_address);
CREATE INDEX idx_report_hosts_iteration ON report_hosts(iteration);
CREATE INDEX idx_report_hosts_report_ip ON report_hosts(report_id, ip_address);

-- Vulnerabilities indexes
CREATE INDEX idx_vulnerabilities_report_id ON vulnerabilities(report_id);
CREATE INDEX idx_vulnerabilities_host_id ON vulnerabilities(host_id);
CREATE INDEX idx_vulnerabilities_ip_address ON vulnerabilities(ip_address);
CREATE INDEX idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX idx_vulnerabilities_cvss_score ON vulnerabilities(cvss_score DESC);
CREATE INDEX idx_vulnerabilities_zero_day ON vulnerabilities(is_zero_day) WHERE is_zero_day = true;
CREATE INDEX idx_vulnerabilities_cve ON vulnerabilities(cve);
CREATE INDEX idx_vulnerabilities_plugin_id ON vulnerabilities(plugin_id);
CREATE INDEX idx_vulnerabilities_iteration ON vulnerabilities(iteration);
CREATE INDEX idx_vulnerabilities_report_iteration ON vulnerabilities(report_id, iteration);
CREATE INDEX idx_vulnerabilities_severity_priority ON vulnerabilities(report_id, severity);
CREATE INDEX idx_vulnerabilities_created_at ON vulnerabilities(created_at DESC);

-- CVE Database indexes
CREATE INDEX idx_cve_database_severity ON cve_database(severity);
CREATE INDEX idx_cve_database_cvss_v3 ON cve_database(cvss_v3_score DESC);
CREATE INDEX idx_cve_database_zero_day ON cve_database(is_zero_day) WHERE is_zero_day = true;
CREATE INDEX idx_cve_database_published ON cve_database(published_date DESC);

-- Scan Configurations indexes
CREATE INDEX idx_scan_configurations_report_id ON scan_configurations(report_id);

-- ===============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ===============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE cve_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_configurations ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- 5. CREATE RLS POLICIES (Allow all for demo)
-- ===============================================

-- Organizations policies
CREATE POLICY "Allow all operations on organizations" ON organizations FOR ALL USING (true) WITH CHECK (true);

-- Reports policies
CREATE POLICY "Allow all operations on reports" ON reports FOR ALL USING (true) WITH CHECK (true);

-- Report Hosts policies
CREATE POLICY "Allow all operations on report_hosts" ON report_hosts FOR ALL USING (true) WITH CHECK (true);

-- Vulnerabilities policies
CREATE POLICY "Allow all operations on vulnerabilities" ON vulnerabilities FOR ALL USING (true) WITH CHECK (true);

-- CVE Database policies
CREATE POLICY "Allow all operations on cve_database" ON cve_database FOR ALL USING (true) WITH CHECK (true);

-- Scan Configurations policies
CREATE POLICY "Allow all operations on scan_configurations" ON scan_configurations FOR ALL USING (true) WITH CHECK (true);

-- ===============================================
-- 6. CREATE UTILITY FUNCTIONS
-- ===============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get CVSS score description
CREATE OR REPLACE FUNCTION get_cvss_description(score DECIMAL)
RETURNS TEXT AS $$
BEGIN
    IF score IS NULL THEN
        RETURN 'Not Available';
    ELSIF score >= 9.0 THEN
        RETURN 'Full system compromise, data exfiltration possible';
    ELSIF score >= 7.0 THEN
        RETURN 'Major security flaws risking unauthorized access';
    ELSIF score >= 4.0 THEN
        RETURN 'Security flaws that need chaining to become exploitable';
    ELSIF score >= 0.1 THEN
        RETURN 'Minor misconfigurations or indirect security threats';
    ELSE
        RETURN 'Informational findings with no direct security impact';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to generate PDF filename
CREATE OR REPLACE FUNCTION generate_pdf_filename(org_name TEXT, scan_date DATE)
RETURNS TEXT AS $$
BEGIN
    RETURN regexp_replace(org_name, '[^A-Za-z0-9]', '_', 'g') || 
           '_VA_Report_' || 
           TO_CHAR(COALESCE(scan_date, CURRENT_DATE), 'MM_YYYY') || 
           '.pdf';
END;
$$ LANGUAGE plpgsql;

-- Function to update report aggregations
CREATE OR REPLACE FUNCTION update_report_aggregations()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle DELETE operations
    IF TG_OP = 'DELETE' THEN
        -- Update report counts
        UPDATE reports SET
            total_vulnerabilities = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = OLD.report_id),
            critical_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = OLD.report_id AND severity = 'critical'),
            high_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = OLD.report_id AND severity = 'high'),
            medium_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = OLD.report_id AND severity = 'medium'),
            low_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = OLD.report_id AND severity = 'low'),
            info_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = OLD.report_id AND severity = 'info'),
            zero_day_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = OLD.report_id AND is_zero_day = TRUE),
            number_of_ips = (SELECT COUNT(DISTINCT ip_address) FROM vulnerabilities WHERE report_id = OLD.report_id),
            updated_at = NOW()
        WHERE id = OLD.report_id;
        
        -- Update host counts if host_id exists
        IF OLD.host_id IS NOT NULL THEN
            UPDATE report_hosts SET
                critical_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = OLD.host_id AND severity = 'critical'),
                high_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = OLD.host_id AND severity = 'high'),
                medium_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = OLD.host_id AND severity = 'medium'),
                low_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = OLD.host_id AND severity = 'low'),
                info_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = OLD.host_id AND severity = 'info'),
                total_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = OLD.host_id),
                zero_day_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = OLD.host_id AND is_zero_day = TRUE),
                updated_at = NOW()
            WHERE id = OLD.host_id;
        END IF;
        
        RETURN OLD;
    ELSE
        -- Handle INSERT and UPDATE operations
        UPDATE reports SET
            total_vulnerabilities = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = NEW.report_id),
            critical_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = NEW.report_id AND severity = 'critical'),
            high_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = NEW.report_id AND severity = 'high'),
            medium_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = NEW.report_id AND severity = 'medium'),
            low_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = NEW.report_id AND severity = 'low'),
            info_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = NEW.report_id AND severity = 'info'),
            zero_day_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = NEW.report_id AND is_zero_day = TRUE),
            number_of_ips = (SELECT COUNT(DISTINCT ip_address) FROM vulnerabilities WHERE report_id = NEW.report_id),
            updated_at = NOW()
        WHERE id = NEW.report_id;
        
        -- Update host counts if host_id exists
        IF NEW.host_id IS NOT NULL THEN
            UPDATE report_hosts SET
                critical_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = NEW.host_id AND severity = 'critical'),
                high_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = NEW.host_id AND severity = 'high'),
                medium_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = NEW.host_id AND severity = 'medium'),
                low_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = NEW.host_id AND severity = 'low'),
                info_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = NEW.host_id AND severity = 'info'),
                total_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = NEW.host_id),
                zero_day_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = NEW.host_id AND is_zero_day = TRUE),
                updated_at = NOW()
            WHERE id = NEW.host_id;
        END IF;
        
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update organization stats
CREATE OR REPLACE FUNCTION update_organization_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- Update organization stats for deleted report
        UPDATE organizations SET
            total_reports = (SELECT COUNT(*) FROM reports WHERE org_name = OLD.org_name),
            last_scan_date = (SELECT MAX(scan_end_date) FROM reports WHERE org_name = OLD.org_name),
            updated_at = NOW()
        WHERE name = OLD.org_name;
        RETURN OLD;
    ELSE
        -- Insert organization if it doesn't exist
        INSERT INTO organizations (name) 
        VALUES (NEW.org_name) 
        ON CONFLICT (name) DO NOTHING;
        
        -- Update organization stats for new/updated report
        UPDATE organizations SET
            total_reports = (SELECT COUNT(*) FROM reports WHERE org_name = NEW.org_name),
            last_scan_date = (SELECT MAX(scan_end_date) FROM reports WHERE org_name = NEW.org_name),
            updated_at = NOW()
        WHERE name = NEW.org_name;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 7. CREATE TRIGGERS
-- ===============================================

-- Updated_at triggers
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at 
    BEFORE UPDATE ON reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_hosts_updated_at 
    BEFORE UPDATE ON report_hosts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vulnerabilities_updated_at 
    BEFORE UPDATE ON vulnerabilities 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cve_database_updated_at 
    BEFORE UPDATE ON cve_database 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Aggregation triggers
CREATE TRIGGER trigger_update_aggregations
    AFTER INSERT OR UPDATE OR DELETE ON vulnerabilities
    FOR EACH ROW 
    EXECUTE FUNCTION update_report_aggregations();

CREATE TRIGGER trigger_update_organization_stats
    AFTER INSERT OR UPDATE OR DELETE ON reports
    FOR EACH ROW 
    EXECUTE FUNCTION update_organization_stats();

-- ===============================================
-- 8. CREATE EXECUTIVE REPORT VIEWS
-- ===============================================

-- Executive Report View (Optimized for report generation)
CREATE OR REPLACE VIEW executive_report_view AS
SELECT 
    r.id,
    r.org_name,
    r.name as report_name,
    r.version,
    r.document_type,
    r.scan_start_date,
    r.scan_end_date,
    r.assessee,
    r.assessor,
    r.reviewer,
    r.approver,
    r.created_by,
    r.test_location,
    r.tool_used,
    r.scan_description,
    r.number_of_ips,
    r.total_vulnerabilities,
    r.critical_count,
    r.high_count,
    r.medium_count,
    r.low_count,
    r.info_count,
    r.zero_day_count,
    r.methodology,
    r.project_scope_notes,
    r.conclusion,
    r.confidentiality_level,
    r.legal_disclaimer,
    r.created_at,
    
    -- Calculated fields
    CASE 
        WHEN r.scan_start_date IS NOT NULL AND r.scan_end_date IS NOT NULL 
        THEN (r.scan_end_date::date - r.scan_start_date::date) + 1
        ELSE 1
    END as scan_duration_days,
    
    -- Formatted dates
    TO_CHAR(r.scan_start_date, 'DD/MM/YYYY') as formatted_start_date,
    TO_CHAR(r.scan_end_date, 'DD/MM/YYYY') as formatted_end_date,
    TO_CHAR(r.created_at, 'Month YYYY') as report_month_year,
    
    -- PDF filename
    generate_pdf_filename(r.org_name, r.scan_end_date) as suggested_pdf_filename
FROM reports r
WHERE r.status = 'completed';

-- Host Summary View (For Section 6: Summary of Vulnerable Hosts)
CREATE OR REPLACE VIEW host_summary_view AS
SELECT 
    rh.report_id,
    rh.ip_address,
    rh.hostname,
    rh.status,
    rh.critical_count,
    rh.high_count,
    rh.medium_count,
    rh.low_count,
    rh.info_count,
    rh.total_count,
    rh.zero_day_count,
    ROW_NUMBER() OVER (PARTITION BY rh.report_id ORDER BY rh.ip_address) as host_number
FROM report_hosts rh
ORDER BY rh.report_id, rh.ip_address;

-- Vulnerability Detail View (For Sections 8 & 9: Zero-day and All Vulnerabilities)
CREATE OR REPLACE VIEW vulnerability_detail_view AS
SELECT 
    v.report_id,
    v.ip_address,
    v.cve,
    v.severity,
    v.cvss_score,
    v.vuln_name,
    v.solution,
    v.is_zero_day,
    v.description,
    v.synopsis,
    v.port,
    v.protocol,
    v.service_name,
    
    -- Risk priority mapping
    CASE 
        WHEN v.severity = 'critical' THEN 'P1'
        WHEN v.severity = 'high' THEN 'P2'
        WHEN v.severity = 'medium' THEN 'P3'
        WHEN v.severity = 'low' THEN 'P4'
        WHEN v.severity = 'info' THEN 'P5'
        ELSE 'P5'
    END as risk_priority,
    
    -- Format CVE for display
    COALESCE(NULLIF(v.cve, ''), 'N/A') as display_cve,
    
    -- Serial number for report ordering
    ROW_NUMBER() OVER (
        PARTITION BY v.report_id 
        ORDER BY 
            CASE v.severity 
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
                WHEN 'info' THEN 5
                ELSE 6
            END,
            v.ip_address,
            v.vuln_name
    ) as serial_number
FROM vulnerabilities v
WHERE v.report_id IS NOT NULL
ORDER BY v.report_id, serial_number;

-- ===============================================
-- 9. INSERT SAMPLE/REFERENCE DATA
-- ===============================================

-- Insert sample CVE reference data
INSERT INTO cve_database (cve_id, cvss_v3_score, severity, description, is_zero_day, exploitability) VALUES
('CVE-2025-22224', 9.8, 'critical', 'VMware ESXi 7.0 / 8.0 Multiple Vulnerabilities (VMSA-2025-0004)', true, 'Easy'),
('CVE-2025-22225', 9.8, 'critical', 'VMware ESXi 7.0 / 8.0 Multiple Vulnerabilities (VMSA-2025-0004)', true, 'Easy'),
('CVE-2025-22226', 9.8, 'critical', 'VMware ESXi 7.0 / 8.0 Multiple Vulnerabilities (VMSA-2025-0004)', true, 'Easy'),
('CVE-2013-3900', 5.0, 'medium', 'WinVerifyTrust Signature Validation CVE-2013-3900 Mitigation', false, 'Moderate'),
('CVE-2021-44228', 9.0, 'critical', 'Apache Log4j remote code execution vulnerability', false, 'Easy'),
('CVE-2021-34527', 8.8, 'high', 'Windows Print Spooler remote code execution vulnerability', false, 'Moderate'),
('CVE-2021-26855', 6.5, 'medium', 'Microsoft Exchange Server remote code execution vulnerability', false, 'Moderate'),
('CVE-2021-21972', 3.5, 'low', 'VMware vCenter Server remote code execution vulnerability', false, 'Difficult')
ON CONFLICT (cve_id) DO NOTHING;

-- ===============================================
-- 10. FINAL VERIFICATION
-- ===============================================

-- Verify all tables were created successfully
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('organizations', 'reports', 'report_hosts', 'vulnerabilities', 'cve_database', 'scan_configurations')
ORDER BY tablename;

-- Verify all views were created successfully
SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views 
WHERE schemaname = 'public' 
    AND viewname IN ('executive_report_view', 'host_summary_view', 'vulnerability_detail_view')
ORDER BY viewname;

-- Verify all functions were created successfully
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname IN ('update_updated_at_column', 'get_cvss_description', 'generate_pdf_filename', 'update_report_aggregations', 'update_organization_stats')
ORDER BY proname;

-- Success message
SELECT 'Nessus Vulnerability Management Schema created successfully!' as status,
       NOW() as created_at;
