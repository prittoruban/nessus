-- =====================================================
-- NESSUS VA REPORT PORTAL - COMPLETE DATABASE SCHEMA
-- =====================================================
-- This schema supports all report sections and functionality
-- Run this in Supabase SQL Editor

-- Enable Row Level Security
-- Note: JWT secret is configured at the service level in Supabase
-- ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- =====================================================
-- 1. ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('internal', 'external')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. REPORTS TABLE (Main Report Header)
-- =====================================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    org_name VARCHAR(255) NOT NULL, -- Denormalized for easy access
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('internal', 'external')),
    
    -- Scan metadata
    scan_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    scan_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Report metadata
    version VARCHAR(10) DEFAULT '1.0',
    document_type VARCHAR(100) DEFAULT 'Vulnerability Assessment Report',
    
    -- Signature information
    assessee VARCHAR(255),
    assessor VARCHAR(255),
    reviewer VARCHAR(255),
    approver VARCHAR(255),
    created_by VARCHAR(255),
    
    -- File information
    original_filename VARCHAR(255),
    file_size INTEGER,
    
    -- Cached summary data for quick access
    total_ips_tested INTEGER DEFAULT 0,
    total_vulnerabilities INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    info_count INTEGER DEFAULT 0,
    zero_day_count INTEGER DEFAULT 0,
    
    -- Iteration tracking
    iteration_number INTEGER DEFAULT 1,
    previous_report_id UUID REFERENCES reports(id),
    
    -- Status and timestamps
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. REPORT_HOSTS TABLE (IPs scanned per report)
-- =====================================================
CREATE TABLE IF NOT EXISTS report_hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    hostname VARCHAR(255),
    scan_status VARCHAR(20) DEFAULT 'completed' CHECK (scan_status IN ('completed', 'failed', 'timeout', 'unreachable')),
    
    -- Host-level summary counts
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    info_count INTEGER DEFAULT 0,
    total_vulnerabilities INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique IP per report
    UNIQUE(report_id, ip_address)
);

-- =====================================================
-- 4. VULNERABILITIES TABLE (All CVE details)
-- =====================================================
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES report_hosts(id) ON DELETE CASCADE,
    host_ip INET NOT NULL, -- Denormalized for easy querying
    
    -- Vulnerability identification
    cve_id VARCHAR(50),
    plugin_id VARCHAR(50),
    vulnerability_name TEXT NOT NULL,
    
    -- Risk assessment
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'informational')),
    cvss_score DECIMAL(3,1),
    cvss_vector TEXT,
    
    -- Vulnerability details
    description TEXT,
    solution TEXT,
    fix_recommendation TEXT,
    
    -- Additional metadata
    port INTEGER,
    protocol VARCHAR(10),
    service VARCHAR(100),
    
    -- Special flags
    is_zero_day BOOLEAN DEFAULT FALSE,
    is_exploitable BOOLEAN DEFAULT FALSE,
    
    -- References and external info
    "references" TEXT[], -- Array of reference URLs
    plugin_family VARCHAR(100),
    plugin_output TEXT,
    
    -- Timestamps
    first_found TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. REPORT_COMPARISONS TABLE (Track iteration changes)
-- =====================================================
CREATE TABLE IF NOT EXISTS report_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    current_report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    previous_report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Summary of changes
    new_vulnerabilities INTEGER DEFAULT 0,
    fixed_vulnerabilities INTEGER DEFAULT 0,
    persistent_vulnerabilities INTEGER DEFAULT 0,
    
    -- Risk level changes
    critical_delta INTEGER DEFAULT 0,
    high_delta INTEGER DEFAULT 0,
    medium_delta INTEGER DEFAULT 0,
    low_delta INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique comparison
    UNIQUE(current_report_id, previous_report_id)
);

-- =====================================================
-- 6. AUDIT_LOG TABLE (Track all actions)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_source_type ON organizations(source_type);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_org_id ON reports(org_id);
CREATE INDEX IF NOT EXISTS idx_reports_source_type ON reports(source_type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_org_source ON reports(org_id, source_type);

-- Report hosts indexes
CREATE INDEX IF NOT EXISTS idx_report_hosts_report_id ON report_hosts(report_id);
CREATE INDEX IF NOT EXISTS idx_report_hosts_ip ON report_hosts(ip_address);

-- Vulnerabilities indexes
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_report_id ON vulnerabilities(report_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_host_id ON vulnerabilities(host_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_cve_id ON vulnerabilities(cve_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_zero_day ON vulnerabilities(is_zero_day) WHERE is_zero_day = TRUE;
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_host_severity ON vulnerabilities(host_ip, severity);

-- Report comparisons indexes
CREATE INDEX IF NOT EXISTS idx_report_comparisons_current ON report_comparisons(current_report_id);
CREATE INDEX IF NOT EXISTS idx_report_comparisons_org ON report_comparisons(org_id);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for reports table
CREATE TRIGGER update_reports_updated_at 
    BEFORE UPDATE ON reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update report summary counts
CREATE OR REPLACE FUNCTION update_report_summary_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update report-level counts when vulnerabilities change
    UPDATE reports SET
        total_vulnerabilities = (
            SELECT COUNT(*) FROM vulnerabilities WHERE report_id = COALESCE(NEW.report_id, OLD.report_id)
        ),
        critical_count = (
            SELECT COUNT(*) FROM vulnerabilities 
            WHERE report_id = COALESCE(NEW.report_id, OLD.report_id) AND severity = 'critical'
        ),
        high_count = (
            SELECT COUNT(*) FROM vulnerabilities 
            WHERE report_id = COALESCE(NEW.report_id, OLD.report_id) AND severity = 'high'
        ),
        medium_count = (
            SELECT COUNT(*) FROM vulnerabilities 
            WHERE report_id = COALESCE(NEW.report_id, OLD.report_id) AND severity = 'medium'
        ),
        low_count = (
            SELECT COUNT(*) FROM vulnerabilities 
            WHERE report_id = COALESCE(NEW.report_id, OLD.report_id) AND severity = 'low'
        ),
        info_count = (
            SELECT COUNT(*) FROM vulnerabilities 
            WHERE report_id = COALESCE(NEW.report_id, OLD.report_id) AND severity = 'informational'
        ),
        zero_day_count = (
            SELECT COUNT(*) FROM vulnerabilities 
            WHERE report_id = COALESCE(NEW.report_id, OLD.report_id) AND is_zero_day = TRUE
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.report_id, OLD.report_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger for vulnerability changes
CREATE TRIGGER update_report_counts_on_vulnerability_change
    AFTER INSERT OR UPDATE OR DELETE ON vulnerabilities
    FOR EACH ROW
    EXECUTE FUNCTION update_report_summary_counts();

-- Function to update host summary counts
CREATE OR REPLACE FUNCTION update_host_summary_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update host-level counts when vulnerabilities change
    UPDATE report_hosts SET
        total_vulnerabilities = (
            SELECT COUNT(*) FROM vulnerabilities WHERE host_id = COALESCE(NEW.host_id, OLD.host_id)
        ),
        critical_count = (
            SELECT COUNT(*) FROM vulnerabilities 
            WHERE host_id = COALESCE(NEW.host_id, OLD.host_id) AND severity = 'critical'
        ),
        high_count = (
            SELECT COUNT(*) FROM vulnerabilities 
            WHERE host_id = COALESCE(NEW.host_id, OLD.host_id) AND severity = 'high'
        ),
        medium_count = (
            SELECT COUNT(*) FROM vulnerabilities 
            WHERE host_id = COALESCE(NEW.host_id, OLD.host_id) AND severity = 'medium'
        ),
        low_count = (
            SELECT COUNT(*) FROM vulnerabilities 
            WHERE host_id = COALESCE(NEW.host_id, OLD.host_id) AND severity = 'low'
        ),
        info_count = (
            SELECT COUNT(*) FROM vulnerabilities 
            WHERE host_id = COALESCE(NEW.host_id, OLD.host_id) AND severity = 'informational'
        )
    WHERE id = COALESCE(NEW.host_id, OLD.host_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger for host summary updates
CREATE TRIGGER update_host_counts_on_vulnerability_change
    AFTER INSERT OR UPDATE OR DELETE ON vulnerabilities
    FOR EACH ROW
    EXECUTE FUNCTION update_host_summary_counts();

-- Function to update total IPs tested in reports
CREATE OR REPLACE FUNCTION update_total_ips_tested()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE reports SET
        total_ips_tested = (
            SELECT COUNT(*) FROM report_hosts WHERE report_id = COALESCE(NEW.report_id, OLD.report_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.report_id, OLD.report_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger for IP count updates
CREATE TRIGGER update_ips_tested_on_host_change
    AFTER INSERT OR UPDATE OR DELETE ON report_hosts
    FOR EACH ROW
    EXECUTE FUNCTION update_total_ips_tested();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized based on your auth requirements)
-- For now, allowing all authenticated users to access all data
-- You can modify these based on your specific access control needs

CREATE POLICY "Allow all for authenticated users" ON organizations
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON reports
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON report_hosts
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON vulnerabilities
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON report_comparisons
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON audit_log
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample organizations
INSERT INTO organizations (name, source_type) VALUES
    ('HTC Global Services', 'internal'),
    ('ABC Corporation', 'external'),
    ('XYZ Limited', 'internal'),
    ('Tech Solutions Inc', 'external')
ON CONFLICT DO NOTHING;

-- =====================================================
-- USEFUL VIEWS FOR REPORTING
-- =====================================================

-- View for report overview with organization details
CREATE OR REPLACE VIEW report_overview AS
SELECT 
    r.id,
    r.org_name,
    r.source_type,
    r.scan_start_date,
    r.scan_end_date,
    r.total_ips_tested,
    r.total_vulnerabilities,
    r.critical_count,
    r.high_count,
    r.medium_count,
    r.low_count,
    r.info_count,
    r.zero_day_count,
    r.status,
    r.created_at,
    o.name as organization_name
FROM reports r
JOIN organizations o ON r.org_id = o.id;

-- View for host vulnerability summary
CREATE OR REPLACE VIEW host_vulnerability_summary AS
SELECT 
    rh.report_id,
    rh.ip_address,
    rh.hostname,
    rh.scan_status,
    rh.critical_count,
    rh.high_count,
    rh.medium_count,
    rh.low_count,
    rh.info_count,
    rh.total_vulnerabilities,
    r.org_name,
    r.source_type
FROM report_hosts rh
JOIN reports r ON rh.report_id = r.id;

-- View for vulnerability details with host info
CREATE OR REPLACE VIEW vulnerability_details AS
SELECT 
    v.id,
    v.cve_id,
    v.vulnerability_name,
    v.severity,
    v.cvss_score,
    v.description,
    v.solution,
    v.fix_recommendation,
    v.host_ip,
    v.port,
    v.protocol,
    v.service,
    v.is_zero_day,
    v.is_exploitable,
    rh.hostname,
    r.org_name,
    r.source_type,
    r.scan_start_date,
    r.scan_end_date
FROM vulnerabilities v
JOIN report_hosts rh ON v.host_id = rh.id
JOIN reports r ON v.report_id = r.id;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'NESSUS VA REPORT PORTAL SCHEMA CREATED!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Tables created: organizations, reports, report_hosts, vulnerabilities, report_comparisons, audit_log';
    RAISE NOTICE 'Indexes created for optimal performance';
    RAISE NOTICE 'Triggers created for automatic count updates';
    RAISE NOTICE 'Views created for easy reporting';
    RAISE NOTICE 'RLS enabled with basic policies';
    RAISE NOTICE 'Sample organizations inserted';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Ready to start building your Nessus VA Portal!';
    RAISE NOTICE '==============================================';
END $$;
