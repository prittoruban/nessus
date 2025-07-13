-- Migration script to add reports functionality
-- Run this in your Supabase SQL editor

-- Step 1: Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    total_vulnerabilities INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    info_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_date TIMESTAMP WITH TIME ZONE,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add report_id column to vulnerabilities table
ALTER TABLE vulnerabilities 
ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES reports(id) ON DELETE CASCADE;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_upload_date ON reports(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_report_id ON vulnerabilities(report_id);

-- Step 4: Enable RLS on reports table
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policy for reports (same as vulnerabilities for demo)
CREATE POLICY "Allow all operations for all users on reports" ON reports
    FOR ALL USING (true) WITH CHECK (true);

-- Step 6: Create function to update report statistics
CREATE OR REPLACE FUNCTION update_report_stats(report_uuid UUID)
RETURNS VOID AS $$
DECLARE
    total_count INTEGER;
    high_cnt INTEGER;
    medium_cnt INTEGER;
    low_cnt INTEGER;
    info_cnt INTEGER;
BEGIN
    -- Get total count
    SELECT COUNT(*) INTO total_count
    FROM vulnerabilities 
    WHERE report_id = report_uuid;
    
    -- Get severity counts
    SELECT 
        COUNT(CASE WHEN severity = 'high' THEN 1 END),
        COUNT(CASE WHEN severity = 'medium' THEN 1 END),
        COUNT(CASE WHEN severity = 'low' THEN 1 END),
        COUNT(CASE WHEN severity = 'info' THEN 1 END)
    INTO high_cnt, medium_cnt, low_cnt, info_cnt
    FROM vulnerabilities 
    WHERE report_id = report_uuid;
    
    -- Update report with statistics
    UPDATE reports 
    SET 
        total_vulnerabilities = total_count,
        high_count = high_cnt,
        medium_count = medium_cnt,
        low_count = low_cnt,
        info_count = info_cnt,
        processed_date = NOW(),
        updated_at = NOW()
    WHERE id = report_uuid;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to update report stats automatically
CREATE OR REPLACE FUNCTION trigger_update_report_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.report_id IS NOT NULL THEN
            PERFORM update_report_stats(NEW.report_id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.report_id IS NOT NULL THEN
            PERFORM update_report_stats(OLD.report_id);
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vulnerabilities_report_stats
    AFTER INSERT OR UPDATE OR DELETE ON vulnerabilities
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_report_stats();

-- Step 8: Create a default report for existing vulnerabilities (if any)
INSERT INTO reports (name, description, file_name, file_size, status)
SELECT 'Legacy Data', 'Migrated from old system', 'legacy_import.csv', 0, 'completed'
WHERE NOT EXISTS (SELECT 1 FROM reports WHERE name = 'Legacy Data');

-- Step 9: Link existing vulnerabilities to the legacy report
UPDATE vulnerabilities 
SET report_id = (SELECT id FROM reports WHERE name = 'Legacy Data' LIMIT 1)
WHERE report_id IS NULL;

-- Step 10: Update the legacy report statistics
SELECT update_report_stats((SELECT id FROM reports WHERE name = 'Legacy Data' LIMIT 1));
