# Database Setup Instructions

This directory contains the SQL scripts needed to set up your Nessus vulnerability scanner database.

## Setup Order

Run these scripts in your Supabase SQL editor in the following order:

### 1. Initial Setup (`01_initial_setup.sql`)
- Creates the main `vulnerabilities` table
- Sets up indexes for performance
- Enables Row Level Security (RLS)
- Creates basic policies
- Adds sample data for testing

### 2. Reports Migration (`02_reports_migration.sql`)
- Creates the `reports` table for managing scan reports
- Adds `report_id` foreign key to vulnerabilities table
- Creates indexes and relationships
- Sets up triggers for automatic statistics updates
- Migrates existing data to the new structure

## Quick Setup

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `01_initial_setup.sql`
4. Click "Run" to execute
5. Copy and paste the contents of `02_reports_migration.sql`
6. Click "Run" to execute

Your database is now ready for the Nessus vulnerability scanner application!

## Schema Overview

- **vulnerabilities**: Stores individual vulnerability findings
- **reports**: Stores scan report metadata and statistics
- **Relationships**: Each vulnerability belongs to a report via `report_id`
