-- Create the vulnerabilities table
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address TEXT NOT NULL,
    cve TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low', 'info')),
    plugin_name TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on ip_address for faster queries
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_ip_address ON vulnerabilities(ip_address);

-- Create an index on severity for filtering
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);

-- Create an index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_created_at ON vulnerabilities(created_at DESC);

-- Enable Row Level Security
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for all users (for demo purposes)
-- In production, you might want to restrict this based on user authentication
CREATE POLICY "Allow all operations for all users" ON vulnerabilities
    FOR ALL USING (true) WITH CHECK (true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_vulnerabilities_updated_at 
    BEFORE UPDATE ON vulnerabilities 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
INSERT INTO vulnerabilities (ip_address, cve, severity, plugin_name, description) VALUES
('192.168.1.1', 'CVE-2021-44228', 'high', 'Log4j Vulnerability', 'Apache Log4j remote code execution vulnerability'),
('192.168.1.2', 'CVE-2021-34527', 'high', 'PrintNightmare', 'Windows Print Spooler remote code execution vulnerability'),
('192.168.1.3', 'CVE-2021-26855', 'medium', 'Exchange Server Vulnerability', 'Microsoft Exchange Server remote code execution vulnerability'),
('192.168.1.4', 'CVE-2021-21972', 'low', 'VMware vCenter Vulnerability', 'VMware vCenter Server remote code execution vulnerability')
ON CONFLICT DO NOTHING; 