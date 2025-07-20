-- ===============================================
-- ENHANCED SCHEMA MIGRATION
-- Migration: 03_enhanced_schema_migration.sql
-- Description: Add new tables and fields for comprehensive vulnerability management
-- ===============================================

-- 1. CREATE ORGANIZATIONS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS organizations (
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

-- Enable RLS for organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organizations' 
        AND policyname = 'Allow all operations on organizations'
    ) THEN
        CREATE POLICY "Allow all operations on organizations" ON organizations FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 2. ADD NEW FIELDS TO REPORTS TABLE
-- ===============================================
ALTER TABLE reports ADD COLUMN IF NOT EXISTS org_name VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) CHECK (source_type IN ('internal', 'external'));
ALTER TABLE reports ADD COLUMN IF NOT EXISTS iteration INTEGER DEFAULT 1;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS document_type VARCHAR(100);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS version VARCHAR(10);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS assessee VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS assessor VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewer VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS approver VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS conducted_by TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS scan_start_date DATE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS scan_end_date DATE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS test_location VARCHAR(100);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS tool_used VARCHAR(50);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS scan_description TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS number_of_ips INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS zero_day_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS methodology TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS project_scope_notes TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS conclusion TEXT;

-- Add unique constraint for org iterations (ignore if already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_org_iteration' 
        AND table_name = 'reports'
    ) THEN
        ALTER TABLE reports ADD CONSTRAINT unique_org_iteration UNIQUE(org_name, source_type, iteration);
    END IF;
END $$;

-- 3. CREATE REPORT_HOSTS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS report_hosts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    hostname VARCHAR(255),
    status VARCHAR(20) DEFAULT 'Completed' CHECK (status IN ('Completed', 'Failed', 'Partial')),
    iteration INTEGER NOT NULL,
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

-- Create indexes for report_hosts
CREATE INDEX IF NOT EXISTS idx_report_hosts_ip ON report_hosts(ip_address);
CREATE INDEX IF NOT EXISTS idx_report_hosts_iteration ON report_hosts(iteration);
CREATE INDEX IF NOT EXISTS idx_report_hosts_report_id ON report_hosts(report_id);

-- Enable RLS for report_hosts
ALTER TABLE report_hosts ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'report_hosts' 
        AND policyname = 'Allow all operations on report_hosts'
    ) THEN
        CREATE POLICY "Allow all operations on report_hosts" ON report_hosts FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. ADD NEW FIELDS TO VULNERABILITIES TABLE
-- ===============================================
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES reports(id) ON DELETE CASCADE;
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES report_hosts(id) ON DELETE CASCADE;
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS plugin_id VARCHAR(50);
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS vuln_name TEXT;
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS cvss_score DECIMAL(3,1);
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS risk_priority VARCHAR(5);
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS solution TEXT;
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS synopsis TEXT;
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS port INTEGER;
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS protocol VARCHAR(10);
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS service_name VARCHAR(100);
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS is_zero_day BOOLEAN DEFAULT FALSE;
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS exploitability VARCHAR(20);
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS iteration INTEGER DEFAULT 1;
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS first_detected TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create additional indexes for vulnerabilities
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_report_id ON vulnerabilities(report_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_host_id ON vulnerabilities(host_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_plugin_id ON vulnerabilities(plugin_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_cvss_score ON vulnerabilities(cvss_score);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_zero_day ON vulnerabilities(is_zero_day);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_iteration ON vulnerabilities(iteration);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_report_iteration ON vulnerabilities(report_id, iteration);

-- 5. CREATE CVE_DATABASE TABLE (Reference Data)
-- ===============================================
CREATE TABLE IF NOT EXISTS cve_database (
    cve_id VARCHAR(50) PRIMARY KEY,
    cvss_v3_score DECIMAL(3,1),
    cvss_v2_score DECIMAL(3,1),
    severity VARCHAR(20),
    description TEXT,
    published_date DATE,
    modified_date DATE,
    is_zero_day BOOLEAN DEFAULT FALSE,
    exploitability VARCHAR(20),
    reference_links TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for cve_database
ALTER TABLE cve_database ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cve_database' 
        AND policyname = 'Allow all operations on cve_database'
    ) THEN
        CREATE POLICY "Allow all operations on cve_database" ON cve_database FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 6. CREATE SCAN_CONFIGURATIONS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS scan_configurations (
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

-- Enable RLS for scan_configurations
ALTER TABLE scan_configurations ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'scan_configurations' 
        AND policyname = 'Allow all operations on scan_configurations'
    ) THEN
        CREATE POLICY "Allow all operations on scan_configurations" ON scan_configurations FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 7. UPDATE EXISTING TRIGGERS
-- ===============================================
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_vulnerabilities_updated_at ON vulnerabilities;
DROP TRIGGER IF EXISTS update_report_hosts_updated_at ON report_hosts;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;

-- Create the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate updated_at triggers for all tables
CREATE TRIGGER update_vulnerabilities_updated_at 
    BEFORE UPDATE ON vulnerabilities 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_hosts_updated_at 
    BEFORE UPDATE ON report_hosts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 8. CREATE AGGREGATION UPDATE FUNCTION
-- ===============================================
CREATE OR REPLACE FUNCTION update_report_aggregations()
RETURNS TRIGGER AS $$
BEGIN
    -- Update report counts when vulnerabilities change
    IF TG_OP = 'DELETE' THEN
        UPDATE reports SET
            total_vulnerabilities = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = OLD.report_id),
            critical_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = OLD.report_id AND severity = 'critical'),
            high_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = OLD.report_id AND severity = 'high'),
            medium_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = OLD.report_id AND severity = 'medium'),
            low_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = OLD.report_id AND severity = 'low'),
            info_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = OLD.report_id AND severity = 'info'),
            zero_day_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = OLD.report_id AND is_zero_day = TRUE),
            number_of_ips = (SELECT COUNT(DISTINCT ip_address) FROM vulnerabilities WHERE report_id = OLD.report_id)
        WHERE id = OLD.report_id;
        
        -- Update host counts for the deleted vulnerability
        IF OLD.host_id IS NOT NULL THEN
            UPDATE report_hosts SET
                critical_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = OLD.host_id AND severity = 'critical'),
                high_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = OLD.host_id AND severity = 'high'),
                medium_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = OLD.host_id AND severity = 'medium'),
                low_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = OLD.host_id AND severity = 'low'),
                info_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = OLD.host_id AND severity = 'info'),
                total_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = OLD.host_id),
                zero_day_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = OLD.host_id AND is_zero_day = TRUE)
            WHERE id = OLD.host_id;
        END IF;
        
        RETURN OLD;
    ELSE
        -- For INSERT and UPDATE operations
        UPDATE reports SET
            total_vulnerabilities = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = NEW.report_id),
            critical_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = NEW.report_id AND severity = 'critical'),
            high_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = NEW.report_id AND severity = 'high'),
            medium_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = NEW.report_id AND severity = 'medium'),
            low_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = NEW.report_id AND severity = 'low'),
            info_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = NEW.report_id AND severity = 'info'),
            zero_day_count = (SELECT COUNT(*) FROM vulnerabilities WHERE report_id = NEW.report_id AND is_zero_day = TRUE),
            number_of_ips = (SELECT COUNT(DISTINCT ip_address) FROM vulnerabilities WHERE report_id = NEW.report_id)
        WHERE id = NEW.report_id;
        
        -- Update host counts for the new/updated vulnerability
        IF NEW.host_id IS NOT NULL THEN
            UPDATE report_hosts SET
                critical_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = NEW.host_id AND severity = 'critical'),
                high_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = NEW.host_id AND severity = 'high'),
                medium_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = NEW.host_id AND severity = 'medium'),
                low_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = NEW.host_id AND severity = 'low'),
                info_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = NEW.host_id AND severity = 'info'),
                total_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = NEW.host_id),
                zero_day_count = (SELECT COUNT(*) FROM vulnerabilities WHERE host_id = NEW.host_id AND is_zero_day = TRUE)
            WHERE id = NEW.host_id;
        END IF;
        
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for aggregation updates
DROP TRIGGER IF EXISTS trigger_update_aggregations ON vulnerabilities;
CREATE TRIGGER trigger_update_aggregations
    AFTER INSERT OR UPDATE OR DELETE ON vulnerabilities
    FOR EACH ROW EXECUTE FUNCTION update_report_aggregations();

-- 9. CREATE ORGANIZATION UPDATE FUNCTION
-- ===============================================
CREATE OR REPLACE FUNCTION update_organization_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE organizations SET
            total_reports = (SELECT COUNT(*) FROM reports WHERE org_name = OLD.org_name),
            last_scan_date = (SELECT MAX(scan_end_date) FROM reports WHERE org_name = OLD.org_name)
        WHERE name = OLD.org_name;
        RETURN OLD;
    ELSE
        -- Insert the organization if it doesn't exist
        INSERT INTO organizations (name) 
        VALUES (NEW.org_name) 
        ON CONFLICT (name) DO NOTHING;
        
        -- Update organization stats
        UPDATE organizations SET
            total_reports = (SELECT COUNT(*) FROM reports WHERE org_name = NEW.org_name),
            last_scan_date = (SELECT MAX(scan_end_date) FROM reports WHERE org_name = NEW.org_name)
        WHERE name = NEW.org_name;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for organization updates
DROP TRIGGER IF EXISTS trigger_update_organization_stats ON reports;
CREATE TRIGGER trigger_update_organization_stats
    AFTER INSERT OR UPDATE OR DELETE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_organization_stats();

-- 10. ADD SOME REFERENCE DATA
-- ===============================================
-- Insert some common CVE reference data (examples)
INSERT INTO cve_database (cve_id, cvss_v3_score, severity, description, is_zero_day, exploitability) VALUES
('CVE-2025-22224', 9.8, 'critical', 'VMware ESXi 7.0 / 8.0 Multiple Vulnerabilities (VMSA-2025-0004)', true, 'Easy'),
('CVE-2025-22225', 9.8, 'critical', 'VMware ESXi 7.0 / 8.0 Multiple Vulnerabilities (VMSA-2025-0004)', true, 'Easy'),
('CVE-2025-22226', 9.8, 'critical', 'VMware ESXi 7.0 / 8.0 Multiple Vulnerabilities (VMSA-2025-0004)', true, 'Easy'),
('CVE-2013-3900', 5.0, 'medium', 'WinVerifyTrust Signature Validation CVE-2013-3900 Mitigation', false, 'Moderate')
ON CONFLICT (cve_id) DO NOTHING;

-- Migration completed successfully
SELECT 'Enhanced schema migration completed successfully!' as status;
