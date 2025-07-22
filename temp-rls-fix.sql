-- Temporary policy changes for development
-- Run this in Supabase SQL Editor to allow uploads without authentication

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON organizations;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON reports;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON report_hosts;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON vulnerabilities;

-- Create more permissive policies for development
CREATE POLICY "Allow all operations" ON organizations FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON reports FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON report_hosts FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON vulnerabilities FOR ALL USING (true);

-- Note: In production, you should implement proper authentication and authorization
-- This is just for development and testing purposes
